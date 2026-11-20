"""Gemini-backed trip planning with grounded local fallbacks."""

from __future__ import annotations

import asyncio
import inspect
import json
import logging
import random
import time
from collections import deque
from collections.abc import Sequence
from typing import Any, TypeVar

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


def _normalize_district(district: str) -> str:
    normalized = district.strip()
    if normalized.casefold().startswith("tp. "):
        normalized = normalized[4:].strip()
    return normalized.casefold()


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
        self.model = model
        self.max_attempts = max_attempts
        self.retry_base_seconds = retry_base_seconds
        self.requests_per_minute = requests_per_minute
        self._semaphore = asyncio.Semaphore(max_concurrent_requests)
        self._request_times: deque[float] = deque()
        self._rate_lock = asyncio.Lock()

    async def suggest_concept(
        self,
        request: TripConceptRequest,
        available_places: Sequence[PlaceResponse],
    ) -> ConceptResponse:
        places = self._require_places(available_places)
        prompt = self._prompt(
            "Suggest a trip concept before the traveler approves a detailed plan.",
            request,
            places,
            "Return a concept summary, a few highlights, recommended districts, "
            "a high-level route flow, and a concise confirmation question. Do not "
            "write a timed day-by-day itinerary yet.",
        )
        generated = await self._generate(
            prompt,
            ConceptResponse,
            fallback=lambda: self._fallback_concept(request, places),
        )
        try:
            return self._ground_concept(generated, request, places)
        except ValueError:
            return self._fallback_concept(request, places)

    async def generate_itinerary(
        self,
        request: TripGenerationRequest,
        available_places: Sequence[PlaceResponse],
    ) -> TripGenerationResponse:
        places = self._require_places(available_places)
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
            generated = await self._generate(
                prompt,
                TripGenerationResponse,
                fallback=lambda: self._fallback_itinerary(request, places),
            )
            return self._ground_itinerary(generated, request, places)
        except Exception as error:
            logger.warning(
                "Using local itinerary fallback after invalid AI output (%s).",
                type(error).__name__,
            )
            return self._fallback_itinerary(request, places)

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
            generated = await self._generate(
                prompt,
                SmartSwapResponse,
                fallback=lambda: self._fallback_swaps(request, places),
            )
            return self._ground_swaps(generated, request, places)
        except Exception as error:
            logger.warning(
                "Using local Smart Swap fallback after invalid AI output (%s).",
                type(error).__name__,
            )
            return self._fallback_swaps(request, places)

    async def _generate(
        self,
        prompt: str,
        response_model: type[ModelT],
        *,
        fallback: Any,
    ) -> ModelT:
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
                return _validate_json(response_model, response_text)
            except Exception as error:
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

        try:
            fallback_result = fallback()
            if inspect.isawaitable(fallback_result):
                fallback_result = await fallback_result
            return _validate_object(response_model, fallback_result)
        except Exception as fallback_error:
            raise GeminiServiceError(
                "Gemini request failed and no valid local fallback was available."
            ) from fallback_error

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
    def _prompt(
        task: str,
        request: BaseModel,
        places: Sequence[PlaceResponse],
        instructions: str,
    ) -> str:
        catalog = [_model_dict(place) for place in places]
        example = GeminiService._few_shot_example(places)
        return (
            f"{SYSTEM_INSTRUCTION}\nTASK: {task}\n\n"
            f"LOCAL FEW-SHOT EXAMPLE (format guidance only):\n{example}\n\n"
            f"TRAVELER REQUEST:\n{json.dumps(_model_dict(request), ensure_ascii=False)}\n\n"
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
        available_districts = list(dict.fromkeys(place.district for place in places))
        districts = [district for district in request.districts if district in available_districts]
        districts.extend(district for district in available_districts if district not in districts)
        districts = districts[: min(request.days, 3)]
        highlights = list(dict.fromkeys(
            place.place_name for place in places if place.district in districts
        ))[:3]
        route = " → ".join(districts[: min(request.days, 3)])
        return ConceptResponse(
            summary=(
                f"Gợi ý chuyến đi {request.days} ngày tại TP.HCM, ưu tiên "
                f"{', '.join(request.preferences) or 'khám phá địa phương'} "
                f"với nhịp độ {request.pace}, trong ngân sách nhóm {request.budget:,} VND."
            ),
            highlights=highlights,
            recommended_districts=districts[: min(request.days, 3)],
            route_overview=route or "Khám phá các điểm phù hợp trong TP.HCM.",
            confirmation_question="Bạn có đồng ý với concept này không?",
        )

    @classmethod
    def _fallback_itinerary(
        cls,
        request: TripGenerationRequest,
        places: Sequence[PlaceResponse],
    ) -> TripGenerationResponse:
        districts = set(request.approved_concept.recommended_districts)
        preferred_categories = {
            _PREFERENCE_CATEGORIES.get(preference, preference)
            for preference in request.preferences
        }
        ordered_places = sorted(
            places,
            key=lambda place: (
                place.district not in districts,
                place.category not in preferred_categories,
                place.estimated_cost,
            ),
        )
        selected: list[PlaceResponse] = []
        used_place_ids: set[str] = set()
        for _day in range(request.days):
            day_places: list[PlaceResponse] = []
            for order_index in range(1, request.places_per_day + 1):
                candidates = [place for place in ordered_places if place.place_id not in used_place_ids]
                if order_index == 3:
                    food = next((place for place in candidates if place.category == "food"), None)
                    place = food or (candidates[0] if candidates else None)
                else:
                    place = candidates[0] if candidates else None
                if place is None:
                    raise GeminiServiceError("The verified catalog has too few unique places for this itinerary.")
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
        available_districts = {place.district.casefold() for place in places}
        recommended = [
            district
            for district in result.recommended_districts
            if district.casefold() in available_districts
        ]
        if not recommended:
            raise ValueError("Gemini returned no district represented in the verified catalog.")
        return ConceptResponse(
            summary=result.summary,
            highlights=result.highlights,
            recommended_districts=recommended,
            route_overview=result.route_overview,
            confirmation_question=result.confirmation_question,
        )
