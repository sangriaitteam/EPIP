// main.js — Sangria Screenshot Tool v3
'use strict'

const electron = require('electron')
// Must be set before app is ready
electron.app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService')
electron.app.commandLine.appendSwitch('use-angle', 'swiftshader')

const {
  app, Tray, Menu, nativeImage,
  shell, powerMonitor,
} = electron
const path   = require('path')
const axios  = require('axios')
const auth   = require('./auth')
const config = require('./config')
const { captureAndUpload } = require('./capture')

// ── Register deep-link protocol ───────────────────────────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2)
    app.setAsDefaultProtocolClient('epip-screenshot', process.execPath, [path.resolve(process.argv[1])])
} else {
  app.setAsDefaultProtocolClient('epip-screenshot')
}

// ── State ─────────────────────────────────────────────────────────────────────
let tray           = null
let _captureTimer  = null   // interval timer for screenshots
let _pollTimer     = null   // 30s poller for interval changes
let _midnightTimer = null   // midnight stop timer
let _paused        = false  // screen locked
let _running       = false  // capture active
let _captureCount  = 0
let _lastCapture   = null
let _intervalMins  = 10

const isDev = process.argv.includes('--dev')

// ── Single instance ───────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }
app.on('second-instance', (_e, argv) => {
  const url = argv.find(a => a.startsWith('epip-screenshot://'))
  if (url) _handleDeepLink(url)
})
app.on('open-url', (_e, url) => _handleDeepLink(url))

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  app.setAppUserModelId('com.sangria.screenshot')

  // Windows startup
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: config.isAutoStart(),
      path:        process.execPath,
      args:        ['--hidden'],
    })
  }

  // Discover server URL (localhost / LAN / WiFi / mobile hotspot)
  await config.discoverServerUrl()
  console.log('[agent] Server:', config.getServerUrl())

  // Screen lock → pause captures
  powerMonitor.on('lock-screen', () => {
    if (_running && !_paused) { _paused = true; console.log('[agent] ⏸ Screen locked — paused') }
    _updateTray()
  })
  powerMonitor.on('suspend', () => {
    if (_running && !_paused) { _paused = true; console.log('[agent] ⏸ Suspended — paused') }
    _updateTray()
  })

  // Screen unlock → resume captures
  powerMonitor.on('unlock-screen', () => {
    if (_running && _paused) { _paused = false; console.log('[agent] ▶ Unlocked — resumed') }
    _updateTray()
  })
  powerMonitor.on('resume', () => {
    if (_running && _paused) { _paused = false; console.log('[agent] ▶ Resumed') }
    _updateTray()
  })

  _createTray()

  // Check deep-link on first launch
  const deepLink = process.argv.find(a => a.startsWith('epip-screenshot://'))
  if (deepLink) {
    await _handleDeepLink(deepLink)
  } else {
    // Restore previous session
    const valid = await auth.validateToken()
    if (valid) {
      console.log('[agent] Restoring session for:', auth.getUser()?.name)
      _intervalMins = await config.fetchInterval(auth.getToken())
      _startCapture()
      _startPoller()
    } else {
      auth.logout()
      console.log('[agent] Waiting for website login...')
    }
  }

  _scheduleMidnightStop()
})

app.on('window-all-closed', e => e.preventDefault())
app.on('before-quit', () => { _stopCapture(); _stopPoller(); _stopMidnight() })

// ── Deep-link handler ─────────────────────────────────────────────────────────
async function _handleDeepLink(url) {
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'launch') return

    const token   = parsed.searchParams.get('token')
    const userB64 = parsed.searchParams.get('user')
    if (!token) return

    let user = null
    if (userB64) {
      try { user = JSON.parse(Buffer.from(decodeURIComponent(userB64), 'base64').toString('utf8')) }
      catch {}
    }

    auth.loginWithToken(token, user)
    await config.discoverServerUrl()
    _intervalMins = await config.fetchInterval(token)

    _startCapture()
    _startPoller()
    _updateTray()
    console.log('[agent] ✅ Started for:', user?.name)
  } catch (err) {
    console.error('[agent] Deep-link error:', err.message)
  }
}

// ── Capture start/stop ────────────────────────────────────────────────────────
function _startCapture() {
  if (_running) return
  _running = true
  _paused  = false
  _captureCount = 0

  // Take first screenshot immediately
  _doCapture()

  // Then on interval
  _captureTimer = setInterval(_doCapture, _intervalMins * 60 * 1000)
  console.log(`[agent] 📸 Capture started — every ${_intervalMins} min`)
  _updateTray()
}

function _stopCapture() {
  if (_captureTimer) { clearInterval(_captureTimer); _captureTimer = null }
  _running = false
  _paused  = false
  console.log('[agent] ⏹ Capture stopped')
  _updateTray()
}

async function _doCapture() {
  if (!_running || _paused || !auth.isLoggedIn()) return
  const ok = await captureAndUpload()
  if (ok) { _captureCount++; _lastCapture = new Date().toLocaleTimeString('en-IN') }
  _updateTray()
}

// ── Interval poller — checks for admin interval changes every 30s ─────────────
function _startPoller() {
  if (_pollTimer) return
  _pollTimer = setInterval(async () => {
    if (!auth.isLoggedIn()) return
    const newMins = await config.fetchInterval(auth.getToken())
    if (newMins !== _intervalMins) {
      console.log(`[agent] ⚙ Interval: ${_intervalMins} → ${newMins} min`)
      _intervalMins = newMins
      // Restart capture timer with new interval
      if (_captureTimer) { clearInterval(_captureTimer); _captureTimer = null }
      if (_running) _captureTimer = setInterval(_doCapture, _intervalMins * 60 * 1000)
      _updateTray()
    }
  }, 30 * 1000)
}

function _stopPoller() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null }
}

// ── Midnight stop at 23:58 IST ────────────────────────────────────────────────
function _scheduleMidnightStop() {
  if (_midnightTimer) clearInterval(_midnightTimer)

  // Check every minute
  _midnightTimer = setInterval(() => {
    const now = new Date(Date.now() + 5.5 * 60 * 60 * 1000) // IST
    const h = now.getUTCHours(); const m = now.getUTCMinutes()
    if (h === 23 && m === 58) {
      console.log('[agent] 🌙 Midnight — stopping capture and clearing session')
      _stopCapture()
      _stopPoller()
      auth.logout()
      _captureCount = 0
      _lastCapture  = null
      _updateTray()
    }
  }, 60 * 1000)
}

function _stopMidnight() {
  if (_midnightTimer) { clearInterval(_midnightTimer); _midnightTimer = null }
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function _createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png')
  const img      = nativeImage.createFromPath(iconPath)
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img)
  tray.setToolTip('Sangria Screenshot')
  _updateTray()
}

function _updateTray() {
  if (!tray) return
  const user     = auth.getUser()
  const loggedIn = auth.isLoggedIn()
  const server   = config.getServerUrl().replace('http://', '')

  const statusLine =
    !loggedIn  ? '⚪  Waiting for login...'
    : _paused  ? '⏸  Screen locked — paused'
    : _running ? `📸  Capturing every ${_intervalMins} min`
               : '🟢  Logged in — idle'

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: loggedIn ? `👤  ${user?.name || 'Employee'}` : '❌  Not logged in', enabled: false },
    { label: statusLine, enabled: false },
    { label: `📷  Captures today: ${_captureCount}`, enabled: false },
    { label: _lastCapture ? `🕐  Last: ${_lastCapture}` : '🕐  No captures yet', enabled: false },
    { label: `🔗  ${server}`, enabled: false },
    { type: 'separator' },
    {
      label: '🌐  Open Dashboard',
      click: () => shell.openExternal(`http://${server.split(':')[0]}:5173`),
    },
    { type: 'separator' },
    {
      label: 'Sign Out',
      enabled: loggedIn,
      click: () => { _stopCapture(); _stopPoller(); auth.logout(); _updateTray() },
    },
    { label: 'Quit', click: () => { _stopCapture(); _stopPoller(); _stopMidnight(); app.quit() } },
  ]))

  tray.setToolTip(
    !loggedIn  ? 'Sangria Screenshot — Waiting'
    : _running ? `Sangria Screenshot — ${_captureCount} captures`
               : 'Sangria Screenshot — Idle'
  )
}
