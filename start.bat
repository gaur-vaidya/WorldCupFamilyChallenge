@echo off
title World Cup Family Challenge
echo.
echo  Starting World Cup Family Challenge...
echo.

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
  echo  ERROR: Node.js is not installed.
  echo  Download it from https://nodejs.org
  pause
  exit /b
)

:: Start server in background
start /b node "%~dp0server.js"

:: Wait for it to be ready
timeout /t 2 /nobreak >nul

:: Open browser
start http://localhost:8080

echo  Server is running. Close this window to stop.
echo.
node "%~dp0server.js"
