import json
from app.core.config import settings

class GeminiService:
    SYSTEM_INSTRUCTION = """
    Bạn là AI Chuyên Gia Du Lịch TP. Hồ Chí Minh (HCMC Travel Expert), am hiểu sâu sắc về:
    - Địa lý, phân chia các quận (Quận 1, 3, 5, Thủ Đức, Bình Thạnh...)
    - Các địa điểm ẩm thực, văn hóa, lịch sử và giải trí nổi tiếng của Sài Gòn.
    - Thời gian di chuyển thực tế và kẹt xe giờ cao điểm (17h - 19h).
    - Phương án thời tiết dự phòng (mưa chiều Sài Gòn).
    Luôn trả về phản hồi khách quan, chuẩn xác, ưu tiên định dạng JSON cấu trúc rõ ràng.
    """

    @classmethod
    async def generate_overview_suggestions(cls, form_data: dict) -> dict:
        """Bước 2: Gợi ý tổng quan dựa trên 8 tiêu chí"""
        return {
            "summary": f"Kế hoạch {form_data.get('num_days')} ngày tại TP.HCM tập trung quanh {form_data.get('stay_district')}",
            "highlights": [
                "Khám phá di sản kiến trúc & lịch sử trung tâm Sài Gòn",
                "Tour ẩm thực Chợ Lớn (Quận 5) chuẩn vị người Hoa",
                "Ngắm hoàng hôn bến Bạch Đằng và cafe ven sông Sài Gòn"
            ],
            "estimated_daily_cost": form_data.get("budget_total", 2000000) / max(form_data.get("num_days", 1), 1)
        }

    @classmethod
    async def generate_detailed_itinerary(cls, trip_id: str, form_data: dict) -> dict:
        """Bước 4: Sinh lịch trình chi tiết từng ngày và giờ"""
        return {
            "trip_id": trip_id,
            "title": f"Hành trình {form_data.get('num_days', 3)} ngày khám phá TP.HCM",
            "days": [
                {
                    "day_number": 1,
                    "date": "2026-11-01",
                    "theme": "Ký Ức Sài Gòn & Cà Phê Vợt",
                    "activities": [
                        {
                            "time": "08:00 - 09:30",
                            "place_name": "Cà phê Vợt Phan Đình Phùng",
                            "district": "Quận Phú Nhuận",
                            "category": "Ăn uống",
                            "contingency_rain": "Workshop gốm trong nhà Quận 3"
                        },
                        {
                            "time": "10:00 - 12:00",
                            "place_name": "Dinh Độc Lập",
                            "district": "Quận 1",
                            "category": "Tham quan di tích",
                            "contingency_rain": "Bảo tàng Mỹ thuật TP.HCM"
                        }
                    ]
                }
            ]
        }
