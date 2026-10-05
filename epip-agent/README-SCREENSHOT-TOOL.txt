SANGRIA SCREENSHOT TOOL — SETUP GUIDE
=======================================

HOW TO USE:
-----------
1. Copy these 2 files to employee's computer (Desktop or any folder):
   - SangriaScreenshot.ps1
   - Start Sangria Screenshot.bat

2. Employee double-clicks "Start Sangria Screenshot.bat" 
   → Login prompt appears (username + password)
   → Screenshots start automatically after login

3. Tool runs in background (system tray) until midnight 11:58 PM
   → Next morning, double-click again to start

NO INSTALLATION REQUIRED — Just copy and run the .bat file.

NETWORK:
--------
Works on any network — WiFi, LAN, Ethernet, Mobile hotspot.
Server auto-discovered (localhost → LAN IPs scanned automatically).

CONFIG (optional):
------------------
Edit sangria-screenshot.config.json to change server URL:
{
  "serverUrl": "http://192.168.1.10:5000",
  "intervalMinutes": 10
}
