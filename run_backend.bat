@echo off
chcp 65001 > nul
cd /d "%~dp0server"
title BACKEND - SAI GON GUIDE

where py > nul 2>&1
if errorlevel 1 (
    where python > nul 2>&1
    if errorlevel 1 (
        echo Python 3.12 or newer was not found. Install Python and run this file again.
        pause
        exit /b 1
    )
    set "PYTHON=python"
) else (
    set "PYTHON=py -3"
)

if not exist ".venv\Scripts\python.exe" (
    echo Creating the backend virtual environment...
    %PYTHON% -m venv .venv
    if errorlevel 1 (
        echo Virtual environment creation failed.
        pause
        exit /b 1
    )
)

call ".venv\Scripts\activate.bat"
echo Installing or updating backend dependencies...
python -m pip install -r requirements.txt
if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
)

echo API documentation: http://localhost:8000/docs
python -m uvicorn main:app --reload --port 8000
pause
