@echo off
chcp 65001 > nul
cd /d "%~dp0\server"
title BACKEND FASTAPI - SAI GON GUIDE
echo [BACKEND] Dang khoi chay FastAPI Server tai http://localhost:8000/docs...
uvicorn main:app --reload --port 8000 || py -m uvicorn main:app --reload --port 8000 || python -m uvicorn main:app --reload --port 8000
pause
