@echo off
title Sangria Screenshot Tool
cd /d "%~dp0"

echo === Sangria Screenshot Tool ===
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "%~dp0node_modules" (
    echo Installing dependencies...
    npm install
    echo.
)

:: Run the screenshot tool
echo Starting screenshot capture...
echo Press Ctrl+C to stop.
echo.
node "%~dp0screenshot.js"

pause
