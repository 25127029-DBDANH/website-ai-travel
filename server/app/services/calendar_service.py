import urllib.parse
from datetime import datetime, timedelta

class CalendarService:
    @staticmethod
    def generate_google_calendar_url(title: str, description: str, location: str, start_iso: str, end_iso: str) -> str:
        """
        Tạo direct URL mở Google Calendar thêm sự kiện ngay lập tức (Yêu cầu 6)
        Format: YYYYMMDDTHHMMSSZ
        """
        def format_dt(dt_str):
            # parse '2026-11-01 08:00' or similar
            try:
                dt = datetime.fromisoformat(dt_str.replace("Z", ""))
                return dt.strftime("%Y%m%dT%H%M%SZ")
            except Exception:
                return datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")

        start_fmt = format_dt(start_iso)
        end_fmt = format_dt(end_iso)

        base_url = "https://calendar.google.com/calendar/render"
        params = {
            "action": "TEMPLATE",
            "text": f"🌴 {title}",
            "dates": f"{start_fmt}/{end_fmt}",
            "details": f"{description}\n\n(Lịch trình sinh tự động bởi HCMC AI Travel Planner - Nhắc nhở trước 30 phút)",
            "location": location,
            "add": ""
        }
        return f"{base_url}?{urllib.parse.urlencode(params)}"

    @classmethod
    def create_trip_calendar_links(cls, trip_title: str, activities: list, start_date: str = "2026-11-01") -> list:
        """
        Sinh danh sách link Google Calendar cho từng hoạt động trong chuyến đi
        """
        calendar_events = []
        for act in activities:
            day_num = act.get("day_number", 1)
            # Tính ngày theo day_num
            start_hour, start_min = act.get("start_time", "08:00").split(":")
            end_hour, end_min = act.get("end_time", "10:00").split(":")

            act_start = f"{start_date}T{start_hour}:{start_min}:00"
            act_end = f"{start_date}T{end_hour}:{end_min}:00"

            event_title = f"{act.get('place_name')} ({act.get('category')})"
            event_desc = f"Quận: {act.get('district')}\nĐịa chỉ: {act.get('address')}\nChi phí dự kiến: {act.get('cost_estimate', 0):,.0f} VNĐ\nPhương án dự phòng trời mưa: {act.get('contingency_indoor_place', 'N/A')}"
            
            cal_url = cls.generate_google_calendar_url(
                title=event_title,
                description=event_desc,
                location=act.get("address", "TP. Hồ Chí Minh"),
                start_iso=act_start,
                end_iso=act_end
            )

            calendar_events.append({
                "activity_name": act.get("place_name"),
                "time": f"{act.get('start_time')} - {act.get('end_time')}",
                "google_calendar_url": cal_url
            })
            
        return calendar_events
