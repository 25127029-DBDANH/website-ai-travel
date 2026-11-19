@echo off
chcp 65001 > nul
cd /d "%~dp0"
title DEMO - SAI GON GUIDE

echo ============================================================
echo   SAI GON GUIDE - LOCAL DEMO
echo ============================================================
echo Browser URL: http://localhost:5173/trip/demo
echo This script will not terminate an existing process.
echo Close this window to stop the demo server.
echo ============================================================
echo.

where py > nul 2>&1
if not errorlevel 1 (
    py -3 client\server.py
) else (
    where python > nul 2>&1
    if errorlevel 1 (
        echo Python 3 was not found. Install Python 3 and run this file again.
        pause
        exit /b 1
    )
    python client\server.py
)

if errorlevel 1 echo Demo server exited. Check whether port 5173 is already in use.
pause
