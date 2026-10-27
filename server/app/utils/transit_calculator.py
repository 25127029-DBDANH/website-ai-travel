import math

class TransitCalculator:
    AVERAGE_SPEED_KMH = {
        "Xe máy": 25.0,
        "Taxi/Grab": 20.0,
        "Đi bộ": 4.5,
        "Xe buýt": 18.0
    }
    
    RUSH_HOUR_SPEED_FACTOR = 0.55 # Giảm tốc độ giờ cao điểm 17h-19h (Yêu cầu 4)

    @staticmethod
    def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0 # Bán kính Trái Đất (km)
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
             math.sin(d_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(R * c, 2)

    @classmethod
    def estimate_travel_time_minutes(cls, lat1: float, lon1: float, lat2: float, lon2: float, 
                                     transport_mode: str = "Xe máy", is_rush_hour: bool = False) -> int:
        dist_km = cls.haversine_distance_km(lat1, lon1, lat2, lon2)
        speed = cls.AVERAGE_SPEED_KMH.get(transport_mode, 25.0)
        if is_rush_hour:
            speed *= cls.RUSH_HOUR_SPEED_FACTOR
        
        minutes = int((dist_km / speed) * 60) + 5 # Cộng 5 phút tìm bến/chờ xe
        return max(minutes, 10)
