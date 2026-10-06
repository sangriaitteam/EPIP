@echo off
title Sangria Screenshot Tool
cd /d "%~dp0"

echo ================================================
echo    Sangria Screenshot Tool - Sangria Edutainment
echo ================================================
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
    call npm install
    echo.
)

:: Check for saved token
node -e "try{const d=require('fs').readFileSync(require('os').tmpdir()+'\\sangria-token.json','utf8');const t=JSON.parse(d);if(Date.now()-t.savedAt<7*24*60*60*1000){process.stdout.write('FOUND');}else{process.stdout.write('EXPIRED');}}catch(e){process.stdout.write('NONE');}" > "%TEMP%\sgt_status.txt" 2>nul
set /p TSTATUS=<"%TEMP%\sgt_status.txt"
del "%TEMP%\sgt_status.txt" 2>nul

if "%TSTATUS%"=="FOUND" (
    echo Saved session found. Starting...
    echo Press Ctrl+C to stop.
    echo.
    node "%~dp0screenshot.js"
    pause
    exit /b 0
)

:: Check for token.txt file in same folder
if exist "%~dp0token.txt" (
    echo Found token.txt. Using saved token...
    node "%~dp0screenshot.js" --tokenfile "%~dp0token.txt"
    pause
    exit /b 0
)

:: No token — guide user
echo No saved session found.
echo.
echo STEPS TO START:
echo.
echo   1. Open EPIP website in Chrome
echo   2. Login as Employee
echo   3. Press F12 - go to Application - Local Storage
echo   4. Find 'epip_token' - copy the full value
echo   5. Open Notepad, paste the token, save as:
echo.
echo      %~dp0token.txt
echo.
echo   6. Run this bat file again
echo.
pause
