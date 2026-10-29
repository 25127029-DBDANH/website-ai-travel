import hashlib
import hmac
import base64
import json
import time
from typing import Optional, Dict, Any

SECRET_KEY = "hcmc_ai_travel_super_secret_jwt_key_2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = 86400 * 7 # 7 days

def hash_password(password: str) -> str:
    """Băm mật khẩu sử dụng SHA256 kèm muối an toàn"""
    salt = "hcmc_travel_salt_"
    return hashlib.sha256((salt + password).encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')

def _base64url_decode(data_str: str) -> bytes:
    padding = '=' * (4 - (len(data_str) % 4))
    return base64.urlsafe_b64decode((data_str + padding).encode('utf-8'))

def create_access_token(data: Dict[str, Any], expires_delta: Optional[int] = None) -> str:
    """Tạo JWT token chuẩn RFC 7519 không cần thư viện ngoài C-extension"""
    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = data.copy()
    expire_time = int(time.time()) + (expires_delta if expires_delta else ACCESS_TOKEN_EXPIRE_SECONDS)
    payload["exp"] = expire_time
    payload["iat"] = int(time.time())

    header_b64 = _base64url_encode(json.dumps(header, separators=(',', ':')).encode('utf-8'))
    payload_b64 = _base64url_encode(json.dumps(payload, separators=(',', ':')).encode('utf-8'))

    signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
    signature_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Giải mã và xác thực chữ ký JWT token"""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        
        header_b64, payload_b64, signature_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode('utf-8')
        expected_signature = hmac.new(SECRET_KEY.encode('utf-8'), signing_input, hashlib.sha256).digest()
        actual_signature = _base64url_decode(signature_b64)

        if not hmac.compare_digest(expected_signature, actual_signature):
            return None

        payload_bytes = _base64url_decode(payload_b64)
        payload = json.loads(payload_bytes.decode('utf-8'))

        # Kiểm tra hạn sử dụng
        if payload.get("exp", 0) < int(time.time()):
            return None

        return payload
    except Exception:
        return None
