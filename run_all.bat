@echo off
title HCMC AI Travel Planner - Khoi Chay Toan Bo
echo ===================================================================
echo   KHOI CHAY TOAN BO HE THONG HCMC AI TRAVEL PLANNER (FULL-STACK)
echo ===================================================================
echo.
echo Dang khoi dong Backend Python FastAPI (Port 8000)...
start "HCMC Backend API (FastAPI)" cmd /k "cd server && py main.py"

echo Cho 3 giay de server Backend san sang...
timeout /t 3 /nobreak >nul

echo Dang khoi dong Frontend React 18 + Vite (Port 5173)...
start "HCMC Frontend App (Vite)" cmd /k "cd client && npm.cmd run dev"

echo.
echo ===================================================================
echo   HE THONG DA KHOI CHAY THANH CONG!
echo.
echo   * Frontend Web App:     http://localhost:5173
echo   * Backend REST API:     http://localhost:8000
echo   * Swagger API Docs:     http://localhost:8000/docs
echo   * Tai khoan thu nghiem: test@example.com / password123
echo ===================================================================
pause
