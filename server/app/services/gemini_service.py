"""Gemini-backed trip planning with grounded local fallbacks."""

from __future__ import annotations

import asyncio
import json
import logging
import math
import os
import random
import re
import time
from collections import deque
from collections.abc import Sequence
from datetime import date
from typing import Any, Literal, TypeVar

from pydantic import BaseModel

from app.schemas.ai import (
    ConceptResponse,
    ItineraryItemResponse,
    ItineraryPlanResponse,
    PlaceResponse,
    SmartSwapOption,
    SmartSwapRequest,
    SmartSwapResponse,
    TransitInfoResponse,
    TripConceptRequest,
    TripGenerationRequest,
    TripGenerationResponse,
)
from app.services.interests import INTEREST_DEFINITIONS, interest_score, legacy_preferences
from app.utils.transit_calculator import (
    cars_needed_for_group,
    estimate_ride_fares,
    estimate_road_distance_km,
)

logger = logging.getLogger(__name__)
ModelT = TypeVar("ModelT", bound=BaseModel)
ResponseSource = Literal["gemini", "fallback"]

SYSTEM_INSTRUCTION = """You are HCMC Travel Expert, a professional and warm local travel planner
specializing in Ho Chi Minh City, Vietnam. Give realistic, concise recommendations.
Use only the supplied place catalog. Never invent a place, address, coordinate,
photo, opening hour, rating, or price. Cluster stops by district, respect the
traveler's total group budget, preferences, pace, and special notes. Plan in the
Asia/Ho_Chi_Minh time zone around realistic local meal times and travel durations.
"""

_PLACE_FIELDS = {
    "place_id",
    "place_name",
    "category",
    "description",
    "address",
    "district",
    "latitude",
    "longitude",
    "estimated_cost",
    "photo_url",
    "editorial_score",
    "is_indoor",
    "opening_hours",
    "suggested_duration",
}
_TIME_SLOTS = (
    ("08:30", "10:00"),
    ("10:15", "11:30"),
    ("12:00", "13:30"),
    ("14:00", "15:30"),
    ("16:00", "17:30"),
    ("18:00", "20:00"),
)
_PREFERENCE_CATEGORIES = {
    "food": "food",
    "culture": "sightseeing",
    "cafe": "cafe",
    "shopping": "shopping",
    "nature": "nature",
    "nightlife": "entertainment",
}
_RETRYABLE_STATUS_CODES = {408, 500, 502, 503, 504}
_DEFAULT_TIMEOUT_SECONDS = 25.0
_MAX_TOTAL_TIMEOUT_SECONDS = 39.5
_CONCEPT_SHORTLIST_LIMIT = 80
_MAX_PROMPT_CHARS = 30_000
_SIGHTSEEING_CATEGORIES = {"sightseeing", "culture", "attraction", "nature", "park"}
_CATALOG_HEADER = (
    "place_id|place_name|category|district|estimated_cost|"
    "is_indoor|opening_hours|editorial_score|lat|lng"
)
_RETRYABLE_ERROR_NAMES = {
    "ConnectError",
    "ConnectTimeout",
    "DeadlineExceeded",
    "InternalServerError",
    "PoolTimeout",
    "ReadTimeout",
    "ServerError",
    "ServiceUnavailable",
    "TimeoutException",
    "WriteTimeout",
}
_MODE_SPEED_KMH: dict[str, float] = {
    "walk": 5.0,
    "grab_bike": 20.0,
    "grab_car": 25.0,
    "public": 15.0,
}
_WEEKDAYS_VI = (
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
    "Chủ Nhật",
)
_HHMM_RE = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")
_OPENING_RANGE_RE = re.compile(
    r"(\d{1,2}):(\d{2})(?::\d{2})?\s*[-–—]\s*(\d{1,2}):(\d{2})(?::\d{2})?"
)


def _normalize_district(district: str) -> str:
    normalized = district.strip()
    if normalized.casefold().startswith("tp. "):
        normalized = normalized[4:].strip()
    return normalized.casefold()


def _parse_hhmm(value: str | None) -> int | None:
    if not value:
        return None
    match = _HHMM_RE.fullmatch(value.strip())
    if match is None:
        return None
    return int(match.group(1)) * 60 + int(match.group(2))


def _parse_opening_intervals(opening_hours: Sequence[str]) -> list[tuple[int, int]]:
    intervals: list[tuple[int, int]] = []
    for entry in opening_hours:
        if not isinstance(entry, str):
            continue
        for match in _OPENING_RANGE_RE.finditer(entry):
            h1, m1, h2, m2 = (int(group) for group in match.groups())
            valid_start = 0 <= h1 <= 23 and 0 <= m1 <= 59
            valid_end = (0 <= h2 <= 23 and 0 <= m2 <= 59) or (h2 == 24 and m2 == 0)
            if not (valid_start and valid_end):
                continue
            open_min = h1 * 60 + m1
            close_min = h2 * 60 + m2
            if open_min == close_min:
                intervals.append((0, 24 * 60))
            elif open_min < close_min:
                intervals.append((open_min, close_min))
            else:
                intervals.append((open_min, 24 * 60))
                intervals.append((0, close_min))
    return intervals


def _is_open_during_window(
    place: PlaceResponse,
    window_start: int | None,
    window_end: int | None,
) -> bool:
    if window_start is None and window_end is None:
        return True
    intervals = _parse_opening_intervals(place.opening_hours)
    if not intervals:
        return True
    start = 0 if window_start is None else window_start
    end = 24 * 60 if window_end is None else window_end
    return any(start < close_min and open_min < end for open_min, close_min in intervals)


def _format_hhmm(total_minutes: int) -> str:
    clamped = max(0, min(23 * 60 + 59, total_minutes))
    hours, minutes = divmod(clamped, 60)
    return f"{hours:02d}:{minutes:02d}"


def _build_day_time_slots(
    places_per_day: int,
    day_start: str | None,
    day_end: str | None,
) -> list[tuple[str, str]]:
    """Build evenly spaced schedule slots inside [day_start, day_end] or default slots."""
    if day_start is None and day_end is None:
        return list(_TIME_SLOTS[:places_per_day])

    start_min = _parse_hhmm(day_start)
    end_min = _parse_hhmm(day_end)
    if start_min is None and end_min is None:
        return list(_TIME_SLOTS[:places_per_day])
    if start_min is None:
        start_min = 8 * 60 + 30
    if end_min is None:
        end_min = 22 * 60
    if end_min <= start_min:
        end_min = min(23 * 60 + 59, start_min + max(240, places_per_day * 60))

    span = end_min - start_min
    gap = 15 if span >= places_per_day * 45 + max(0, places_per_day - 1) * 15 else 10
    total_gaps = max(0, places_per_day - 1) * gap
    usable = max(places_per_day * 30, span - total_gaps)
    per_stop = min(120, usable // places_per_day)

    slots: list[tuple[str, str]] = []
    cursor = start_min
    for _ in range(places_per_day):
        slot_end = min(23 * 60 + 59, cursor + per_stop)
        slots.append((_format_hhmm(cursor), _format_hhmm(slot_end)))
        cursor = slot_end + gap
    return slots


def _resolve_day_window(
    request: TripConceptRequest,
    day_number: int,
) -> tuple[str | None, str | None]:
    for entry in getattr(request, "day_schedules", None) or []:
        if entry.day_number == day_number:
            return entry.day_start, entry.day_end
    return getattr(request, "day_start", None), getattr(request, "day_end", None)


class GeminiServiceError(RuntimeError):
    """Raised when Gemini and the local fallback cannot produce a valid result."""


def _model_dict(value: BaseModel, *, exclude: set[str] | None = None) -> dict[str, Any]:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", exclude=exclude)
    return value.dict(exclude=exclude)


def _model_schema(model_type: type[ModelT]) -> dict[str, Any]:
    if hasattr(model_type, "model_json_schema"):
        return model_type.model_json_schema()
    return model_type.schema()


def _validate_json(model_type: type[ModelT], value: str) -> ModelT:
    if hasattr(model_type, "model_validate_json"):
        return model_type.model_validate_json(value)
    return model_type.parse_raw(value)


def _validate_object(model_type: type[ModelT], value: Any) -> ModelT:
    if isinstance(value, model_type):
        return value
    if hasattr(model_type, "model_validate"):
        return model_type.model_validate(value)
    return model_type.parse_obj(value)


def _clean_catalog_cell(value: str) -> str:
    return " ".join(value.replace("|", "/").split())


def _compact_opening_hours(opening_hours: Sequence[str]) -> str:
    if not opening_hours:
        return "-"
    parts = [
        _clean_catalog_cell(entry).replace(" - ", "-")
        for entry in opening_hours
        if isinstance(entry, str) and entry.strip()
    ]
    joined = ";".join(parts)
    return joined[:40] if joined else "-"


def _format_catalog_row(place: PlaceResponse) -> str:
    return (
        f"{_clean_catalog_cell(place.place_id)}|{_clean_catalog_cell(place.place_name)}|"
        f"{_clean_catalog_cell(place.category)}|{_clean_catalog_cell(place.district)}|"
        f"{place.estimated_cost}|{str(place.is_indoor).lower()}|"
        f"{_compact_opening_hours(place.opening_hours)}|{place.editorial_score:.1f}|"
        f"{place.latitude:.3f}|{place.longitude:.3f}"
    )


def _shortlist_places(
    request: TripConceptRequest,
    places: Sequence[PlaceResponse],
    *,
    limit: int,
) -> list[PlaceResponse]:
    """Keep required stops, then rank eligible places within the narrowest viable area."""
    needed = request.days * request.places_per_day
    unique_places = {place.place_id: place for place in places}
    pool = GeminiService._apply_constraints(list(unique_places.values()), request, min_count=needed)
    must_rank = {pid: i for i, pid in enumerate(request.must_visit_ids) if pid in unique_places}
    requested = {_normalize_district(d) for d in request.districts}
    approved = (
        {_normalize_district(d) for d in request.approved_concept.recommended_districts}
        if isinstance(request, TripGenerationRequest)
        else set()
    )
    if approved:
        # Widen only when the current districts cannot supply the requested number of stops.
        for districts in (approved, approved | requested):
            candidates = [
                p
                for p in pool
                if _normalize_district(p.district) in districts or p.place_id in must_rank
            ]
            if len(candidates) >= needed:
                pool = candidates
                break

    preferences = {
        pref.strip().casefold()
        for pref in request.preferences or legacy_preferences(request.interests)
    }
    categories = {_PREFERENCE_CATEGORIES.get(pref, pref) for pref in preferences}

    def rank(place: PlaceResponse) -> tuple:
        district = _normalize_district(place.district)
        matches = place.category.casefold() in categories or any(
            tag.strip().casefold() in preferences for tag in place.tags
        )
        return (
            must_rank.get(place.place_id, len(request.must_visit_ids)),
            bool(approved) and district not in approved,
            district not in requested and district not in approved,
            request.prefer_indoor and not place.is_indoor,
            -interest_score(place, request.interests) if request.interests else 0.0,
            not matches,
            -place.editorial_score,
            place.estimated_cost,
            place.place_name,
            place.place_id,
        )

    ranked = sorted(pool, key=rank)
    limit = max(limit, len(must_rank))
    if len(ranked) <= limit:
        return ranked

    # Reserve a meal, a visit and a café option per day before filling by rank.
    selected = set(must_rank)
    for group in ({"food"}, _SIGHTSEEING_CATEGORIES, {"cafe"}):
        count = sum(unique_places[pid].category in group for pid in selected)
        for place in ranked:
            if count >= request.days or len(selected) >= limit:
                break
            if place.category in group and place.place_id not in selected:
                selected.add(place.place_id)
                count += 1

    for place in ranked:
        if len(selected) >= limit:
            break
        selected.add(place.place_id)
    return [place for place in ranked if place.place_id in selected]


def _resolve_timeout_seconds(timeout_seconds: float | None) -> float:
    if timeout_seconds is not None:
        value = float(timeout_seconds)
    else:
        raw = os.getenv("GEMINI_TIMEOUT_SECONDS", "").strip()
        if not raw:
            value = _DEFAULT_TIMEOUT_SECONDS
        else:
            try:
                value = float(raw)
            except ValueError:
                logger.warning(
                    "Invalid GEMINI_TIMEOUT_SECONDS=%r; falling back to %.0fs.",
                    raw,
                    _DEFAULT_TIMEOUT_SECONDS,
                )
                value = _DEFAULT_TIMEOUT_SECONDS
    if not math.isfinite(value) or value <= 0:
        raise ValueError("timeout_seconds must be positive.")
    return value


class GeminiService:
    """Generate concepts, itineraries, and swap options from grounded places.

    Keep one instance in the application so its concurrency and per-minute
    request limits apply across requests. API keys are passed in by the caller;
    this service does not read or log secrets itself.
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        client: Any | None = None,
        model: str = "gemini-3.5-flash",
        timeout_seconds: float | None = None,
        max_total_seconds: float = _MAX_TOTAL_TIMEOUT_SECONDS,
        max_attempts: int = 3,
        retry_base_seconds: float = 0.75,
        requests_per_minute: int = 15,
        max_concurrent_requests: int = 2,
    ) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be at least 1.")
        if requests_per_minute < 1 or max_concurrent_requests < 1:
            raise ValueError("Rate and concurrency limits must be positive.")
        if not math.isfinite(max_total_seconds) or max_total_seconds <= 0:
            raise ValueError("max_total_seconds must be positive.")

        self.timeout_seconds = _resolve_timeout_seconds(timeout_seconds)
        self.max_total_seconds = min(max_total_seconds, _MAX_TOTAL_TIMEOUT_SECONDS)
        self._use_async_sdk = client is None and bool(api_key)
        if self._use_async_sdk:
            try:
                from google import genai
            except ImportError as error:
                raise RuntimeError(
                    "The Google Gen AI SDK is missing. Install the project's "
                    "google-genai dependency before creating GeminiService."
                ) from error
            client = genai.Client(api_key=api_key, http_options={"retry_options": {"attempts": 1}})

        self._client = client
        self.model = model
        self.max_attempts = max_attempts
        self.retry_base_seconds = retry_base_seconds
        self.requests_per_minute = requests_per_minute
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)
        self._request_times: deque[float] = deque()
        self._quota_open_until = 0.0
        self._rate_lock = asyncio.Lock()
        if client is None and not api_key:
            logger.warning(
                "GEMINI_API_KEY is not configured; AI requests will use local fallback responses."
            )

    async def suggest_concept(
        self,
        request: TripConceptRequest,
        available_places: Sequence[PlaceResponse],
    ) -> ConceptResponse:
        started_at = time.perf_counter()
        places, prompt = self._planning_prompt(
            "Suggest a trip concept before the traveler approves a detailed plan.",
            request,
            available_places,
            _CONCEPT_SHORTLIST_LIMIT,
            "Return a concept summary, a few highlights, recommended districts, "
            "a high-level route flow, and a concise confirmation question. Do not "
            "write a timed day-by-day itinerary yet.",
        )
        generated = await self._generate(prompt, ConceptResponse)
        source: ResponseSource = "gemini" if generated is not None else "fallback"
        try:
            result = self._ground_concept(
                generated or self._fallback_concept(request, places), request, places
            )
        except ValueError as error:
            logger.error(
                "Gemini concept could not be grounded (%s); using local fallback.",
                type(error).__name__,
            )
            result = self._fallback_concept(request, places)
            source = "fallback"
        self._log_step_metrics("concept", len(places), len(prompt), started_at, source)
        return self._with_source(result, source)

    async def generate_itinerary(
        self,
        request: TripGenerationRequest,
        available_places: Sequence[PlaceResponse],
    ) -> TripGenerationResponse:
        started_at = time.perf_counter()
        needed_stops = request.days * request.places_per_day
        places, prompt = self._planning_prompt(
            "Create the detailed trip after the traveler approved the concept.",
            request,
            available_places,
            max(40, needed_stops * 4),
            "Create exactly the requested number of days and stops per day. Use "
            "only place_id values from the supplied catalog. Group nearby stops, "
            "follow the selected pace and treat special notes as constraints. "
            "Avoid repeating a place, cluster each day in as few districts as "
            "possible, fit meals near local meal times, and keep estimated spend "
            "within the total group budget when possible. Return only place_id and "
            "schedule fields (day_number, order_index, start_time, end_time, is_lunch).",
        )
        generated = await self._generate(prompt, ItineraryPlanResponse)
        source: ResponseSource = "gemini" if generated is not None else "fallback"
        try:
            result = self._ground_itinerary(
                generated or self._fallback_itinerary(request, places), request, places
            )
        except ValueError as error:
            logger.warning(
                "Using local itinerary fallback after invalid AI output (%s).", type(error).__name__
            )
            result = self._fallback_itinerary(request, places)
            source = "fallback"
        result.itinerary_items = self._fill_transit_info(
            result.itinerary_items,
            request.transport_mode,
            member_count=request.member_count,
        )
        self._log_step_metrics("generate", len(places), len(prompt), started_at, source)
        return self._with_source(result, source)

    async def suggest_swaps(
        self,
        request: SmartSwapRequest,
        available_places: Sequence[PlaceResponse],
    ) -> SmartSwapResponse:
        started_at = time.perf_counter()
        places = self._require_places(available_places)
        prompt = self._prompt(
            "Suggest Smart Swap options for one itinerary stop.",
            request,
            places,
            "Return two or three alternatives. Prefer the same district, category, "
            "and a similar estimated cost. Briefly explain why each alternative "
            "fits the requested change. Do not return the current place.",
        )
        generated = await self._generate(prompt, SmartSwapResponse)
        source: ResponseSource = "gemini" if generated is not None else "fallback"
        try:
            result = self._ground_swaps(
                generated or self._fallback_swaps(request, places), request, places
            )
        except ValueError as error:
            logger.warning(
                "Using local Smart Swap fallback after invalid AI output (%s).",
                type(error).__name__,
            )
            result = self._fallback_swaps(request, places)
            source = "fallback"
        self._log_step_metrics("swap", len(places), len(prompt), started_at, source)
        return self._with_source(result, source)

    @staticmethod
    def _log_step_metrics(
        step: str,
        place_count: int,
        prompt_chars: int,
        started_at: float,
        source: ResponseSource,
    ) -> None:
        elapsed_ms = round((time.perf_counter() - started_at) * 1000)
        logger.info(
            "AI step=%s places=%d prompt_chars=%d elapsed_ms=%d source=%s",
            step,
            place_count,
            prompt_chars,
            elapsed_ms,
            source,
        )

    async def _generate(
        self,
        prompt: str,
        response_model: type[ModelT],
    ) -> ModelT | None:
        if self._client is None or self._quota_circuit_open():
            return None

        loop = asyncio.get_running_loop()
        deadline = loop.time() + self.max_total_seconds
        config = {
            "temperature": 0.4,
            "response_mime_type": "application/json",
            "response_json_schema": _model_schema(response_model),
        }
        attempt_limit = self.max_attempts
        try:
            # The outer deadline includes queueing, rate limiting, retries and backoff.
            async with asyncio.timeout_at(deadline):
                for attempt in range(1, self.max_attempts + 1):
                    try:
                        async with self._semaphore:
                            if not await self._wait_for_rate_slot():
                                return None
                            timeout = min(self.timeout_seconds, deadline - loop.time())
                            if timeout <= 0:
                                return None
                            if self._use_async_sdk:
                                call = self._client.aio.models.generate_content(
                                    model=self.model,
                                    contents=prompt,
                                    config={
                                        **config,
                                        "http_options": {
                                            "timeout": max(1, int(timeout * 1000)),
                                            "retry_options": {"attempts": 1},
                                        },
                                    },
                                )
                            else:
                                call = asyncio.to_thread(
                                    self._client.models.generate_content,
                                    model=self.model,
                                    contents=prompt,
                                    config=config,
                                )
                            response = await asyncio.wait_for(call, timeout)
                        if not response.text:
                            raise ValueError("Gemini returned an empty structured response.")
                        return _validate_json(response_model, response.text)
                    except Exception as error:
                        rate_limited = self._error_status_code(error) == 429 or (
                            type(error).__name__ in {"ResourceExhausted", "TooManyRequests"}
                        )
                        if rate_limited:
                            message = str(error).casefold()
                            if "quota" in message or "perday" in message:
                                self._quota_open_until = time.monotonic() + 60.0
                                logger.warning(
                                    "Gemini quota exhausted (%s); using local fallback.",
                                    self._safe_error_message(error),
                                )
                                return None
                            attempt_limit = min(attempt_limit, 2)
                        if attempt >= attempt_limit or not (
                            rate_limited or self._is_retryable(error)
                        ):
                            raise
                        delay = (
                            self.retry_base_seconds * 2 ** (attempt - 1) * random.uniform(0.8, 1.2)
                        )
                        if rate_limited:
                            delay = min(delay, 2.0)
                        elif self._is_timeout_error(error):
                            delay = min(delay, 0.2, self.timeout_seconds * 0.2)
                        logger.warning(
                            "Gemini transient error (%s), retrying %d/%d.",
                            type(error).__name__,
                            attempt,
                            attempt_limit - 1,
                        )
                        await asyncio.sleep(delay)
        except Exception as error:
            # Provider errors may echo user data or credentials.
            logger.warning(
                "Gemini request failed (%s); using local fallback.",
                self._safe_error_message(error),
            )
        return None

    @staticmethod
    def _error_status_code(error: Exception) -> int | None:
        status = getattr(error, "code", None) or getattr(error, "status_code", None)
        response = getattr(error, "response", None)
        status = status or getattr(response, "status_code", None)
        return status if isinstance(status, int) else None

    @staticmethod
    def _with_source(result: ModelT, source: ResponseSource) -> ModelT:
        if hasattr(result, "model_copy"):
            return result.model_copy(update={"source": source})
        return result.copy(update={"source": source})

    @classmethod
    def _safe_error_message(cls, error: Exception) -> str:
        # Provider text can contain credentials, so only log diagnostic metadata.
        return f"{type(error).__name__}, status={cls._error_status_code(error) or 'unknown'}"

    def _quota_circuit_open(self) -> bool:
        if time.monotonic() < self._quota_open_until:
            logger.info("Gemini quota circuit open; using local fallback.")
            return True
        return False

    async def _wait_for_rate_slot(self) -> bool:
        window_seconds = 60.0
        while True:
            async with self._rate_lock:
                if self._quota_circuit_open():
                    return False
                now = time.monotonic()
                while self._request_times and now - self._request_times[0] >= window_seconds:
                    self._request_times.popleft()
                if len(self._request_times) < self.requests_per_minute:
                    self._request_times.append(now)
                    return True
                wait_seconds = window_seconds - (now - self._request_times[0])
            await asyncio.sleep(max(wait_seconds, 0.01))

    @staticmethod
    def _is_timeout_error(error: Exception) -> bool:
        if isinstance(error, (TimeoutError, asyncio.TimeoutError)):
            return True
        name = error.__class__.__name__
        return name == "DeadlineExceeded" or "timeout" in name.lower()

    @classmethod
    def _is_retryable(cls, error: Exception) -> bool:
        if cls._error_status_code(error) in _RETRYABLE_STATUS_CODES:
            return True
        if cls._is_timeout_error(error):
            return True
        if isinstance(error, (ConnectionError, OSError)):
            return True
        return error.__class__.__name__ in _RETRYABLE_ERROR_NAMES

    @staticmethod
    def _require_places(places: Sequence[PlaceResponse]) -> list[PlaceResponse]:
        normalized = [_validate_object(PlaceResponse, place) for place in places]
        if not normalized:
            raise GeminiServiceError("No verified places were provided to the AI service.")
        return normalized

    @staticmethod
    def _apply_constraints(
        places: Sequence[PlaceResponse],
        request: TripConceptRequest,
        min_count: int = 0,
    ) -> list[PlaceResponse]:
        base_places = list(places)
        catalog_ids = {place.place_id for place in base_places}

        raw_must_visit_ids = list(dict.fromkeys(getattr(request, "must_visit_ids", None) or []))
        must_visit_set: set[str] = set()
        for place_id in raw_must_visit_ids:
            if place_id in catalog_ids:
                must_visit_set.add(place_id)
            else:
                logger.debug("Ignoring unknown must_visit_id %r not in place catalog.", place_id)

        avoid_districts = getattr(request, "avoid_districts", None) or []
        normalized_avoid = {
            _normalize_district(d) for d in avoid_districts if d and d.strip()
        }

        window_start = _parse_hhmm(getattr(request, "day_start", None))
        window_end = _parse_hhmm(getattr(request, "day_end", None))
        day_schedules = getattr(request, "day_schedules", None) or []
        if window_start is None and window_end is None and len(day_schedules) >= request.days:
            starts = [m for m in (_parse_hhmm(w.day_start) for w in day_schedules) if m is not None]
            ends = [m for m in (_parse_hhmm(w.day_end) for w in day_schedules) if m is not None]
            if starts and ends:
                window_start = min(starts)
                window_end = max(ends)
        has_time_window = window_start is not None or window_end is not None

        filtered = [
            place
            for place in base_places
            if place.place_id in must_visit_set
            or (
                _normalize_district(place.district) not in normalized_avoid
                and (
                    not has_time_window
                    or _is_open_during_window(place, window_start, window_end)
                )
            )
        ]

        if len(filtered) < min_count and has_time_window:
            filtered = [
                place
                for place in base_places
                if place.place_id in must_visit_set
                or _normalize_district(place.district) not in normalized_avoid
            ]
        if len(filtered) < min_count:
            filtered = base_places

        if getattr(request, "prefer_indoor", False):
            filtered = sorted(filtered, key=lambda place: not place.is_indoor)

        return filtered

    @classmethod
    def _planning_prompt(
        cls,
        task: str,
        request: TripConceptRequest,
        available_places: Sequence[PlaceResponse],
        limit: int,
        instructions: str,
    ) -> tuple[list[PlaceResponse], str]:
        catalog = cls._require_places(available_places)
        minimum = max(
            len(request.must_visit_ids), min(limit, request.days * request.places_per_day)
        )
        while True:
            places = _shortlist_places(request, catalog, limit=limit)
            prompt = cls._prompt(task, request, places, instructions)
            if len(prompt) <= _MAX_PROMPT_CHARS or len(places) <= minimum:
                return places, prompt
            # Long, multi-district trips can reach the character budget before the row limit.
            limit = max(minimum, len(places) * _MAX_PROMPT_CHARS // len(prompt))

    @staticmethod
    def _prompt(
        task: str,
        request: BaseModel,
        places: Sequence[PlaceResponse],
        instructions: str,
    ) -> str:
        if isinstance(request, SmartSwapRequest):
            # SmartSwapResponse still requires the complete place fields for every alternative.
            catalog = json.dumps([_model_dict(p) for p in places], ensure_ascii=False)
            catalog_block = f"VERIFIED PLACE CATALOG:\n{catalog}"
        else:
            catalog = "\n".join([_CATALOG_HEADER, *(_format_catalog_row(p) for p in places)])
            catalog_block = f"VERIFIED PLACE CATALOG (pipe-separated):\n{catalog}"
        catalog_by_id = {place.place_id: place for place in places}
        example = GeminiService._few_shot_example(places)
        request_data = _model_dict(request, exclude={"interests", "vibe_energy", "vibe_spend"})

        valid_must_visits = [
            catalog_by_id[pid]
            for pid in dict.fromkeys(getattr(request, "must_visit_ids", None) or [])
            if pid in catalog_by_id
        ]
        if "must_visit_ids" in request_data:
            request_data["must_visit_ids"] = [place.place_id for place in valid_must_visits]

        constraints: list[str] = []
        if isinstance(request, TripConceptRequest):
            details = []
            if request.interests:
                labels = [
                    INTEREST_DEFINITIONS[k]["label"] for k in dict.fromkeys(request.interests)
                ]
                details.append("Sở thích: " + ", ".join(labels))
            for value, bands in (
                (request.vibe_energy, ("nhịp thong thả", "cân bằng", "khám phá nhiều")),
                (request.vibe_spend, ("ưu tiên bình dân", "tầm trung", "chịu chi, nơi đẹp/sang")),
            ):
                if value is not None:
                    details.append(bands[0] if value < 34 else bands[1] if value < 67 else bands[2])
            if details:
                constraints.append(". ".join(details) + ".")
        dietary = getattr(request, "dietary", None) or []
        avoid_districts = getattr(request, "avoid_districts", None) or []
        if dietary:
            constraints.append(
                "DIETARY REQUIREMENTS (strictly respect for food and cafe stops): "
                + ", ".join(str(item) for item in dietary)
            )
        if avoid_districts:
            constraints.append(
                "DISTRICTS TO AVOID (do not recommend or schedule stops here): "
                + ", ".join(str(item) for item in avoid_districts)
            )

        travel_date = getattr(request, "travel_date", None)
        if isinstance(travel_date, date):
            weekday_vi = _WEEKDAYS_VI[travel_date.weekday()]
            constraints.append(f"Ngày đi: {travel_date.isoformat()} ({weekday_vi})")

        day_start = getattr(request, "day_start", None)
        day_end = getattr(request, "day_end", None)
        valid_start = day_start if _parse_hhmm(day_start) is not None else None
        valid_end = day_end if _parse_hhmm(day_end) is not None else None
        day_schedules = sorted(
            getattr(request, "day_schedules", None) or [],
            key=lambda w: w.day_number,
        )
        if day_schedules:
            by_day = {w.day_number: f"{w.day_start} - {w.day_end}" for w in day_schedules}
            default_label = (
                f"{valid_start} - {valid_end}"
                if valid_start and valid_end
                else "linh hoạt (08:30 - 20:00)"
            )
            per_day_parts = [
                f"Ngày {d}: {by_day.get(d, default_label)}"
                for d in range(1, request.days + 1)
            ]
            constraints.append(
                "Khung giờ theo từng ngày: "
                + "; ".join(per_day_parts)
                + " (xếp từng ngày đúng khung giờ riêng, không ép các ngày giống nhau)"
            )
        elif valid_start and valid_end:
            constraints.append(
                f"Khung giờ mỗi ngày: {valid_start} - {valid_end} "
                "(xếp các điểm trong khung giờ này)"
            )
        elif valid_start:
            constraints.append(f"Khung giờ mỗi ngày: bắt đầu từ {valid_start}")
        elif valid_end:
            constraints.append(f"Khung giờ mỗi ngày: kết thúc trước {valid_end}")

        if getattr(request, "has_children", False):
            constraints.append(
                "Có trẻ nhỏ: chọn ít điểm hơn, nhịp nhẹ nhàng và có chỗ nghỉ ngơi phù hợp"
            )

        has_elderly = bool(getattr(request, "has_elderly", False))
        mobility_limited = getattr(request, "mobility", "normal") == "limited"
        if has_elderly and mobility_limited:
            constraints.append(
                "Có người lớn tuổi và hạn chế đi bộ: hạn chế đi bộ xa, ưu tiên các điểm gần nhau"
            )
        elif has_elderly:
            constraints.append("Có người lớn tuổi: hạn chế đi bộ xa, ưu tiên các điểm gần nhau")
        elif mobility_limited:
            constraints.append(
                "Hạn chế đi bộ (mobility=limited): hạn chế đi bộ xa, ưu tiên các điểm gần nhau"
            )

        if getattr(request, "prefer_indoor", False):
            constraints.append("Ưu tiên địa điểm trong nhà (is_indoor=true) khi sắp lịch")

        if valid_must_visits:
            formatted = ", ".join(
                f"{place.place_name} ({place.place_id})" for place in valid_must_visits
            )
            constraints.append(f"BẮT BUỘC đưa vào lịch: {formatted}")

        constraints_block = (
            "ADDITIONAL CONSTRAINTS:\n" + "\n".join(f"- {line}" for line in constraints) + "\n\n"
            if constraints
            else ""
        )
        request_json = json.dumps(request_data, ensure_ascii=False, separators=(",", ":"))
        return (
            f"{SYSTEM_INSTRUCTION}\nTASK: {task}\n\n"
            f"FEW-SHOT EXAMPLE (format only):\n{example}\n\n"
            f"TRAVELER REQUEST:\n{request_json}\n\n"
            f"{constraints_block}"
            f"{catalog_block}\n\n"
            f"TASK RULES:\n{instructions}"
        )

    @staticmethod
    def _few_shot_example(places: Sequence[PlaceResponse]) -> str:
        by_district: dict[str, list[PlaceResponse]] = {}
        for place in places:
            by_district.setdefault(place.district, []).append(place)
        for district, district_places in by_district.items():
            food = next((place for place in district_places if place.category == "food"), None)
            other = [place for place in district_places if place.category != "food"]
            if food and len(other) >= 2:
                return (
                    f"{district}: 08:30 {other[0].place_id} -> 12:00 {food.place_id} (lunch) -> "
                    f"14:00 {other[1].place_id}."
                )
        return "Cluster same district: morning sight -> noon food -> afternoon sight/cafe."

    @staticmethod
    def _fallback_concept(
        request: TripConceptRequest,
        places: Sequence[PlaceResponse],
    ) -> ConceptResponse:
        available_by_norm = {
            _normalize_district(place.district): place.district for place in places
        }
        available_districts = list(dict.fromkeys(place.district for place in places))
        catalog_by_id = {place.place_id: place for place in places}
        must_visit_places = [
            catalog_by_id[pid]
            for pid in dict.fromkeys(request.must_visit_ids)
            if pid in catalog_by_id
        ]
        must_visit_districts = list(dict.fromkeys(place.district for place in must_visit_places))
        requested_districts = list(
            dict.fromkeys(
                available_by_norm[_normalize_district(district)]
                for district in request.districts
                if _normalize_district(district) in available_by_norm
            )
        )
        districts = list(
            dict.fromkeys([*must_visit_districts, *requested_districts, *available_districts])
        )
        district_limit = max(min(request.days, 3), len(must_visit_districts))
        districts = districts[:district_limit]
        other_highlights = [place.place_name for place in places if place.district in districts]
        highlights = list(
            dict.fromkeys([*(place.place_name for place in must_visit_places), *other_highlights])
        )[: max(3, len(must_visit_places))]
        route = " → ".join(districts)
        return ConceptResponse(
            summary=(
                f"Gợi ý chuyến đi {request.days} ngày tại TP.HCM, ưu tiên "
                f"{', '.join(request.preferences) or 'khám phá địa phương'} "
                f"với nhịp độ {request.pace}, trong ngân sách nhóm {request.budget:,} VND."
            ),
            highlights=highlights,
            recommended_districts=districts,
            route_overview=route or "Khám phá các điểm phù hợp trong TP.HCM.",
            confirmation_question="Bạn có đồng ý với concept này không?",
        )

    @classmethod
    def _fallback_itinerary(
        cls,
        request: TripGenerationRequest,
        places: Sequence[PlaceResponse],
    ) -> TripGenerationResponse:
        districts = {
            _normalize_district(d) for d in request.approved_concept.recommended_districts
        }
        preferred_categories = {
            _PREFERENCE_CATEGORIES.get(preference, preference)
            for preference in request.preferences
        }
        must_visit_rank = {
            pid: idx for idx, pid in enumerate(dict.fromkeys(request.must_visit_ids))
        }
        ordered_places = sorted(
            places,
            key=lambda place: (
                place.place_id not in must_visit_rank,
                must_visit_rank.get(place.place_id, 0),
                (not place.is_indoor) if request.prefer_indoor else False,
                _normalize_district(place.district) not in districts,
                place.category not in preferred_categories,
                place.estimated_cost,
            ),
        )
        total_slots = request.days * request.places_per_day
        selected: list[PlaceResponse] = []
        used_place_ids: set[str] = set()
        for _day in range(request.days):
            day_places: list[PlaceResponse] = []
            for order_index in range(1, request.places_per_day + 1):
                candidates = [
                    place for place in ordered_places if place.place_id not in used_place_ids
                ]
                remaining_slots_after = total_slots - len(selected) - len(day_places) - 1
                remaining_must_visits = [
                    place for place in candidates if place.place_id in must_visit_rank
                ]
                if order_index == 3:
                    must_visit_food = next(
                        (place for place in remaining_must_visits if place.category == "food"),
                        None,
                    )
                    if must_visit_food is not None:
                        place = must_visit_food
                    elif len(remaining_must_visits) > remaining_slots_after:
                        place = remaining_must_visits[0]
                    else:
                        food = next(
                            (place for place in candidates if place.category == "food"), None
                        )
                        place = food or (candidates[0] if candidates else None)
                else:
                    place = candidates[0] if candidates else None
                if place is None:
                    raise GeminiServiceError(
                        "The verified catalog has too few unique places for this itinerary."
                    )
                used_place_ids.add(place.place_id)
                day_places.append(place)
            selected.extend(day_places)

        slots_by_day = {
            day: _build_day_time_slots(
                request.places_per_day, *_resolve_day_window(request, day)
            )
            for day in range(1, request.days + 1)
        }
        items: list[ItineraryItemResponse] = []
        for index, place in enumerate(selected):
            day_number = index // request.places_per_day + 1
            order_index = index % request.places_per_day + 1
            start_time, end_time = slots_by_day[day_number][order_index - 1]
            start_min = _parse_hhmm(start_time) or 0
            items.append(
                ItineraryItemResponse(
                    **_model_dict(place),
                    day_number=day_number,
                    order_index=order_index,
                    time_slot=f"{start_time} - {end_time}",
                    start_time=start_time,
                    end_time=end_time,
                    is_lunch=place.category == "food" and order_index == 3 and start_min < 15 * 60,
                    transit_info=None,
                    visited=False,
                )
            )
        return TripGenerationResponse(itinerary_items=items)

    @staticmethod
    def _fallback_swaps(
        request: SmartSwapRequest,
        places: Sequence[PlaceResponse],
    ) -> SmartSwapResponse:
        current = request.current_item
        tolerance = max(50_000, int(current.estimated_cost * 0.5))
        candidates = [
            place
            for place in places
            if place.place_id != current.place_id
            and _normalize_district(place.district) == _normalize_district(current.district)
            and place.category == current.category
            and abs(place.estimated_cost - current.estimated_cost) <= tolerance
        ]
        candidates.sort(
            key=lambda place: (
                abs(place.estimated_cost - current.estimated_cost),
                -place.editorial_score,
            )
        )
        options = [
            SmartSwapOption(
                **_model_dict(place),
                replacement_reason=(
                    f"Cùng khu vực {place.district}; "
                    f"chi phí ước tính {place.estimated_cost:,} VND."
                ),
            )
            for place in candidates[:3]
        ]
        if len(options) < 2:
            raise GeminiServiceError("The verified catalog has fewer than two swap alternatives.")
        return SmartSwapResponse(alternatives=options)

    @staticmethod
    def _fill_transit_info(
        items: list[ItineraryItemResponse],
        transport_mode: str,
        *,
        member_count: int = 1,
    ) -> list[ItineraryItemResponse]:
        """Fill ``transit_info`` for the 2nd+ stop of each day with road-adjusted fares."""

        speed_kmh = _MODE_SPEED_KMH.get(transport_mode, 20.0)
        _MODE_FARE_MAP: dict[str, str] = {
            "walk": "",
            "grab_bike": "Bike",
            "grab_car": "Car",
            "public": "Bike",
        }
        fare_keyword = _MODE_FARE_MAP.get(transport_mode, "Bike")
        cars_needed = cars_needed_for_group(member_count) if transport_mode == "grab_car" else 1

        sorted_items = sorted(items, key=lambda it: (it.day_number, it.order_index))
        result: list[ItineraryItemResponse] = []
        prev: ItineraryItemResponse | None = None
        for item in sorted_items:
            if prev is None or item.day_number != prev.day_number:
                result.append(item)
                prev = item
                continue

            dist_km = estimate_road_distance_km(
                prev.latitude, prev.longitude, item.latitude, item.longitude
            )
            duration_min = max(2, round(dist_km / speed_kmh * 60))

            if transport_mode == "walk":
                fare_vnd = 0
            else:
                fares = estimate_ride_fares(dist_km)
                matched = [f for f in fares if fare_keyword.lower() in f.vehicle_type.lower()]
                base_fare = matched[0].estimated_fare_vnd if matched else 0
                fare_vnd = base_fare * cars_needed if transport_mode == "grab_car" else base_fare

            transit = TransitInfoResponse(
                distance_km=dist_km,
                duration_min=duration_min,
                mode=transport_mode,
                estimated_fare_vnd=fare_vnd,
                cars_needed=cars_needed,
                start_time=prev.end_time,
                end_time=item.start_time,
            )
            updated = item.model_copy(update={"transit_info": transit})
            result.append(updated)
            prev = item
        return result

    @staticmethod
    def _ground_itinerary(
        result: ItineraryPlanResponse | TripGenerationResponse,
        request: TripGenerationRequest,
        places: Sequence[PlaceResponse],
    ) -> TripGenerationResponse:
        canonical = {place.place_id: place for place in places}
        expected_count = request.days * request.places_per_day
        if len(result.itinerary_items) != expected_count:
            raise ValueError(f"Expected {expected_count} itinerary stops.")

        items: list[ItineraryItemResponse] = []
        seen_slots: set[tuple[int, int]] = set()
        for item in result.itinerary_items:
            place = canonical.get(item.place_id)
            slot = (item.day_number, item.order_index)
            if place is None or slot in seen_slots:
                raise ValueError("Gemini returned an unknown place or duplicate itinerary slot.")
            if not 1 <= item.day_number <= request.days:
                raise ValueError("Gemini returned an itinerary day outside the requested range.")
            if not 1 <= item.order_index <= request.places_per_day:
                raise ValueError("Gemini returned a stop order outside the requested range.")
            seen_slots.add(slot)
            schedule = _model_dict(item, exclude=_PLACE_FIELDS)
            if not schedule.get("time_slot"):
                schedule["time_slot"] = f"{item.start_time} - {item.end_time}"
            schedule["transit_info"] = None
            items.append(ItineraryItemResponse(**_model_dict(place), **schedule))
        expected_must_visits = [
            pid for pid in dict.fromkeys(request.must_visit_ids) if pid in canonical
        ]
        scheduled_ids = {item.place_id for item in items}
        missing_must_visits = [pid for pid in expected_must_visits if pid not in scheduled_ids]
        if missing_must_visits:
            logger.warning(
                "Gemini itinerary omitted must_visit_ids: %s",
                ", ".join(missing_must_visits),
            )
        return TripGenerationResponse(itinerary_items=items)

    @staticmethod
    def _ground_swaps(
        result: SmartSwapResponse,
        request: SmartSwapRequest,
        places: Sequence[PlaceResponse],
    ) -> SmartSwapResponse:
        canonical = {place.place_id: place for place in places}
        options: list[SmartSwapOption] = []
        seen_place_ids: set[str] = set()
        tolerance = max(50_000, int(request.current_item.estimated_cost * 0.5))
        for option in result.alternatives:
            place = canonical.get(option.place_id)
            current = request.current_item
            if (
                place is None
                or place.place_id == current.place_id
                or place.place_id in seen_place_ids
                or _normalize_district(place.district) != _normalize_district(current.district)
                or place.category != current.category
                or abs(place.estimated_cost - current.estimated_cost) > tolerance
            ):
                raise ValueError("Gemini returned an ungrounded or non-equivalent swap option.")
            seen_place_ids.add(place.place_id)
            options.append(
                SmartSwapOption(
                    **_model_dict(place),
                    replacement_reason=option.replacement_reason,
                )
            )
        return SmartSwapResponse(alternatives=options)

    @staticmethod
    def _ground_concept(
        result: ConceptResponse,
        request: TripConceptRequest,
        places: Sequence[PlaceResponse],
    ) -> ConceptResponse:
        available_by_norm = {
            _normalize_district(place.district): place.district for place in places
        }
        recommended = list(
            dict.fromkeys(
                available_by_norm[_normalize_district(district)]
                for district in result.recommended_districts
                if _normalize_district(district) in available_by_norm
            )
        )
        if not recommended:
            raise ValueError("Gemini returned no district represented in the verified catalog.")
        catalog_by_id = {place.place_id: place for place in places}
        expected_must_visits = [
            catalog_by_id[pid]
            for pid in dict.fromkeys(request.must_visit_ids)
            if pid in catalog_by_id
        ]
        if expected_must_visits:
            haystack = "\n".join(
                [result.summary, result.route_overview, *result.highlights]
            ).casefold()
            missing_must_visits = [
                place.place_id
                for place in expected_must_visits
                if place.place_name.casefold() not in haystack
                and place.place_id.casefold() not in haystack
            ]
            if missing_must_visits:
                logger.warning(
                    "Gemini concept omitted must_visit_ids: %s",
                    ", ".join(missing_must_visits),
                )
        return ConceptResponse(
            summary=result.summary,
            highlights=result.highlights,
            recommended_districts=recommended,
            route_overview=result.route_overview,
            confirmation_question=result.confirmation_question,
        )
