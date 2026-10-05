# SangriaScreenshot.ps1 - Sangria Screenshot Tool
# Compatible with Windows PowerShell 5.1+
# Double-click "Start Sangria Screenshot.bat" to run

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ConfigFile = Join-Path $PSScriptRoot "sangria-screenshot.config.json"
$StateFile  = Join-Path $env:APPDATA "sangria-screenshot-state.json"

# ── Helpers ───────────────────────────────────────────────────────────────────
function Get-Config {
    $cfg = @{ serverUrl = "http://localhost:5000"; intervalMinutes = 10 }
    if (Test-Path $ConfigFile) {
        try {
            $j = Get-Content $ConfigFile -Raw | ConvertFrom-Json
            if ($j.serverUrl)        { $cfg.serverUrl        = $j.serverUrl }
            if ($j.intervalMinutes)  { $cfg.intervalMinutes  = $j.intervalMinutes }
        } catch {}
    }
    return $cfg
}

function Save-State($tok, $usr) {
    @{ token = $tok; userName = $usr } | ConvertTo-Json | Set-Content $StateFile -Encoding UTF8
}

function Load-State {
    if (Test-Path $StateFile) {
        try { return Get-Content $StateFile -Raw | ConvertFrom-Json } catch {}
    }
    return $null
}

function Clear-State { Remove-Item $StateFile -ErrorAction SilentlyContinue }

# ── Server discovery ──────────────────────────────────────────────────────────
function Find-Server($base) {
    $candidates = @($base, "http://localhost:5000", "http://127.0.0.1:5000")
    try {
        $ips = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object { $_.IPAddress -notmatch "^127\." -and $_.PrefixOrigin -ne "WellKnown" }).IPAddress
        foreach ($ip in $ips) { $candidates += "http://${ip}:5000" }
    } catch {}

    foreach ($url in ($candidates | Select-Object -Unique)) {
        try {
            $r = Invoke-RestMethod -Uri "$url/health" -TimeoutSec 2 -ErrorAction Stop
            if ($r.service -eq "EPIP Backend API") {
                Write-Host "[config] Server: $url"
                return $url
            }
        } catch {}
    }
    return $base
}

# ── API calls ─────────────────────────────────────────────────────────────────
function Get-Interval($url, $tok) {
    try {
        $r = Invoke-RestMethod -Uri "$url/api/attendance/agent-config" `
            -Headers @{ Authorization = "Bearer $tok" } -TimeoutSec 5 -ErrorAction Stop
        if ($r.data.interval_minutes) { return [int]$r.data.interval_minutes }
        return 10
    } catch { return 10 }
}

function Test-Token($url, $tok) {
    try {
        $r = Invoke-RestMethod -Uri "$url/api/auth/me" `
            -Headers @{ Authorization = "Bearer $tok" } -TimeoutSec 5 -ErrorAction Stop
        return ($r.success -eq $true)
    } catch { return $false }
}

function Login-Manual($url) {
    Add-Type -AssemblyName Microsoft.VisualBasic -ErrorAction SilentlyContinue

    # Username input
    $uForm = New-Object System.Windows.Forms.Form
    $uForm.Text = "Sangria Screenshot - Login"
    $uForm.Size = New-Object System.Drawing.Size(320, 160)
    $uForm.StartPosition = "CenterScreen"
    $uForm.TopMost = $true
    $uForm.FormBorderStyle = "FixedDialog"
    $uForm.MaximizeBox = $false

    $lbl1 = New-Object System.Windows.Forms.Label
    $lbl1.Text = "Username:"; $lbl1.Location = "10,20"; $lbl1.Size = "80,20"
    $txt1 = New-Object System.Windows.Forms.TextBox
    $txt1.Location = "100,18"; $txt1.Size = "190,22"

    $lbl2 = New-Object System.Windows.Forms.Label
    $lbl2.Text = "Password:"; $lbl2.Location = "10,55"; $lbl2.Size = "80,20"
    $txt2 = New-Object System.Windows.Forms.TextBox
    $txt2.PasswordChar = "*"; $txt2.Location = "100,53"; $txt2.Size = "190,22"

    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = "Login"; $btn.Location = "110,90"; $btn.Size = "90,28"
    $btn.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $uForm.AcceptButton = $btn

    $uForm.Controls.AddRange(@($lbl1, $txt1, $lbl2, $txt2, $btn))

    if ($uForm.ShowDialog() -ne "OK") { $uForm.Dispose(); return $null, $null }
    $username = $txt1.Text.Trim()
    $password = $txt2.Text
    $uForm.Dispose()

    if (-not $username -or -not $password) { return $null, $null }

    try {
        $body = @{ username = $username; password = $password; expectedRole = "employee" } | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$url/api/auth/login" -Method POST `
            -Body $body -ContentType "application/json" -TimeoutSec 10 -ErrorAction Stop
        if ($r.success) {
            return $r.data.token, $r.data.user.name
        }
        [System.Windows.Forms.MessageBox]::Show("Login failed: $($r.message)", "Error")
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Error: $($_.Exception.Message)", "Error")
    }
    return $null, $null
}

# ── Screenshot capture ────────────────────────────────────────────────────────
function Take-Screenshot($url, $tok) {
    try {
        $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
        $bmp    = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
        $g      = [System.Drawing.Graphics]::FromImage($bmp)
        $g.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)

        $tmp = Join-Path $env:TEMP ("sc-" + (Get-Date -Format "yyyyMMddHHmmss") + ".png")
        $bmp.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose(); $bmp.Dispose()

        # Active window title
        $winTitle = "Screen Capture"
        try {
            Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class WinApi2 {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
    public static string Title() {
        var sb = new StringBuilder(256);
        GetWindowText(GetForegroundWindow(), sb, 256);
        return sb.ToString();
    }
}
"@ -ErrorAction SilentlyContinue
            $t = [WinApi2]::Title()
            if ($t) { $winTitle = $t }
        } catch {}

        # Upload using curl.exe (built into Windows 10+)
        $result = & curl.exe -s -o - -X POST `
            -H "Authorization: Bearer $tok" `
            -F "screenshot=@${tmp};type=image/png" `
            -F "active_window_title=$winTitle" `
            -F "captured_at=$(Get-Date -Format 'o')" `
            "$url/api/screenshots/my" 2>&1

        Remove-Item $tmp -ErrorAction SilentlyContinue

        if ($result -match '"success":true') {
            Write-Host ("[" + (Get-Date -Format "HH:mm:ss") + "] Captured: $winTitle")
            return $true
        } else {
            Write-Host ("[" + (Get-Date -Format "HH:mm:ss") + "] Upload failed: $result")
            return $false
        }
    } catch {
        Write-Host "[capture] Error: $($_.Exception.Message)"
        return $false
    }
}

# ── MAIN ──────────────────────────────────────────────────────────────────────
Write-Host "=== Sangria Screenshot Tool ==="

$cfg       = Get-Config
$serverUrl = Find-Server $cfg.serverUrl
$token     = ""
$userName  = "Employee"

# Restore saved session
$state = Load-State
if ($state -and $state.token) {
    Write-Host "Checking saved session..."
    if (Test-Token $serverUrl $state.token) {
        $token    = $state.token
        $userName = if ($state.userName) { $state.userName } else { "Employee" }
        Write-Host "Session restored for: $userName"
    } else {
        Write-Host "Session expired - please login again"
        Clear-State
    }
}

# Login if needed
if (-not $token) {
    $token, $userName = Login-Manual $serverUrl
    if (-not $token) { Write-Host "Login cancelled."; exit 0 }
    if (-not $userName) { $userName = "Employee" }
    Save-State $token $userName
    Write-Host "Logged in as: $userName"
}

$intervalMins = Get-Interval $serverUrl $token
Write-Host "Interval: $intervalMins minutes"
Write-Host "Press Ctrl+C to stop"

# Tray icon
$tray = New-Object System.Windows.Forms.NotifyIcon
$tray.Icon = [System.Drawing.SystemIcons]::Application
$tray.Visible = $true
$tray.Text = "Sangria Screenshot - Running"
$tray.BalloonTipTitle = "Sangria Screenshot"
$tray.BalloonTipText  = "Screenshots started for $userName"
$tray.ShowBalloonTip(3000)

$captureCount = 0
$intervalSecs = $intervalMins * 60
$lastCapture  = [DateTime]::MinValue
$lastCheck    = Get-Date

# First capture immediately
Write-Host "Taking first screenshot..."
$ok = Take-Screenshot $serverUrl $token
if ($ok) { $captureCount++; $lastCapture = Get-Date }

# Main loop
while ($true) {
    $now = Get-Date

    # Midnight stop at 23:58
    if ($now.Hour -eq 23 -and $now.Minute -ge 58) {
        Write-Host "Midnight - stopping"
        Clear-State
        $tray.BalloonTipText = "Midnight - session ended. Run again tomorrow."
        $tray.ShowBalloonTip(5000)
        Start-Sleep -Seconds 5
        $tray.Visible = $false
        exit 0
    }

    # Check interval change every 30s
    if (($now - $lastCheck).TotalSeconds -ge 30) {
        $newMins = Get-Interval $serverUrl $token
        if ($newMins -ne $intervalMins) {
            Write-Host "Interval changed: $intervalMins -> $newMins min"
            $intervalMins = $newMins
            $intervalSecs = $newMins * 60
        }
        $lastCheck = $now
    }

    # Capture on interval
    if (($now - $lastCapture).TotalSeconds -ge $intervalSecs) {
        Write-Host ("Capturing... [" + (Get-Date -Format "HH:mm") + "]")
        $ok = Take-Screenshot $serverUrl $token
        if ($ok) {
            $captureCount++
            $lastCapture = $now
            $tray.Text = "Sangria - $captureCount captures today"
        }
    }

    Start-Sleep -Seconds 10
}
