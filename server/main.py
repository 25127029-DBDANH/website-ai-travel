import uvicorn
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import init_db
from app.api.v1.api import api_router

# Khởi tạo cơ sở dữ liệu SQLite và tài khoản test
init_db()

app = FastAPI(
    title="🌴 HCMC AI Travel Planner API",
    description="Backend API hệ thống gợi ý lịch trình du lịch TP.HCM sử dụng Python FastAPI & Google Gemini API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Cấu hình CORS để Frontend (port 5173) gọi được toàn bộ endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn toàn bộ router V1
app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "HCMC AI Travel Planner API (Python FastAPI)",
        "database": "SQLite / PostgreSQL Ready",
        "version": "2.0.0"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"[SERVER] Backend running at: http://localhost:{port}")
    print(f"[SERVER] Swagger API Docs at: http://localhost:{port}/docs")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
