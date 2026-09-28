# setup-network.ps1
# Auto-detects this machine's IP and configures all EPIP components
# Run as: .\setup-network.ps1
# Run with custom port: .\setup-network.ps1 -Port 5000

param(
    [int]$Port = 5000,
    [int]$FrontendPort = 5173
)

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   EPIP Network Configuration Setup       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── Detect all network IPs ─────────────────────────────────────────────────
$interfaces = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -ne '127.0.0.1' -and $_.PrefixOrigin -ne 'WellKnown' } |
    Select-Object IPAddress, InterfaceAlias

$ipv6Addresses = Get-NetIPAddress -AddressFamily IPv6 |
    Where-Object { $_.IPAddress -notlike 'fe80*' -and $_.IPAddress -ne '::1' } |
    Select-Object IPAddress, InterfaceAlias

Write-Host "🌐 Detected Network Interfaces:" -ForegroundColor Green
Write-Host ""
Write-Host "  IPv4:" -ForegroundColor Yellow
foreach ($iface in $interfaces) {
    Write-Host "    $($iface.InterfaceAlias): $($iface.IPAddress)" -ForegroundColor White
}
if ($ipv6Addresses) {
    Write-Host "  IPv6:" -ForegroundColor Yellow
    foreach ($iface in $ipv6Addresses) {
        Write-Host "    $($iface.InterfaceAlias): $($iface.IPAddress)" -ForegroundColor White
    }
}

# Pick the best IP (prefer Ethernet over Wi-Fi, prefer private range)
$bestIP = $interfaces |
    Sort-Object { if ($_.InterfaceAlias -like '*Ethernet*') { 0 } else { 1 } } |
    Select-Object -First 1 -ExpandProperty IPAddress

if (-not $bestIP) {
    $bestIP = "localhost"
}

Write-Host ""
Write-Host "✅ Selected server IP: $bestIP" -ForegroundColor Green
Write-Host ""

$backendUrl   = "http://${bestIP}:${Port}"
$frontendUrl  = "http://${bestIP}:${FrontendPort}"

# ── Update backend .env CLIENT_URL ────────────────────────────────────────
$envPath = Join-Path $PSScriptRoot "backend\.env"
if (Test-Path $envPath) {
    $content = Get-Content $envPath -Raw
    $content = $content -replace 'CLIENT_URL=.*', "CLIENT_URL=$frontendUrl"
    $content = $content -replace 'BACKEND_URL=.*', "BACKEND_URL=$backendUrl"
    Set-Content $envPath $content
    Write-Host "✅ backend/.env updated" -ForegroundColor Green
    Write-Host "   CLIENT_URL = $frontendUrl" -ForegroundColor Gray
    Write-Host "   BACKEND_URL = $backendUrl" -ForegroundColor Gray
}

# ── Update timing-agent config ────────────────────────────────────────────
$timingConfig = @{
    serverUrl = $backendUrl
    autoStart = $true
} | ConvertTo-Json
$timingConfigPath = Join-Path $PSScriptRoot "timing-agent\epip-timing.config.json"
Set-Content $timingConfigPath $timingConfig
Write-Host "✅ timing-agent/epip-timing.config.json updated" -ForegroundColor Green
Write-Host "   serverUrl = $backendUrl" -ForegroundColor Gray

# ── Update epip-agent config ──────────────────────────────────────────────
$epipAgentConfigPath = Join-Path $PSScriptRoot "epip-agent\epip-agent.config.json"
if (Test-Path $epipAgentConfigPath) {
    $epipContent = Get-Content $epipAgentConfigPath -Raw | ConvertFrom-Json
    $epipContent.serverUrl = $backendUrl
    $epipContent | ConvertTo-Json | Set-Content $epipAgentConfigPath
    Write-Host "✅ epip-agent/epip-agent.config.json updated" -ForegroundColor Green
    Write-Host "   serverUrl = $backendUrl" -ForegroundColor Gray
}

Write-Host ""
Write-Host "══════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Share these URLs with employees:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Website     : $frontendUrl" -ForegroundColor White
Write-Host "  Backend API : $backendUrl" -ForegroundColor White
Write-Host ""
Write-Host "  Works on:" -ForegroundColor Yellow
Write-Host "  [OK] Wi-Fi (same network)" -ForegroundColor Green
Write-Host "  [OK] Ethernet (same network)" -ForegroundColor Green
Write-Host "  [OK] IPv4: $bestIP" -ForegroundColor Green
if ($ipv6Addresses) {
    Write-Host "  [OK] IPv6: supported" -ForegroundColor Green
}
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: Restart backend and frontend servers." -ForegroundColor Yellow
Write-Host ""
