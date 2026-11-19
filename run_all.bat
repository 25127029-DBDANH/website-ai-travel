@echo off
chcp 65001 > nul
cd /d "%~dp0"
title SAI GON GUIDE - FULL STACK

echo Starting backend and frontend in separate windows.
echo Backend:  http://localhost:8000/docs
echo Frontend: http://localhost:5173
echo.

start "Sai Gon Guide Backend" cmd /k ""%~dp0run_backend.bat""
start "Sai Gon Guide Frontend" cmd /k ""%~dp0run_frontend.bat""
timeout /t 3 /nobreak > nul
start "" "http://localhost:5173"
