@echo off
chcp 65001 > nul
cd /d "%~dp0"
title TOAN BO HE THONG - SAI GON GUIDE (NHOM 7)

echo ============================================================
echo   KHOI DONG FULLSTACK: BACKEND FASTAPI & FRONTEND CLIENT
echo ============================================================
start run_backend.bat
timeout /t 2 > nul
start run_frontend.bat
