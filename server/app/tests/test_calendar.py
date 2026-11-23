"""RFC 5545 calendar export and reminder tests."""

from __future__ import annotations

from datetime import date

import pytest
from httpx import AsyncClient
from icalendar import Calendar

from app.api.v1.api import api_router
from app.tests.conftest import create_trip

_calendar_routes_exist = any(
    "/calendar/" in getattr(route, "path", "") for route in api_router.routes
)
pytestmark = pytest.mark.skipif(
    not _calendar_routes_exist,
    reason="Calendar endpoints are not implemented on the current main branch yet.",
)


@pytest.mark.integration
async def test_export_ics_parses_and_contains_a_30_minute_reminder(
    authenticated_client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    payload = {
        **trip_payload,
        "itinerary_items": [
            {
                "day_number": 1,
                "order_index": 0,
                "place_name": "Independence Palace",
                "address": "135 Nam Ky Khoi Nghia, District 1",
                "latitude": 10.7769,
                "longitude": 106.6953,
                "start_time": "09:00",
                "end_time": "10:00",
            }
        ],
    }
    trip = await create_trip(authenticated_client, payload)
    response = await authenticated_client.get(
        f"/api/v1/calendar/ics/{trip['id']}",
        params={"start_date": date(2026, 12, 1).isoformat()},
    )

    assert response.status_code == 200, response.text
    assert "text/calendar" in response.headers.get("content-type", "")
    calendar = Calendar.from_ical(response.content)
    events = [component for component in calendar.walk() if component.name == "VEVENT"]
    assert events
    alarms = [alarm for event in events for alarm in event.subcomponents if alarm.name == "VALARM"]
    assert alarms
    assert any(str(alarm.get("TRIGGER")) == "-PT30M" for alarm in alarms)


@pytest.mark.integration
async def test_ics_export_rejects_an_unknown_trip(authenticated_client: AsyncClient) -> None:
    response = await authenticated_client.get(
        "/api/v1/calendar/ics/00000000-0000-0000-0000-000000000000",
        params={"start_date": "2026-12-01"},
    )

    assert response.status_code == 404
