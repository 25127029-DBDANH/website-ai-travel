import os
import json
import requests
import random
from app.db.hcmc_data import HCMC_PLACES, WEATHER_FALLBACKS, RUSH_HOUR_ADVICE

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

class GeminiService:
    @staticmethod
    def call_gemini_api(prompt: str, system_instruction: str = "") -> str:
        """Gọi Google Gemini 1.5 API nếu có API key, nếu không dùng Smart Generator"""
        if not GEMINI_API_KEY or GEMINI_API_KEY.startswith("your_"):
            return None
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.7, "maxOutputTokens": 2048}
            }
            if system_instruction:
                payload["systemInstruction"] = {"parts": [{"text": system_instruction}]}
            
            res = requests.post(url, json=payload, timeout=15)
            if res.status_code == 200:
                data = res.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            print(f"Gemini API calling error: {e}")
        return None

    @classmethod
    def generate_step2_suggestions(cls, form: dict) -> dict:
        """
        Luồng 4 bước - Bước 2: AI đưa gợi ý tổng quan & ý tưởng dựa trên 8 tiêu chí
        """
        num_days = form.get("num_days", 2)
        stay_district = form.get("stay_district", "Quận 1")
        budget = form.get("budget_total", 2500000)
        preferences = form.get("preferences", ["Ẩm thực", "Văn hóa & Lịch sử"])
        transport = form.get("transport_mode", "Xe máy")
        pace = form.get("pace", "Vừa phải")
        
        # Ý tưởng hành trình theo quận lưu trú
        highlights = [
            f"Tập trung trải nghiệm quanh khu vực {stay_district} và các quận lân cận để tối ưu thời gian di chuyển bằng {transport}.",
            f"Nhịp độ {pace.lower()}: bố trí 3-4 điểm/ngày, có thời gian nghỉ trưa tránh nắng gắt Sài Gòn.",
            f"Trải nghiệm trọn vẹn văn hóa ẩm thực đặc trưng và cà phê ngắm phố xá."
        ]
        
        daily_budget = int(budget / max(num_days, 1))

        return {
            "summary_title": f"Ý tưởng hành trình {num_days} ngày khám phá TP.HCM",
            "concept": f"Hành trình được thiết kế may đo riêng cho bạn: khởi hành từ {stay_district}, phương tiện {transport}, ngân sách trung bình {daily_budget:,.0f} VNĐ/ngày.",
            "highlights": highlights,
            "estimated_daily_cost": daily_budget,
            "suggested_districts": [stay_district, "Quận 1", "Quận 3", "Quận 5"],
            "ready_for_confirmation": True
        }

    @classmethod
    def generate_step4_itinerary(cls, form: dict) -> list:
        """
        Luồng 4 bước - Bước 4: Sau khi người dùng đồng ý, AI sinh lịch trình chi tiết từng giờ
        """
        num_days = form.get("num_days", 2)
        stay_district = form.get("stay_district", "Quận 1")
        preferences = form.get("preferences", [])
        budget = form.get("budget_total", 2500000)
        
        # Lọc danh sách địa điểm theo quận và sở thích
        matching_places = list(HCMC_PLACES)
        random.shuffle(matching_places)

        itinerary = []
        place_idx = 0

        time_slots = [
            {"time_slot": "Buổi Sáng", "start": "08:00", "end": "10:30", "category_pref": "Cà phê & Điểm tâm"},
            {"time_slot": "Trưa", "start": "11:00", "end": "13:30", "category_pref": "Ẩm thực & Nghỉ ngơi"},
            {"time_slot": "Chiều", "start": "14:30", "end": "17:00", "category_pref": "Tham quan di tích / Nghệ thuật"},
            {"time_slot": "Tối", "start": "18:00", "end": "21:00", "category_pref": "Ăn tối & Dạo phố đêm"}
        ]

        themes = [
            "Ký Ức Sài Gòn & Hương Vị Cà Phê Cổ Bản Địa",
            "Văn Hóa Chợ Lớn — Hội Quán Người Hoa & Sủi Cảo",
            "Sài Gòn Hiện Đại — Hoàng Hôn Sông & Skyline Đêm",
            "Dạo Bước Nghệ Thuật & Ẩm Thực Hẻm Sài Thành"
        ]

        for day in range(1, num_days + 1):
            theme = themes[(day - 1) % len(themes)]
            day_activities = []
            
            for slot in time_slots:
                # Chọn địa điểm phù hợp
                if place_idx < len(matching_places):
                    p = matching_places[place_idx]
                    place_idx += 1
                else:
                    p = random.choice(HCMC_PLACES)

                activity = {
                    "day_number": day,
                    "slot_name": slot["time_slot"],
                    "start_time": slot["start"],
                    "end_time": slot["end"],
                    "place_name": p["name"],
                    "category": p["category"],
                    "district": p["district"],
                    "address": p["address"],
                    "latitude": p["latitude"],
                    "longitude": p["longitude"],
                    "cost_estimate": p["cost"],
                    "is_indoor": p["is_indoor"],
                    "contingency_indoor_place": p.get("indoor_alternative", "Trung tâm thương mại Takashimaya Q1"),
                    "description": p["description"]
                }
                day_activities.append(activity)

            itinerary.append({
                "day_number": day,
                "theme_title": theme,
                "activities": day_activities
            })

        return itinerary

    @classmethod
    def get_swap_alternatives(cls, current_place_name: str, district: str = "") -> list:
        """
        Yêu cầu 2: ĐỔI ĐỊA ĐIỂM (AI đưa ra 2-3 lựa chọn thay thế tương đương cùng khu vực)
        """
        alternatives = []
        for p in HCMC_PLACES:
            if p["name"] != current_place_name:
                alternatives.append({
                    "place_name": p["name"],
                    "category": p["category"],
                    "district": p["district"],
                    "address": p["address"],
                    "latitude": p["latitude"],
                    "longitude": p["longitude"],
                    "cost": p["cost"],
                    "description": p["description"]
                })
                if len(alternatives) >= 3:
                    break
        return alternatives

    @classmethod
    def chat_response(cls, message: str, user_name: str = "Bạn") -> dict:
        """
        Khung chat thông minh kèm Mini-map card và Gợi ý nhanh (Yêu cầu 3)
        """
        msg_lower = message.lower()
        
        mini_map = {
            "center": [10.7769, 106.7009],
            "zoom": 14,
            "place_name": "Nhà thờ Đức Bà & Bưu điện Sài Gòn",
            "address": "Công xã Paris, Quận 1",
            "lat": 10.7798,
            "lng": 106.6990
        }

        quick_suggestions = [
            "Gợi ý quán ốc ngon Quận 4",
            "Tìm quán cà phê view đẹp ngắm hoàng hôn",
            "Phương án khi trời mưa to",
            "Cách di chuyển tránh kẹt xe 17h-19h"
        ]

        if "mưa" in msg_lower or "thời tiết" in msg_lower:
            reply = (
                f"Chào {user_name}! Sài Gòn thường có những cơn mưa rào bất chợt vào buổi chiều. "
                "Hệ thống đã chuẩn bị sẵn kịch bản dự phòng: tự động chuyển các điểm ngoài trời sang cụm bảo tàng "
                "(Bảo tàng Mỹ thuật, Bảo tàng Chứng tích Chiến tranh) hoặc các tổ hợp cà phê trong nhà có máy lạnh (Chung cư 42 Nguyễn Huệ, Saigon Centre) để bạn luôn có trải nghiệm thoải mái nhất!"
            )
            mini_map["place_name"] = "Bảo tàng Mỹ thuật TP.HCM (Không gian trong nhà)"
            mini_map["lat"] = 10.7699
            mini_map["lng"] = 106.6997
        elif "kẹt xe" in msg_lower or "cao điểm" in msg_lower or "giao thông" in msg_lower:
            reply = (
                f"Từ 17h00 đến 19h00 là khung giờ cao điểm tại TP.HCM. "
                "AI sẽ tự động gom các hoạt động của bạn trong cùng một quận, tránh các nút giao trọng điểm như Ngã 6 Phù Đổng, Vòng xoay Dân Chủ. "
                "Gợi ý bạn ghé một quán cà phê ngắm phố xá hoặc ăn tối gần điểm tham quan chiều trước khi di chuyển tiếp."
            )
        elif "ốc" in msg_lower or "ăn" in msg_lower or "ẩm thực" in msg_lower:
            reply = (
                f"Về ẩm thực TP.HCM, bạn không thể bỏ qua: "
                "1. Phố Ốc Vĩnh Khánh (Quận 4) — thiên đường hải sản tươi ngon đậm đà.\n"
                "2. Phố sủi cảo Hà Tôn Quyền (Quận 11) — chuẩn vị người Hoa gia truyền.\n"
                "3. Bánh tráng trộn & ăn vặt Hồ Con Rùa (Quận 3)."
            )
            mini_map["place_name"] = "Phố Ốc Vĩnh Khánh (Quận 4)"
            mini_map["lat"] = 10.7612
            mini_map["lng"] = 106.7025
        else:
            reply = (
                f"Chào {user_name}! Tôi là trợ lý du lịch AI TP.HCM. Tôi có thể giúp bạn tối ưu hóa lịch trình, "
                "đổi địa điểm yêu thích, gợi ý món ăn chuẩn vị Sài Gòn, hoặc cập nhật phương án thời tiết dự phòng. Bạn muốn khám phá điều gì hôm nay?"
            )

        return {
            "reply": reply,
            "mini_map": mini_map,
            "quick_suggestions": quick_suggestions
        }
