@echo off
chcp 65001 > nul
cd /d "%~dp0client"
title FRONTEND - SAI GON GUIDE

where node > nul 2>&1
if errorlevel 1 (
    echo Node.js was not found. Install Node.js 22 or newer, then run this file again.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing frontend dependencies from package-lock.json...
    call npm ci
    if errorlevel 1 (
        echo Dependency installation failed.
        pause
        exit /b 1
    )
)

echo Frontend: http://localhost:5173
call npm run dev -- --host 0.0.0.0
pause
