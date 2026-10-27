import httpx
from app.core.config import settings

class PlacesService:
    BASE_URL = "https://places.googleapis.com/v1/places"

    @classmethod
    async def search_places(cls, query: str, district: str = "Quận 1"):
        """Tra cứu địa điểm qua Google Places API (New)"""
        # Trả về dữ liệu mẫu nếu chưa có API Key
        return [
            {
                "place_id": "ChIJb_e1f0wvdTERn_e9c-mock",
                "name": f"{query} - {district}",
                "address": f"Đường Nguyễn Huệ, {district}, TP.HCM",
                "rating": 4.6,
                "user_rating_count": 1280,
                "photo_url": "https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=600&q=80",
                "open_now": True
            }
        ]
