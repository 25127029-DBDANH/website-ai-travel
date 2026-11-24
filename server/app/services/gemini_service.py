"""Gemini-backed trip planning with grounded local fallbacks."""

from __future__ import annotations

import asyncio
import inspect
import json
import logging
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
    PlaceResponse,
    SmartSwapOption,
    SmartSwapRequest,
    SmartSwapResponse,
    TripConceptRequest,
    TripGenerationRequest,
    TripGenerationResponse,
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
_RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}
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
        max_attempts: int = 3,
        retry_base_seconds: float = 0.75,
        requests_per_minute: int = 15,
        max_concurrent_requests: int = 2,
    ) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be at least 1.")
        if requests_per_minute < 1 or max_concurrent_requests < 1:
            raise ValueError("Rate and concurrency limits must be positive.")

        if client is None and api_key:
            try:
                from google import genai
            except ImportError as error:
                raise RuntimeError(
                    "The Google Gen AI SDK is missing. Install the project's "
                    "google-genai dependency before creating GeminiService."
                ) from error
            client = genai.Client(api_key=api_key)

        self._client = client
        self._api_key = api_key or ""
        self.model = model
        self.max_attempts = max_attempts
        self.retry_base_seconds = retry_base_seconds
        self.requests_per_minute = requests_per_minute
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)
        self._request_times: deque[float] = deque()
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
        places = self._apply_constraints(
            self._require_places(available_places),
            request,
            min_count=1,
        )
        prompt = self._prompt(
            "Suggest a trip concept before the traveler approves a detailed plan.",
            request,
            places,
            "Return a concept summary, a few highlights, recommended districts, "
            "a high-level route flow, and a concise confirmation question. Do not "
            "write a timed day-by-day itinerary yet.",
        )
        generated, source = await self._generate(
            prompt,
            ConceptResponse,
            fallback=lambda: self._fallback_concept(request, places),
        )
        try:
            result = self._ground_concept(generated, request, places)
        except ValueError as error:
            logger.error(
                "Gemini concept could not be grounded (%s); using local fallback.",
                self._safe_error_message(error),
            )
            result = self._fallback_concept(request, places)
            source = "fallback"
        return self._with_source(result, source)

    async def generate_itinerary(
        self,
        request: TripGenerationRequest,
        available_places: Sequence[PlaceResponse],
    ) -> TripGenerationResponse:
        places = self._apply_constraints(
            self._require_places(available_places),
            request,
            min_count=request.days * request.places_per_day,
        )
        prompt = self._prompt(
            "Create the detailed trip after the traveler approved the concept.",
            request,
            places,
            "Create exactly the requested number of days and stops per day. Use "
            "only place_id values from the supplied catalog. Group nearby stops, "
            "follow the selected pace and treat special notes as constraints. "
            "Avoid repeating a place, cluster each day in as few districts as "
            "possible, fit meals near local meal times, and keep estimated spend "
            "within the total group budget when possible. Set transit_info to null: "
            "the transit calculator will fill that separately.",
        )
        try:
            generated, source = await self._generate(
                prompt,
                TripGenerationResponse,
                fallback=lambda: self._fallback_itinerary(request, places),
            )
            result = self._ground_itinerary(generated, request, places)
            return self._with_source(result, source)
        except Exception as error:
            logger.warning(
                "Using local itinerary fallback after invalid AI output (%s: %s).",
                type(error).__name__, self._safe_error_message(error),
            )
            return self._with_source(self._fallback_itinerary(request, places), "fallback")

    async def suggest_swaps(
        self,
        request: SmartSwapRequest,
        available_places: Sequence[PlaceResponse],
    ) -> SmartSwapResponse:
        places = self._require_places(available_places)
        prompt = self._prompt(
            "Suggest Smart Swap options for one itinerary stop.",
            request,
            places,
            "Return two or three alternatives. Prefer the same district, category, "
            "and a similar estimated cost. Briefly explain why each alternative "
            "fits the requested change. Do not return the current place.",
        )
        try:
            generated, source = await self._generate(
                prompt,
                SmartSwapResponse,
                fallback=lambda: self._fallback_swaps(request, places),
            )
            result = self._ground_swaps(generated, request, places)
            return self._with_source(result, source)
        except Exception as error:
            logger.warning(
                "Using local Smart Swap fallback after invalid AI output (%s: %s).",
                type(error).__name__, self._safe_error_message(error),
            )
            return self._with_source(self._fallback_swaps(request, places), "fallback")

    async def _generate(
        self,
        prompt: str,
        response_model: type[ModelT],
        *,
        fallback: Any,
    ) -> tuple[ModelT, ResponseSource]:
        last_error: Exception | None = None
        for attempt in range(1, self.max_attempts + 1):
            if self._client is None:
                break
            try:
                async with self._semaphore:
                    await self._wait_for_rate_slot()
                    response = await asyncio.to_thread(
                        self._client.models.generate_content,
                        model=self.model,
                        contents=prompt,
                        config={
                            "temperature": 0.4,
                            "response_mime_type": "application/json",
                            "response_json_schema": _model_schema(response_model),
                        },
                    )
                response_text = getattr(response, "text", None)
                if not response_text:
                    raise ValueError("Gemini returned an empty structured response.")
                return _validate_json(response_model, response_text), "gemini"
            except Exception as error:
                last_error = error
                if attempt >= self.max_attempts or not self._is_retryable(error):
                    break
                delay = self.retry_base_seconds * (2 ** (attempt - 1))
                delay *= random.uniform(0.8, 1.2)
                logger.warning(
                    "Gemini request failed with a transient error; retry %s/%s in %.2fs.",
                    attempt,
                    self.max_attempts - 1,
                    delay,
                )
                await asyncio.sleep(delay)

        if last_error is not None:
            logger.error(
                "Gemini request failed (%s, status=%s): %s; using local fallback.",
                type(last_error).__name__,
                self._error_status_code(last_error) or "unknown",
                self._safe_error_message(last_error),
            )

        try:
            fallback_result = fallback()
            if inspect.isawaitable(fallback_result):
                fallback_result = await fallback_result
            return _validate_object(response_model, fallback_result), "fallback"
        except Exception as fallback_error:
            raise GeminiServiceError(
                "Gemini request failed and no valid local fallback was available."
            ) from fallback_error

    def _safe_error_message(self, error: Exception) -> str:
        message = str(error)
        if self._api_key:
            message = message.replace(self._api_key, "[REDACTED]")
        message = re.sub(r"(?i)([?&]key=)[^&\s]+", r"\1[REDACTED]", message)
        message = re.sub(r"AIza[0-9A-Za-z_-]{20,}", "[REDACTED]", message)
        message = re.sub(
            r"(?i)(api[_-]?key|authorization)(\s*[:=]\s*)[^,\s'\"]+",
            r"\1\2[REDACTED]",
            message,
        )
        return " ".join(message.split())[:300]

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

    async def _wait_for_rate_slot(self) -> None:
        window_seconds = 60.0
        while True:
            async with self._rate_lock:
                now = time.monotonic()
                while self._request_times and now - self._request_times[0] >= window_seconds:
                    self._request_times.popleft()
                if len(self._request_times) < self.requests_per_minute:
                    self._request_times.append(now)
                    return
                wait_seconds = window_seconds - (now - self._request_times[0])
            await asyncio.sleep(max(wait_seconds, 0.01))

    @staticmethod
    def _is_retryable(error: Exception) -> bool:
        status = getattr(error, "code", None) or getattr(error, "status_code", None)
        response = getattr(error, "response", None)
        status = status or getattr(response, "status_code", None)
        if status in _RETRYABLE_STATUS_CODES:
            return True
        if isinstance(error, (TimeoutError, ConnectionError, OSError)):
            return True
        return error.__class__.__name__ in {
            "DeadlineExceeded",
            "InternalServerError",
            "ResourceExhausted",
            "ServerError",
            "ServiceUnavailable",
            "TooManyRequests",
        }

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

    @staticmethod
    def _prompt(
        task: str,
        request: BaseModel,
        places: Sequence[PlaceResponse],
        instructions: str,
    ) -> str:
        catalog = [_model_dict(place) for place in places]
        catalog_by_id = {place.place_id: place for place in places}
        example = GeminiService._few_shot_example(places)
        request_data = _model_dict(request)

        valid_must_visits = [
            catalog_by_id[pid]
            for pid in dict.fromkeys(getattr(request, "must_visit_ids", None) or [])
            if pid in catalog_by_id
        ]
        if "must_visit_ids" in request_data:
            request_data["must_visit_ids"] = [place.place_id for place in valid_must_visits]

        constraints: list[str] = []
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
        if valid_start and valid_end:
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
        return (
            f"{SYSTEM_INSTRUCTION}\nTASK: {task}\n\n"
            f"LOCAL FEW-SHOT EXAMPLE (format guidance only):\n{example}\n\n"
            f"TRAVELER REQUEST:\n{json.dumps(request_data, ensure_ascii=False)}\n\n"
            f"{constraints_block}"
            f"VERIFIED PLACE CATALOG:\n{json.dumps(catalog, ensure_ascii=False)}\n\n"
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
                    f"For a balanced day clustered in {district}, schedule {other[0].place_name} "
                    f"in the morning, {food.place_name} near lunch, and {other[1].place_name} "
                    "in the afternoon. Use these only if they also match the traveler's request."
                )
        return (
            "For a balanced day, cluster nearby sightseeing, a meal near noon, and a later "
            "activity. Select every stop from the supplied catalog and keep its district grouping."
        )

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

        items: list[ItineraryItemResponse] = []
        for index, place in enumerate(selected):
            day_number = index // request.places_per_day + 1
            order_index = index % request.places_per_day + 1
            start_time, end_time = _TIME_SLOTS[order_index - 1]
            items.append(
                ItineraryItemResponse(
                    **_model_dict(place),
                    day_number=day_number,
                    order_index=order_index,
                    time_slot=f"{start_time} - {end_time}",
                    start_time=start_time,
                    end_time=end_time,
                    is_lunch=place.category == "food" and order_index == 3,
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
    def _ground_itinerary(
        result: TripGenerationResponse,
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
