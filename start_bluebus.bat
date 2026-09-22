@echo off
title Blue Bus Platform Runner
echo =======================================================
echo          BLUE BUS - REDBUS CLONE PLATFORM
echo =======================================================
echo.
echo Starting Backend API on http://localhost:8080 ...
start "Blue Bus Backend (FastAPI)" cmd /k "cd /d %~dp0 && python run_backend.py"

timeout /t 2 /nobreak >nul

echo Starting Frontend Web App on http://localhost:3000 ...
start "Blue Bus Frontend (Vite React)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo Blue Bus is up and running!
echo - Web App:    http://localhost:3000
echo - API Docs:   http://localhost:8080/docs
echo =======================================================
pause
