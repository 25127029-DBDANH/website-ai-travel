from fastapi import APIRouter, Depends
from typing import Optional
from app.core.dependencies import get_current_user
from app.db.hcmc_data import HCMC_PLACES

router = APIRouter()

@router.get("/search")
async def search_places(q: Optional[str] = "", district: Optional[str] = "", current_user: dict = Depends(get_current_user)):
    """
    Yêu cầu 3: Khám phá địa điểm trên bản đồ tương tác
    """
    results = []
    q_lower = q.lower().strip() if q else ""
    dist_lower = district.lower().strip() if district else ""

    for p in HCMC_PLACES:
        match_q = not q_lower or (q_lower in p["name"].lower() or q_lower in p["category"].lower() or q_lower in p["address"].lower())
        match_dist = not dist_lower or dist_lower in p["district"].lower()
        if match_q and match_dist:
            results.append(p)

    return results
