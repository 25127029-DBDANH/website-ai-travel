"""
calendar_service.py — Pure Python RFC 5545 iCalendar (.ics) generation.
Author  : Đàng Minh Hạo (Backend Developer — Routing & Adaptive)
"""

from __future__ import annotations

import hashlib
import re
from datetime import UTC, date, datetime, timedelta
from typing import Any

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
PRODID: str = "-//Saigon Guide//AI Travel Planner//VI"
CALSCALE: str = "GREGORIAN"
METHOD: str = "PUBLISH"
DEFAULT_TIMEZONE: str = "Asia/Ho_Chi_Minh"
DEFAULT_START_TIME: str = "09:00"
DEFAULT_END_TIME: str = "11:00"
VALARM_TRIGGER: str = "-PT30M"  # Nhắc trước 30 phút
MAX_OCTETS_PER_LINE: int = 75  # RFC 5545 Section 3.1 line folding limit


# ---------------------------------------------------------------------------
# Formatting & Escaping Helpers
# ---------------------------------------------------------------------------
def escape_ics_text(text: str | None) -> str:
    """
    Escape special characters for RFC 5545 TEXT values.
    Backslash, semicolon, comma, and newlines must be escaped.

    Args:
        text: Raw text string or None.

    Returns:
        RFC 5545 escaped text string.
    """
    if not text:
        return ""

    # Must replace backslash first so we don't double-escape later backslashes
    escaped = str(text).replace("\\", "\\\\")
    escaped = escaped.replace(";", "\\;")
    escaped = escaped.replace(",", "\\,")
    # Normalize CRLF or LF to literal \n
    escaped = escaped.replace("\r\n", "\\n").replace("\r", "\\n").replace("\n", "\\n")
    return escaped


def fold_line(line: str, max_octets: int = MAX_OCTETS_PER_LINE) -> str:
    """
    Fold a single content line according to RFC 5545 Section 3.1.
    No physical line may exceed max_octets (75 UTF-8 bytes).
    Folds are inserted as CRLF followed by a single space character (0x20).

    Args:
        line: The logical line to fold.
        max_octets: Maximum octets per line (default 75).

    Returns:
        Folded line string with \\r\\n and continuation spaces.
    """
    encoded = line.encode("utf-8")
    if len(encoded) <= max_octets:
        return line

    chunks: list[str] = []
    remaining = line
    first_chunk = True

    while remaining:
        # Subsequent continuation lines begin with a space (1 byte),
        # so maximum content length is max_octets - 1.
        limit = max_octets if first_chunk else (max_octets - 1)

        # Greedily accumulate characters until byte limit is reached
        accumulated_chars: list[str] = []
        current_byte_len = 0

        for char in remaining:
            char_bytes = char.encode("utf-8")
            if current_byte_len + len(char_bytes) > limit:
                break
            accumulated_chars.append(char)
            current_byte_len += len(char_bytes)

        if not accumulated_chars:
            # Fallback: if a single character exceeds limit (edge case)
            chunk_str = remaining[0]
        else:
            chunk_str = "".join(accumulated_chars)

        chunks.append(chunk_str)
        remaining = remaining[len(chunk_str) :]
        first_chunk = False

    return "\r\n ".join(chunks)


def _parse_time_pair(
    start_raw: Any, end_raw: Any, time_slot: Any = None
) -> tuple[str, str]:
    """Extract and validate start and end times in HH:MM format."""
    start_str = str(start_raw).strip() if start_raw else ""
    end_str = str(end_raw).strip() if end_raw else ""

    # If times are missing but time_slot is provided (e.g. "09:00 - 11:30")
    if (not start_str or not end_str) and time_slot:
        slot_parts = str(time_slot).split("-")
        if len(slot_parts) == 2:
            start_str = start_str or slot_parts[0].strip()
            end_str = end_str or slot_parts[1].strip()

    # Match HH:MM
    match_start = re.search(r"(\d{1,2}):(\d{2})", start_str)
    match_end = re.search(r"(\d{1,2}):(\d{2})", end_str)

    sh, sm = (
        (int(match_start.group(1)), int(match_start.group(2)))
        if match_start
        else (9, 0)
    )
    eh, em = (
        (int(match_end.group(1)), int(match_end.group(2))) if match_end else (11, 0)
    )

    # Clamp hours and minutes
    sh = min(23, max(0, sh))
    sm = min(59, max(0, sm))
    eh = min(23, max(0, eh))
    em = min(59, max(0, em))

    return f"{sh:02d}:{sm:02d}", f"{eh:02d}:{em:02d}"


def _generate_uid(trip_id: str, day_num: int, index: int, place_name: str) -> str:
    """Generate deterministic, collision-resistant UID for an activity."""
    raw = f"{trip_id}_{day_num}_{index}_{place_name}"
    digest = hashlib.sha1(raw.encode("utf-8")).hexdigest()[:12]
    return f"{trip_id}-d{day_num}-idx{index}-{digest}@saigonguide.app"


# ---------------------------------------------------------------------------
# Core iCalendar Generation
# ---------------------------------------------------------------------------
def generate_ics_content(
    trip_id: str,
    title: str,
    items: list[dict[str, Any] | Any],
    start_date: date | str | None = None,
    now_dt: datetime | None = None,
) -> str:
    """
    Generate RFC 5545 compliant iCalendar string (.ics) from trip activities.

    Args:
        trip_id: Unique trip ID.
        title: Title of the trip.
        items: List of activities (dicts or objects with place_name, day_number, start_time, etc.).
        start_date: Starting date of Day 1 (default tomorrow).
        now_dt: Injected current timestamp for DTSTAMP (defaults to UTC now).

    Returns:
        Full RFC 5545 formatted .ics text using CRLF line endings.
    """
    if now_dt is None:
        now_dt = datetime.now(UTC)
    dtstamp_str = now_dt.strftime("%Y%m%dT%H%M%SZ")

    # Resolve base start_date
    if isinstance(start_date, str) and start_date:
        try:
            resolved_start_date = date.fromisoformat(start_date)
        except ValueError:
            resolved_start_date = date.today() + timedelta(days=1)
    elif isinstance(start_date, date):
        resolved_start_date = start_date
    else:
        resolved_start_date = date.today() + timedelta(days=1)

    lines: list[str] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        f"PRODID:{PRODID}",
        f"CALSCALE:{CALSCALE}",
        f"METHOD:{METHOD}",
        f"X-WR-CALNAME:Lịch trình Sài Gòn - {escape_ics_text(title)}",
        f"X-WR-TIMEZONE:{DEFAULT_TIMEZONE}",
    ]

    for index, item in enumerate(items, start=1):
        # Extract attributes from dict or object
        if isinstance(item, dict):
            place_name = str(item.get("place_name") or "Điểm tham quan")
            day_number = int(item.get("day_number") or 1)
            start_raw = item.get("start_time")
            end_raw = item.get("end_time")
            time_slot = item.get("time_slot")
            address = item.get("address") or "TP. Hồ Chí Minh"
            description = item.get("description") or ""
            cost = item.get("estimated_cost") or 0
        else:
            place_name = str(getattr(item, "place_name", "Điểm tham quan"))
            day_number = int(getattr(item, "day_number", 1))
            start_raw = getattr(item, "start_time", None)
            end_raw = getattr(item, "end_time", None)
            time_slot = getattr(item, "time_slot", None)
            address = getattr(item, "address", "TP. Hồ Chí Minh") or "TP. Hồ Chí Minh"
            description = getattr(item, "description", "") or ""
            cost = getattr(item, "estimated_cost", 0) or 0

        # Calculate calendar date for this activity
        day_offset = max(0, day_number - 1)
        event_date = resolved_start_date + timedelta(days=day_offset)

        start_time_str, end_time_str = _parse_time_pair(start_raw, end_raw, time_slot)
        sh, sm = map(int, start_time_str.split(":"))
        eh, em = map(int, end_time_str.split(":"))

        dtstart_val = f"{event_date.strftime('%Y%m%d')}T{sh:02d}{sm:02d}00"
        dtend_val = f"{event_date.strftime('%Y%m%d')}T{eh:02d}{em:02d}00"

        uid = _generate_uid(trip_id, day_number, index, place_name)
        cost_formatted = (
            f"{cost:,.0f} VND"
            if isinstance(cost, (int, float)) and cost > 0
            else "Miễn phí"
        )

        desc_body = (
            (
                f"{description}\\n\\n"
                f"Chi phí dự kiến: {cost_formatted}\\n"
                f"Địa chỉ: {address}"
            )
            if description
            else (f"Chi phí dự kiến: {cost_formatted}\\nĐịa chỉ: {address}")
        )

        event_lines: list[str] = [
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{dtstamp_str}",
            f"DTSTART;TZID={DEFAULT_TIMEZONE}:{dtstart_val}",
            f"DTEND;TZID={DEFAULT_TIMEZONE}:{dtend_val}",
            f"SUMMARY:[{start_time_str} - {end_time_str}] {escape_ics_text(place_name)}",
            f"DESCRIPTION:{escape_ics_text(desc_body)}",
            f"LOCATION:{escape_ics_text(address)}",
            "STATUS:CONFIRMED",
            "BEGIN:VALARM",
            f"TRIGGER:{VALARM_TRIGGER}",
            "ACTION:DISPLAY",
            f"DESCRIPTION:Nhắc nhở: Chuẩn bị đến {escape_ics_text(place_name)}",
            "END:VALARM",
            "END:VEVENT",
        ]

        lines.extend(event_lines)

    lines.append("END:VCALENDAR")

    # Apply RFC 5545 line folding and join with CRLF
    folded_lines = [fold_line(line) for line in lines]
    return "\r\n".join(folded_lines) + "\r\n"
