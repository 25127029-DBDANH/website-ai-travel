from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.services.places_service import PlacesService

router = APIRouter()

@router.get("/search")
async def search_places(q: str, district: str = "Quận 1", current_user: dict = Depends(get_current_user)):
    """Tìm kiếm địa điểm trên bản đồ tương tác (Yêu cầu 3)"""
    return await PlacesService.search_places(query=q, district=district)
