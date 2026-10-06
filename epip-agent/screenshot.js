// screenshot.js — Sangria Screenshot Tool (Node.js CLI, no Electron)
// Usage: node screenshot.js --token <jwt> --server <url> --interval <mins>
// Or:    node screenshot.js  (reads from sangria-screenshot.config.json)
//
// Flow:
//   1. Read config from sangria-screenshot.config.json
//   2. Validate JWT token
//   3. Capture screenshot every N minutes using screenshot-desktop
//   4. Upload to backend API
//   5. Poll every 30s for interval changes from admin
'use strict'

const fs       = require('fs')
const path     = require('path')
const axios    = require('axios')
const FormData = require('form-data')
const os       = require('os')

// ── Load config ───────────────────────────────────────────────────────────────
const CONFIG_FILE = path.join(__dirname, 'sangria-screenshot.config.json')
let cfg = { serverUrl: 'http://localhost:5000', intervalMinutes: 10, autoDiscover: false }
try {
  const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
  cfg = { ...cfg, ...JSON.parse(raw) }
  console.log('[config] Loaded:', CONFIG_FILE)
  console.log('[config] Server:', cfg.serverUrl)
  console.log('[config] Interval:', cfg.intervalMinutes, 'min')
} catch (e) {
  console.warn('[config] Could not read config file, using defaults')
}

// ── Parse CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const getArg = (name) => {
  const i = args.indexOf('--' + name)
  return i !== -1 ? args[i + 1] : null
}
const TOKEN_ARG     = getArg('token')
const TOKEN_FILE_ARG = getArg('tokenfile')
const SERVER_ARG    = getArg('server')
const INTERVAL_ARG  = getArg('interval')

if (SERVER_ARG)   cfg.serverUrl       = SERVER_ARG
if (INTERVAL_ARG) cfg.intervalMinutes = parseInt(INTERVAL_ARG)

// Read token from file if --tokenfile provided
let TOKEN_FROM_FILE = null
if (TOKEN_FILE_ARG) {
  try {
    TOKEN_FROM_FILE = fs.readFileSync(TOKEN_FILE_ARG, 'utf8').trim()
    console.log('[config] Token loaded from file:', TOKEN_FILE_ARG)
  } catch (e) {
    console.error('[config] Could not read token file:', e.message)
  }
}

// ── Token storage file ────────────────────────────────────────────────────────
const TOKEN_FILE = path.join(os.tmpdir(), 'sangria-token.json')

function saveToken(token, user) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify({ token, user, savedAt: Date.now() }))
}

function loadToken() {
  try {
    const d = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'))
    // Token valid for 7 days
    if (Date.now() - d.savedAt > 7 * 24 * 60 * 60 * 1000) return null
    return d
  } catch { return null }
}

function getToken() {
  if (TOKEN_ARG)        return TOKEN_ARG
  if (TOKEN_FROM_FILE)  return TOKEN_FROM_FILE
  const saved = loadToken()
  return saved?.token || null
}

// ── Validate token with backend ───────────────────────────────────────────────
async function validateToken(token) {
  try {
    const res = await axios.get(`${cfg.serverUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000,
    })
    return res.data?.success === true ? res.data.data : null
  } catch (e) {
    console.error('[auth] Token validation failed:', e.response?.data?.message || e.message)
    return null
  }
}

// ── Fetch screenshot interval from admin settings ─────────────────────────────
async function fetchInterval(token) {
  try {
    const res = await axios.get(`${cfg.serverUrl}/api/attendance/agent-config`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    })
    return parseInt(res.data?.data?.interval_minutes || cfg.intervalMinutes)
  } catch { return cfg.intervalMinutes }
}

// ── Capture + upload screenshot ───────────────────────────────────────────────
async function captureAndUpload(token) {
  try {
    const os   = require('os')
    const { execFileSync } = require('child_process')
    const tmpPng = path.join(os.tmpdir(), `sangria-sc-${Date.now()}.png`)
    const tmpPs1 = path.join(os.tmpdir(), `sangria-sc-${Date.now()}.ps1`)

    // Write PowerShell script to a temp .ps1 file — avoids single-line escaping issues
    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bmp = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
$bmp.Save('${tmpPng.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()
`
    fs.writeFileSync(tmpPs1, psScript, 'utf8')

    execFileSync('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', tmpPs1,
    ], { timeout: 20000, windowsHide: true })

    // Clean up ps1 temp file
    try { fs.unlinkSync(tmpPs1) } catch {}

    if (!fs.existsSync(tmpPng)) {
      console.warn('[capture] Screenshot file not created')
      return false
    }

    const imgBuffer = fs.readFileSync(tmpPng)
    try { fs.unlinkSync(tmpPng) } catch {}

    if (!imgBuffer || imgBuffer.length < 1000) {
      console.warn('[capture] Screenshot too small:', imgBuffer?.length, 'bytes')
      return false
    }

    const ts   = new Date().toISOString().replace(/[:.]/g, '-')
    const form = new FormData()
    form.append('screenshot', imgBuffer, {
      filename:    `sc-${ts}.png`,
      contentType: 'image/png',
    })
    form.append('active_window_title', 'Screen Capture')
    form.append('captured_at', new Date().toISOString())

    await axios.post(
      `${cfg.serverUrl}/api/screenshots/my`,
      form,
      {
        headers: { Authorization: `Bearer ${token}`, ...form.getHeaders() },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength:    Infinity,
      }
    )

    const kb = (imgBuffer.length / 1024).toFixed(0)
    const t  = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    console.log(`[capture] ✅ ${t} — Uploaded ${kb} KB`)
    return true
  } catch (err) {
    console.error('[capture] ❌', err.response?.data?.message || err.message)
    return false
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Sangria Screenshot Tool ===')
  console.log('Server:', cfg.serverUrl)

  // Get token
  const token = getToken()
  if (!token) {
    console.error('\n❌ No token found.')
    console.error('Please login via the EPIP website first.')
    console.error('Or provide token: node screenshot.js --token <your-jwt-token>')
    process.exit(1)
  }

  // Validate token
  console.log('\n[auth] Validating token...')
  const authData = await validateToken(token)
  if (!authData) {
    console.error('❌ Token invalid or expired. Please login again via the EPIP website.')
    process.exit(1)
  }

  // Save token for future runs
  if (TOKEN_ARG) saveToken(TOKEN_ARG, authData.user)

  const userName = authData.user?.name || authData.user?.email || 'Employee'
  console.log(`✅ Logged in as: ${userName}`)

  // Fetch interval
  let intervalMins = await fetchInterval(token)
  console.log(`[config] Screenshot interval: ${intervalMins} min\n`)

  let captureCount = 0

  // Capture immediately on start
  console.log('[capture] Taking first screenshot...')
  const ok = await captureAndUpload(token)
  if (ok) captureCount++

  // Set up interval timer
  let captureTimer = setInterval(async () => {
    await captureAndUpload(token)
    captureCount++
  }, intervalMins * 60 * 1000)

  // Poll for interval changes every 30s
  setInterval(async () => {
    const newMins = await fetchInterval(token)
    if (newMins !== intervalMins) {
      console.log(`[config] Interval changed: ${intervalMins} → ${newMins} min`)
      intervalMins = newMins
      clearInterval(captureTimer)
      captureTimer = setInterval(async () => {
        await captureAndUpload(token)
        captureCount++
      }, intervalMins * 60 * 1000)
    }
  }, 30 * 1000)

  // Midnight stop at 23:58 IST
  setInterval(() => {
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
    if (istNow.getUTCHours() === 23 && istNow.getUTCMinutes() === 58) {
      console.log(`\n[midnight] 🌙 23:58 IST — stopping. Total captures today: ${captureCount}`)
      process.exit(0)
    }
  }, 60 * 1000)

  console.log(`\n📸 Running... press Ctrl+C to stop`)
  console.log(`Captures today: ${captureCount}`)

  // Keep alive
  process.on('SIGINT', () => {
    console.log(`\n\nStopped. Total captures: ${captureCount}`)
    process.exit(0)
  })
}

main().catch(err => {
  console.error('Fatal error:', err.message)
  process.exit(1)
})
