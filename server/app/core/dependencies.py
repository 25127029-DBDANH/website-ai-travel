from fastapi import Header, HTTPException, status
from app.core.security import decode_access_token
from app.db.database import get_connection

async def get_current_user(authorization: str = Header(None)):
    """
    Yêu cầu 1 của giảng viên: BẮT BUỘC ĐĂNG NHẬP để dùng mọi tiện ích.
    Khách chưa có token sẽ bị từ chối với mã lỗi 401 Unauthorized.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Vui lòng đăng nhập để sử dụng tính năng tạo lịch trình, chat AI và lưu chuyến đi.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not authorization or not authorization.startswith("Bearer "):
        raise credentials_exception
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise credentials_exception
    
    user_id = payload["sub"]
    
    # Kiểm tra user trong database
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, full_name, avatar_url FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise credentials_exception
        
    return {
        "id": row["id"],
        "email": row["email"],
        "full_name": row["full_name"],
        "avatar_url": row["avatar_url"]
    }
