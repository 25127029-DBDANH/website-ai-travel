@echo off
setlocal
cd /d "%~dp0FE"

if not exist package.json (
  echo Cannot find the project in "%~dp0FE".
  pause
  exit /b 1
)

if not exist node_modules\vite\bin\vite.js (
  echo Installing project dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

call npm run dev -- --host 127.0.0.1
pause
