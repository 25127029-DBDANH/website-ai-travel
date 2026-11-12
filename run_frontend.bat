@echo off
chcp 65001 > nul
cd /d "%~dp0\client"
title FRONTEND - SAI GON GUIDE
echo [FRONTEND] Dang khoi chay may chu Frontend...
if exist "node_modules" (
    npm run dev
) else (
    echo Khong tim thay node_modules, dang chay server demo tinh...
    py server.py || python server.py
)
pause
