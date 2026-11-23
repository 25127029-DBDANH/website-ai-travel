"""RFC 5545 calendar export, unit, and integration tests."""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest
from httpx import AsyncClient
from icalendar import Calendar

from app.services.calendar_service import (
    escape_ics_text,
    fold_line,
    generate_ics_content,
)
from app.tests.conftest import create_trip


# ---------------------------------------------------------------------------
# Integration Tests (authenticated DB trip -> RFC 5545 .ics via icalendar)
# ---------------------------------------------------------------------------
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
    assert any(alarm.get("TRIGGER").to_ical() == b"-PT30M" for alarm in alarms)


@pytest.mark.integration
async def test_ics_export_rejects_an_unknown_trip(authenticated_client: AsyncClient) -> None:
    response = await authenticated_client.get(
        "/api/v1/calendar/ics/00000000-0000-0000-0000-000000000000",
        params={"start_date": "2026-12-01"},
    )

    assert response.status_code == 404


# ---------------------------------------------------------------------------
# RFC 5545 Escaping & Line Folding Tests
# ---------------------------------------------------------------------------
def test_escape_ics_text_special_characters() -> None:
    """Verify proper escaping of backslash, semicolon, comma, and newlines."""
    assert escape_ics_text("Hello, world; test\\backslash\nnew line") == (
        "Hello\\, world\\; test\\\\backslash\\nnew line"
    )
    assert escape_ics_text("") == ""
    assert escape_ics_text(None) == ""


def test_fold_line_short_string() -> None:
    """Short lines (<= 75 octets) should not be modified."""
    short = "SUMMARY:Tham quan Dinh Độc Lập"
    assert fold_line(short) == short


def test_fold_line_long_vietnamese_string() -> None:
    """Long lines (> 75 octets) must be folded with CRLF + space without splitting UTF-8."""
    long_desc = (
        "DESCRIPTION:Khám phá di tích lịch sử Hội trường Thống Nhất với nhiều hiện vật "
        "quý giá thời kỳ kháng chiến cứu nước và kiến trúc độc đáo của kiến trúc sư Ngô Viết Thụ."
    )
    folded = fold_line(long_desc)
    assert "\r\n " in folded

    physical_lines = folded.split("\r\n")
    for line in physical_lines:
        assert len(line.encode("utf-8")) <= 75


def test_generate_ics_content_structure() -> None:
    """Generated ICS must follow RFC 5545 structure with CRLF and VALARM -PT30M."""
    items = [
        {
            "place_name": "Dinh Độc Lập",
            "day_number": 1,
            "start_time": "08:30",
            "end_time": "10:30",
            "address": "135 Nam Kỳ Khởi Nghĩa, Quận 1",
            "description": "Di tích lịch sử",
            "estimated_cost": 40000,
        },
        {
            "place_name": "Chợ Bến Thành",
            "day_number": 2,
            "time_slot": "14:00 - 16:00",
            "address": "Lê Lợi, Quận 1",
            "estimated_cost": 0,
        },
    ]
    fixed_now = datetime(2026, 11, 20, 10, 0, 0, tzinfo=UTC)
    ics = generate_ics_content(
        trip_id="unit-trip-1",
        title="Sài Gòn 2 ngày",
        items=items,
        start_date=date(2026, 12, 1),
        now_dt=fixed_now,
    )

    assert ics.startswith("BEGIN:VCALENDAR\r\n")
    assert ics.endswith("END:VCALENDAR\r\n")
    assert "VERSION:2.0\r\n" in ics
    assert "DTSTAMP:20261120T100000Z\r\n" in ics
    assert ics.count("BEGIN:VEVENT\r\n") == 2
    assert ics.count("TRIGGER:-PT30M\r\n") == 2
    assert "DTSTART;TZID=Asia/Ho_Chi_Minh:20261201T083000\r\n" in ics
    assert "DTSTART;TZID=Asia/Ho_Chi_Minh:20261202T140000\r\n" in ics


# ---------------------------------------------------------------------------
# Endpoint Tests (using isolated SQLite AsyncClient fixture from conftest.py)
# ---------------------------------------------------------------------------
async def test_get_calendar_ics_success(client: AsyncClient) -> None:
    """GET /api/v1/calendar/ics/demo returns 200 OK with valid .ics attachment."""
    response = await client.get("/api/v1/calendar/ics/demo")
    assert response.status_code == 200
    assert "text/calendar" in response.headers["content-type"]
    assert (
        'attachment; filename="lich-trinh-saigon-demo.ics"'
        in response.headers["content-disposition"]
    )

    body = response.text
    assert "BEGIN:VCALENDAR" in body
    assert "END:VCALENDAR" in body
    assert "TRIGGER:-PT30M" in body
    assert "Chợ Bến Thành" in body


async def test_get_calendar_ics_demo_1_with_start_date(client: AsyncClient) -> None:
    """GET /api/v1/calendar/ics/trip-demo-1 with custom start_date query parameter."""
    response = await client.get("/api/v1/calendar/ics/trip-demo-1?start_date=2026-12-01")
    assert response.status_code == 200
    body = response.text
    assert "20261201T083000" in body
    assert "Dinh Độc Lập" in body


async def test_get_calendar_ics_not_found(client: AsyncClient) -> None:
    """GET /api/v1/calendar/ics/unknown-id returns 404 NOT FOUND."""
    response = await client.get("/api/v1/calendar/ics/unknown-id-404")
    assert response.status_code == 404
    data = response.json()
    assert "Không tìm thấy chuyến đi" in data["detail"]


async def test_post_export_ics_direct(client: AsyncClient) -> None:
    """POST /api/v1/calendar/export-ics generates .ics directly from JSON body."""
    payload = {
        "id": "direct-export-99",
        "title": "Chuyến đi Tự do",
        "start_date": "2026-11-30",
        "items": [
            {
                "place_name": "Bitexco Financial Tower",
                "day_number": 1,
                "start_time": "14:00",
                "end_time": "16:00",
                "address": "2 Hải Triều, Bến Nghé, Quận 1",
                "description": "Ngắm toàn cảnh thành phố từ Saigon Skydeck",
                "estimated_cost": 200000,
            }
        ],
    }

    response = await client.post("/api/v1/calendar/export-ics", json=payload)
    assert response.status_code == 200
    assert "text/calendar" in response.headers["content-type"]
    assert "Bitexco Financial Tower" in response.text
    assert "TRIGGER:-PT30M" in response.text


async def test_preview_calendar_endpoint(client: AsyncClient) -> None:
    """GET /api/v1/calendar/preview/demo returns preview metadata JSON."""
    response = await client.get("/api/v1/calendar/preview/demo")
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] == "demo"
    assert data["event_count"] == 2
    assert data["time_zone"] == "Asia/Ho_Chi_Minh"
    assert "BEGIN:VCALENDAR" in data["ics_preview"]


# ---------------------------------------------------------------------------
# RFC 5545 Unfolding, Newline & VTIMEZONE Specific Tests
# ---------------------------------------------------------------------------
def test_unfolded_description_single_escape_newline_and_no_double_escape() -> None:
    """Unfolded DESCRIPTION must contain literal '\\n' and never double-escaped '\\\\n'."""
    items = [
        {
            "place_name": "Bảo tàng Chứng tích Chiến tranh",
            "day_number": 1,
            "start_time": "09:00",
            "end_time": "11:00",
            "address": "28 Võ Văn Tần, Phường 6, Quận 3, TP.HCM",
            "description": "Dòng 1: Giới thiệu hiện vật.\nDòng 2: Khu vực trưng bày ngoài trời.",
            "estimated_cost": 40000,
        }
    ]

    ics_text = generate_ics_content(
        trip_id="test-escape-trip",
        title="Chuyến đi Test Escape",
        items=items,
        start_date=date(2026, 12, 1),
    )

    unfolded = ics_text.replace("\r\n ", "").replace("\r\n\t", "")
    desc_lines = [line for line in unfolded.split("\r\n") if line.startswith("DESCRIPTION:")]
    assert len(desc_lines) >= 2

    event_desc = next(line for line in desc_lines if "Chi phí" in line)
    assert r"\n" in event_desc
    for dline in desc_lines:
        assert r"\\n" not in dline


def test_comma_escaping_not_double_escaped() -> None:
    """Commas in text fields must be escaped as '\\,' and not double-escaped as '\\\\,'."""
    items = [
        {
            "place_name": "Quán Cà Phê, Trà Sữa",
            "day_number": 1,
            "start_time": "14:00",
            "end_time": "15:30",
            "address": "123 Đường Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
            "description": "Gặp gỡ bạn bè, thưởng thức cà phê, ngắm phố xá.",
            "estimated_cost": 50000,
        }
    ]

    ics_text = generate_ics_content(
        trip_id="test-comma-trip",
        title="Test Comma Trip",
        items=items,
        start_date=date(2026, 12, 1),
    )

    unfolded = ics_text.replace("\r\n ", "").replace("\r\n\t", "")
    assert r"\," in unfolded
    assert r"\\," not in unfolded


async def test_vtimezone_asia_ho_chi_minh_block(client: AsyncClient) -> None:
    """Verify full VTIMEZONE definition for Asia/Ho_Chi_Minh in generated ICS."""
    response = await client.get("/api/v1/calendar/ics/demo")
    assert response.status_code == 200
    body = response.text

    assert "BEGIN:VTIMEZONE\r\n" in body
    assert "TZID:Asia/Ho_Chi_Minh\r\n" in body
    assert "BEGIN:STANDARD\r\n" in body
    assert "DTSTART:19700101T000000\r\n" in body
    assert "TZOFFSETFROM:+0700\r\n" in body
    assert "TZOFFSETTO:+0700\r\n" in body
    assert "TZNAME:ICT\r\n" in body
    assert "END:STANDARD\r\n" in body
    assert "END:VTIMEZONE\r\n" in body
