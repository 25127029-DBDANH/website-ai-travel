"""
test_calendar.py — Unit tests for iCalendar RFC 5545 generator and API endpoints.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from datetime import UTC, date, datetime

from fastapi.testclient import TestClient

from app.services.calendar_service import (
    escape_ics_text,
    fold_line,
    generate_ics_content,
)
from main import app

client = TestClient(app)


# ---------------------------------------------------------------------------
# RFC 5545 Escaping & Line Folding Tests
# ---------------------------------------------------------------------------
def test_escape_ics_text_special_characters():
    """Verify proper escaping of backslash, semicolon, comma, and newlines."""
    assert escape_ics_text("Hello, world; test\\backslash\nnew line") == (
        "Hello\\, world\\; test\\\\backslash\\nnew line"
    )
    assert escape_ics_text("") == ""
    assert escape_ics_text(None) == ""


def test_fold_line_short_string():
    """Short lines (<= 75 octets) should not be modified."""
    short = "SUMMARY:Tham quan Dinh Độc Lập"
    assert fold_line(short) == short


def test_fold_line_long_vietnamese_string():
    """
    Long lines (> 75 octets) must be folded with CRLF + space,
    and every physical line must be <= 75 UTF-8 bytes.
    """
    long_desc = (
        "DESCRIPTION:Khám phá di tích lịch sử Hội trường Thống Nhất với nhiều hiện vật "
        "quý giá thời kỳ kháng chiến cứu nước và kiến trúc độc đáo của kiến trúc sư Ngô Viết Thụ."
    )
    folded = fold_line(long_desc)
    assert "\r\n " in folded

    # Check each individual folded segment in octets
    physical_lines = folded.split("\r\n")
    for idx, pline in enumerate(physical_lines):
        assert len(pline.encode("utf-8")) <= 75, (
            f"Line {idx} exceeds 75 octets: {len(pline.encode('utf-8'))}"
        )


# ---------------------------------------------------------------------------
# iCalendar Content Generation Tests
# ---------------------------------------------------------------------------
def test_generate_ics_content_structure():
    """Verify standard RFC 5545 tags in generated ICS text."""
    sample_items = [
        {
            "place_name": "Dinh Độc Lập",
            "day_number": 1,
            "start_time": "09:00",
            "end_time": "11:30",
            "address": "135 Nam Kỳ Khởi Nghĩa, Quận 1",
            "description": "Tham quan di tích lịch sử",
            "estimated_cost": 65000,
        }
    ]

    fixed_now = datetime(2026, 11, 20, 10, 0, 0, tzinfo=UTC)
    ics_text = generate_ics_content(
        trip_id="test-trip-001",
        title="Du lịch Sài Gòn 1 Ngày",
        items=sample_items,
        start_date=date(2026, 11, 25),
        now_dt=fixed_now,
    )

    # Line endings check: MUST use CRLF (\r\n)
    assert "\r\n" in ics_text
    assert ics_text.startswith("BEGIN:VCALENDAR")
    assert ics_text.strip().endswith("END:VCALENDAR")

    # Calendar metadata & VTIMEZONE
    assert "VERSION:2.0" in ics_text
    assert "PRODID:-//Saigon Guide//AI Travel Planner//VI" in ics_text
    assert "CALSCALE:GREGORIAN" in ics_text
    assert "X-WR-CALNAME:Lịch trình Sài Gòn - Du lịch Sài Gòn 1 Ngày" in ics_text
    assert "X-WR-TIMEZONE:Asia/Ho_Chi_Minh" in ics_text
    assert "BEGIN:VTIMEZONE" in ics_text
    assert "TZID:Asia/Ho_Chi_Minh" in ics_text
    assert "TZOFFSETFROM:+0700" in ics_text
    assert "TZOFFSETTO:+0700" in ics_text
    assert "TZNAME:ICT" in ics_text
    assert "END:VTIMEZONE" in ics_text

    # VTIMEZONE must appear before VEVENT
    assert ics_text.index("BEGIN:VTIMEZONE") < ics_text.index("BEGIN:VEVENT")

    # VEVENT attributes
    assert "BEGIN:VEVENT" in ics_text
    assert "UID:test-trip-001-d1-idx1-" in ics_text
    assert "DTSTAMP:20261120T100000Z" in ics_text
    assert "DTSTART;TZID=Asia/Ho_Chi_Minh:20261125T090000" in ics_text
    assert "DTEND;TZID=Asia/Ho_Chi_Minh:20261125T113000" in ics_text
    assert "SUMMARY:[09:00 - 11:30] Dinh Độc Lập" in ics_text
    assert "LOCATION:135 Nam Kỳ Khởi Nghĩa\\, Quận 1" in ics_text
    assert "STATUS:CONFIRMED" in ics_text

    # VALARM 30-minute reminder check
    assert "BEGIN:VALARM" in ics_text
    assert "TRIGGER:-PT30M" in ics_text
    assert "ACTION:DISPLAY" in ics_text
    assert "DESCRIPTION:Nhắc nhở: Chuẩn bị đến Dinh Độc Lập" in ics_text
    assert "END:VALARM" in ics_text
    assert "END:VEVENT" in ics_text


# ---------------------------------------------------------------------------
# FastAPI Calendar Endpoint Tests
# ---------------------------------------------------------------------------
def test_get_calendar_ics_success():
    """GET /api/v1/calendar/ics/demo returns 200 with valid .ics file attachment."""
    response = client.get("/api/v1/calendar/ics/demo")
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


def test_get_calendar_ics_demo_1_with_start_date():
    """GET /api/v1/calendar/ics/trip-demo-1 with custom start_date query parameter."""
    response = client.get("/api/v1/calendar/ics/trip-demo-1?start_date=2026-12-01")
    assert response.status_code == 200
    body = response.text
    assert "20261201T083000" in body
    assert "Dinh Độc Lập" in body


def test_get_calendar_ics_not_found():
    """GET /api/v1/calendar/ics/unknown-id returns 404 NOT FOUND."""
    response = client.get("/api/v1/calendar/ics/unknown-id-404")
    assert response.status_code == 404
    data = response.json()
    assert "Không tìm thấy chuyến đi" in data["detail"]


def test_post_export_ics_direct():
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

    response = client.post("/api/v1/calendar/export-ics", json=payload)
    assert response.status_code == 200
    assert "text/calendar" in response.headers["content-type"]
    assert "Bitexco Financial Tower" in response.text
    assert "TRIGGER:-PT30M" in response.text


def test_preview_calendar_endpoint():
    """GET /api/v1/calendar/preview/demo returns preview metadata JSON."""
    response = client.get("/api/v1/calendar/preview/demo")
    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] == "demo"
    assert data["event_count"] == 2
    assert data["time_zone"] == "Asia/Ho_Chi_Minh"
    assert "BEGIN:VCALENDAR" in data["ics_preview"]


def test_root_healthcheck():
    """Root GET / returns 200 OK."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ---------------------------------------------------------------------------
# RFC 5545 Unfolding, Newline & VTIMEZONE Specific Tests
# ---------------------------------------------------------------------------
def test_unfolded_description_single_escape_newline_and_no_double_escape():
    """
    After unfolding (removing CRLF + 1 space/tab continuation),
    DESCRIPTION must contain literal '\\n' (single backslash + n)
    and must NOT contain '\\\\n' (double backslash + n).
    """
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

    # RFC 5545 unfolding: remove CRLF followed by single space or tab
    unfolded = ics_text.replace("\r\n ", "").replace("\r\n\t", "")

    # Extract all DESCRIPTION lines
    desc_lines = [
        line for line in unfolded.split("\r\n") if line.startswith("DESCRIPTION:")
    ]
    assert len(desc_lines) >= 2  # At least VEVENT description and VALARM description

    # The VEVENT description contains multiline details
    event_desc = next(line for line in desc_lines if "Chi phí" in line)
    assert r"\n" in event_desc, (
        f"VEVENT DESCRIPTION should contain escaped newline: {event_desc}"
    )

    # No DESCRIPTION (neither VEVENT nor VALARM) may contain double-escaped \\n
    for dline in desc_lines:
        assert r"\\n" not in dline, (
            f"DESCRIPTION must not contain double-escaped \\n: {dline}"
        )


def test_comma_escaping_not_double_escaped():
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

    # Check commas in SUMMARY, LOCATION, DESCRIPTION
    assert r"\," in unfolded, "Should contain single-escaped commas"
    assert r"\\," not in unfolded, "Commas must not be double-escaped into \\\\,"


def test_vtimezone_asia_ho_chi_minh_block():
    """Verify full VTIMEZONE definition for Asia/Ho_Chi_Minh in generated ICS."""
    response = client.get("/api/v1/calendar/ics/demo")
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
