@echo off
title Sangria Screenshot Tool
cd /d "%~dp0"

echo ================================================
echo    Sangria Screenshot Tool — Sangria Edutainment
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
node -e "try{const d=require('fs').readFileSync(require('os').tmpdir()+'\\sangria-token.json','utf8');const t=JSON.parse(d);if(Date.now()-t.savedAt<7*24*60*60*1000){console.log('TOKEN_FOUND:'+t.user.name||'Employee');}else{console.log('TOKEN_EXPIRED');}}catch(e){console.log('NO_TOKEN');}" > "%TEMP%\sgt_check.txt" 2>&1
set /p TOKEN_STATUS=<"%TEMP%\sgt_check.txt"
del "%TEMP%\sgt_check.txt" 2>nul

if "%TOKEN_STATUS:~0,11%"=="TOKEN_FOUND:" (
    echo Logged in as: %TOKEN_STATUS:~12%
    echo Starting screenshot capture...
    echo Press Ctrl+C to stop.
    echo.
    node "%~dp0screenshot.js"
    pause
    exit /b 0
)

:: No saved token — ask user
echo No saved session found.
echo.
echo To get your token:
echo   1. Open EPIP website in Chrome
echo   2. Login as Employee
echo   3. Press F12 ^(DevTools^)
echo   4. Go to: Application ^> Local Storage ^> epip_token
echo   5. Copy the token value
echo.
set /p USER_TOKEN=Paste your token here: 

if "%USER_TOKEN%"=="" (
    echo No token entered. Exiting.
    pause
    exit /b 1
)

echo.
echo Starting screenshot capture...
echo Press Ctrl+C to stop.
echo.
node "%~dp0screenshot.js" --token "%USER_TOKEN%"
pause
