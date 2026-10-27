import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title="HCMC AI Travel Planner API",
    description="Backend API hệ thống gợi ý lịch trình du lịch TP.HCM sử dụng FastAPI & Google Gemini API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CLIENT_ORIGIN, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn toàn bộ API V1
app.include_router(api_router, prefix="/api/v1")

@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "HCMC AI Travel Planner API (Python FastAPI)",
        "version": "2.0.0",
        "ai_engine": "Google Gemini 1.5 Pro / Flash"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=(settings.ENVIRONMENT == "development"))
