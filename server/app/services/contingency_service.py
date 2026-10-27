class ContingencyService:
    """Xử lý rủi ro & Kịch bản dự phòng theo Yêu cầu 4 của giảng viên"""

    INDOOR_ALTERNATIVES = {
        "Quận 1": ["Bảo tàng Mỹ thuật TP.HCM", "Saigon Centre / Takashimaya", "Bưu điện Trung tâm"],
        "Quận 3": ["Bảo tàng Chứng tích Chiến tranh", "Hồ Con Rùa cafe trong nhà"],
        "Quận 5": ["Chợ An Đông (khu mua sắm trong nhà)", "The Garden Mall"]
    }

    @classmethod
    def get_rain_alternative(cls, district: str, outdoor_place: str) -> str:
        options = cls.INDOOR_ALTERNATIVES.get(district, ["Trung tâm thương mại Takashimaya"])
        return options[0]

    @classmethod
    def handle_rush_hour(cls, hour: int, route_activities: list):
        """17h - 19h: Giờ cao điểm TP.HCM, gom cụm địa điểm cùng quận"""
        if 17 <= hour <= 19:
            return {"strategy": "CLUSTERING_NEARBY", "warning": "Giờ cao điểm TP.HCM: Hạn chế di chuyển qua các trục đường CMT8, Cộng Hòa"}
        return {"strategy": "NORMAL"}
