@echo off
chcp 65001 > nul
cd /d "%~dp0"
title DEMO WEB DU LICH TP.HCM - NHOM 7 (SAI GON GUIDE)

echo ============================================================
echo   KHOI DONG WEB AI LAP KE HOACH DU LICH TP.HCM - NHOM 7
echo ============================================================
echo.
echo [1] Giai phong cong 5173 neu co tien trinh cu...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo [2] Dang khoi dong may chu may tinh va mo Google Chrome...
echo     May tinh:      http://localhost:5173/trip/demo
echo     (Vui long GIU cua so nay trong khi xem demo)
echo ============================================================
echo.

cd client
py server.py
if %errorlevel% neq 0 (
    python server.py
)
pause
