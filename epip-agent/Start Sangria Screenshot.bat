@echo off
:: Sangria Screenshot Tool
:: Double-click this to start screenshot capture
cd /d "%~dp0"

:: Run PowerShell script in a minimized window so it doesn't appear in screenshots
start /MIN "Sangria Screenshot" PowerShell -NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "%~dp0SangriaScreenshot.ps1"
