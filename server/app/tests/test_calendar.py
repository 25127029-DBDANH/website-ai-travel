"""RFC 5545 calendar export and reminder tests."""

from __future__ import annotations

from datetime import date

import pytest
from httpx import AsyncClient
from icalendar import Calendar

from app.tests.conftest import create_trip


@pytest.mark.integration
async def test_export_ics_parses_and_contains_a_30_minute_reminder(
    client: AsyncClient, trip_payload: dict[str, object]
) -> None:
    trip = await create_trip(client, trip_payload)
    response = await client.get(
        f"/api/trips/{trip['id']}/export-ics", params={"start_date": date(2026, 12, 1).isoformat()}
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
async def test_ics_export_rejects_an_unknown_trip(client: AsyncClient) -> None:
    response = await client.get(
        "/api/trips/00000000-0000-0000-0000-000000000000/export-ics",
        params={"start_date": "2026-12-01"},
    )

    assert response.status_code == 404
