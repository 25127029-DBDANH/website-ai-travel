from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
import uuid
import json
from datetime import datetime
from app.core.security import hash_password, verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.db.database import get_connection

router = APIRouter()

class RegisterInput(BaseModel):
    email: str
    password: str
    full_name: str

class LoginInput(BaseModel):
    email: str
    password: str

class PreferenceInput(BaseModel):
    favorite_districts: List[str]
    preferred_categories: List[str]
    budget_level: str
    transport_mode: str
    dietary_notes: Optional[str] = None

@router.post("/register")
async def register(user_in: RegisterInput):
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE email = ?", (user_in.email,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký tài khoản.")
        
    user_id = str(uuid.uuid4())
    pwd_hash = hash_password(user_in.password)
    now = datetime.utcnow().isoformat()
    avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={user_in.full_name}"

    cursor.execute("""
    INSERT INTO users (id, email, password_hash, full_name, avatar_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, user_in.email, pwd_hash, user_in.full_name, avatar_url, now))
    
    # Tạo sở thích mặc định ban đầu
    cursor.execute("""
    INSERT INTO user_preferences (user_id, favorite_districts, preferred_categories, budget_level, transport_mode, dietary_notes, ai_memory_notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, json.dumps(["Quận 1", "Quận 3"]), json.dumps(["Ẩm thực", "Cà phê"]), "Vừa phải", "Xe máy", "", "Khách du lịch mới", now))

    conn.commit()
    conn.close()

    token = create_access_token({"sub": user_id, "email": user_in.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "email": user_in.email,
            "full_name": user_in.full_name,
            "avatar_url": avatar_url
        }
    }

@router.post("/login")
async def login(user_in: LoginInput):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, password_hash, full_name, avatar_url FROM users WHERE email = ?", (user_in.email,))
    row = cursor.fetchone()
    conn.close()

    if not row or not verify_password(user_in.password, row["password_hash"]):
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu không chính xác.")

    token = create_access_token({"sub": row["id"], "email": row["email"]})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": row["id"],
            "email": row["email"],
            "full_name": row["full_name"],
            "avatar_url": row["avatar_url"]
        }
    }

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.get("/preferences")
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    """
    Yêu cầu 7: Lấy sở thích du lịch đã lưu để tự động điền trước (pre-fill) form cho Returning User
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_preferences WHERE user_id = ?", (current_user["id"],))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return {
            "has_history": False,
            "preferences": {
                "favorite_districts": ["Quận 1", "Quận 3"],
                "preferred_categories": ["Ẩm thực", "Di tích lịch sử", "Cà phê"],
                "budget_level": "Vừa phải",
                "transport_mode": "Xe máy",
                "dietary_notes": ""
            }
        }

    return {
        "has_history": True,
        "user_name": current_user["full_name"],
        "preferences": {
            "favorite_districts": json.loads(row["favorite_districts"]) if row["favorite_districts"] else ["Quận 1"],
            "preferred_categories": json.loads(row["preferred_categories"]) if row["preferred_categories"] else ["Ẩm thực"],
            "budget_level": row["budget_level"] or "Vừa phải",
            "transport_mode": row["transport_mode"] or "Xe máy",
            "dietary_notes": row["dietary_notes"] or ""
        }
    }

@router.put("/preferences")
async def update_user_preferences(pref_in: PreferenceInput, current_user: dict = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT OR REPLACE INTO user_preferences (user_id, favorite_districts, preferred_categories, budget_level, transport_mode, dietary_notes, ai_memory_notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        current_user["id"],
        json.dumps(pref_in.favorite_districts),
        json.dumps(pref_in.preferred_categories),
        pref_in.budget_level,
        pref_in.transport_mode,
        pref_in.dietary_notes,
        "Đã cập nhật theo yêu cầu người dùng",
        now
    ))
    conn.commit()
    conn.close()
    return {"message": "Đã lưu sở thích du lịch thành công!"}
