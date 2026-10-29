> [!NOTE]
> **Tài liệu chuẩn hóa v3:** Tuân thủ 100% 7 yêu cầu mới của giảng viên (Bắt buộc đăng nhập, Form 8 tiêu chí + Luồng 4 bước, Bản đồ tương tác, Kịch bản dự phòng mưa/kẹt xe, My Trips & Đánh giá AI, Đồng bộ Google Calendar 30m, Cá nhân hóa người dùng quay lại & Bỏ hoàn toàn persona).

### 12.2. File `server/app/utils/transit_calculator.py` (Toán học Haversine & Ước tính thời gian di chuyển TP.HCM)

```python
import math
from typing import Optional, Dict, Any

EARTH_RADIUS_KM = 6371.0
HCMC_ROAD_FACTOR = 1.3  # Hệ số đường thực tế nội đô TP.HCM so với đường chim bay

def to_rad(deg: float) -> float:
    return (deg * math.pi) / 180.0

def calculate_transit(from_lat: float, from_lng: float, to_lat: float, to_lng: float) -> Optional[Dict[str, Any]]:
    if None in (from_lat, from_lng, to_lat, to_lng):
        return None

    d_lat = to_rad(to_lat - from_lat)
    d_lng = to_rad(to_lng - from_lng)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(to_rad(from_lat)) * math.cos(to_rad(to_lat)) * math.sin(d_lng / 2) ** 2)

    straight_distance_km = 2 * EARTH_RADIUS_KM * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    road_distance_km = round(straight_distance_km * HCMC_ROAD_FACTOR, 2)

    # Khoảng cách <= 800m: Gợi ý đi bộ (~5 km/h)
    if road_distance_km <= 0.8:
        walk_minutes = max(2, round((road_distance_km / 5.0) * 60))
        return {
            "mode": "walk",
            "distance_km": road_distance_km,
            "duration_min": walk_minutes,
            "estimated_fare_vnd": 0,
            "label": f"🚶 {walk_minutes} min walk ({int(road_distance_km * 1000)}m)"
        }

    # Khoảng cách > 800m: Ước tính phương tiện nội đô (~20 km/h, mở cửa 2km đầu 18,000đ + 5,500đ/km tiếp theo)
    ride_minutes = max(5, round((road_distance_km / 20.0) * 60))
    raw_fare = 18000 + max(0.0, road_distance_km - 2) * 5500
    rounded_fare = int(math.ceil(raw_fare / 5000.0) * 5000)

    return {
        "mode": "ride",
        "distance_km": road_distance_km,
        "duration_min": ride_minutes,
        "estimated_fare_vnd": rounded_fare,
        "label": f"🚕 {ride_minutes} min ride (~₫{rounded_fare:,})"
    }
```
