// main.js — ScreenLock Agent
// Flow: Website login → fires epip-timing://launch?token=<jwt>&user=<json>
//       Agent receives deep-link → stores token → opens status window directly (NO login screen)
//       Screen lock  → auto break start
//       Screen unlock → auto break resume
'use strict'

const {
  app, BrowserWindow, Tray, Menu, ipcMain,
  nativeImage, shell, powerMonitor,
} = require('electron')
const path       = require('path')
const auth       = require('./auth')
const config     = require('./config')
const attendance = require('./attendance')

// ── Register custom protocol BEFORE app is ready ──────────────────────────────
// This makes epip-timing:// URLs open this app on Windows
if (process.defaultApp) {
  // Dev mode: register with full path
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('epip-timing', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('epip-timing')
}

// ── State ──────────────────────────────────────────────────────────────────────
let tray        = null
let loginWin    = null
let statusWin   = null
let _pollTimer  = null

let _isCheckedIn  = false
let _isOnBreak    = false
let _checkInTime  = null
let _autoBreakOn  = false   // break started by screen-lock
let _currentBreakStart = null  // actual pause_start from backend

const isDev    = process.argv.includes('--dev')
const ICON_DIR = path.join(__dirname, 'assets')
const POLL_MS  = 30 * 1000  // 30 seconds

// ── Single instance + deep-link handler ───────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// When the website fires epip-timing://... and the agent is already running
// Windows sends the URL here via second-instance event
app.on('second-instance', (_event, argv) => {
  const url = argv.find(a => a.startsWith('epip-timing://'))
  if (url) {
    _handleDeepLink(url)
  } else {
    // Just focus the existing window
    if (statusWin && !statusWin.isDestroyed()) { statusWin.show(); statusWin.focus() }
    else if (auth.isLoggedIn()) showStatusWindow()
    else showLoginWindow()
  }
})

// ── App ready ──────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  app.setAppUserModelId('com.sangria.screenlock')

  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: config.isAutoStart(),
      path:        process.execPath,
      args:        ['--hidden'],
    })
  }

  // Check if launched via deep-link (first launch with URL in argv)
  const deepLinkUrl = process.argv.find(a => a.startsWith('epip-timing://'))

  // ── Screen lock / sleep → auto break ──────────────────────────────────────
  powerMonitor.on('lock-screen', () => {
    console.log('[timing] 🔒 Screen locked')
    if (_isCheckedIn && !_isOnBreak) _autoStartBreak('screen_lock')
  })
  powerMonitor.on('suspend', () => {
    console.log('[timing] 💤 System suspended')
    if (_isCheckedIn && !_isOnBreak) _autoStartBreak('screen_lock')
  })

  // ── Screen unlock / resume → auto resume ──────────────────────────────────
  powerMonitor.on('unlock-screen', () => {
    console.log('[timing] 🔓 Screen unlocked')
    if (_isCheckedIn && _isOnBreak && _autoBreakOn) _autoResumeBreak()
  })
  powerMonitor.on('resume', () => {
    console.log('[timing] ☀️  System resumed')
    if (_isCheckedIn && _isOnBreak && _autoBreakOn) _autoResumeBreak()
  })

  createTray()
  setupIPC()

  if (deepLinkUrl) {
    // Launched directly from website deep-link
    console.log('[timing] Launched via deep-link:', deepLinkUrl)
    await _handleDeepLink(deepLinkUrl)
  } else {
    // Normal startup — restore previous session
    const valid = await auth.validateToken()
    if (valid) {
      await _syncState()
      _startPoller()
      if (!process.argv.includes('--hidden')) showStatusWindow()
    } else {
      auth.logout()
      // Agent starts hidden in tray — website will send token when employee logs in
      console.log('[timing] Waiting for website login deep-link...')
    }
  }
})

app.on('window-all-closed', e => e.preventDefault())
app.on('before-quit', () => _stopPoller())

// macOS: handle open-url event (protocol handler on macOS)
app.on('open-url', (_event, url) => {
  _handleDeepLink(url)
})

// ── Deep-link handler ─────────────────────────────────────────────────────────
// URL format: epip-timing://launch?token=<jwt>&user=<base64-json>
async function _handleDeepLink(url) {
  try {
    console.log('[timing] Processing deep-link:', url)
    const parsed = new URL(url)

    if (parsed.hostname !== 'launch') {
      console.warn('[timing] Unknown deep-link command:', parsed.hostname)
      return
    }

    const token   = parsed.searchParams.get('token')
    const userB64 = parsed.searchParams.get('user')

    if (!token) {
      console.error('[timing] No token in deep-link')
      showLoginWindow()
      return
    }

    // Decode user JSON
    let user = null
    if (userB64) {
      try {
        user = JSON.parse(Buffer.from(userB64, 'base64').toString('utf8'))
      } catch (e) {
        console.warn('[timing] Could not parse user from deep-link:', e.message)
      }
    }

    // Store token + user (no password needed)
    auth.loginWithToken(token, user)

    // Sync attendance state then show status popup
    await _syncState()
    _startPoller()
    _buildTrayMenu()
    showStatusWindow()

    console.log('[timing] ✅ Agent ready for:', user?.name || 'Employee')
  } catch (err) {
    console.error('[timing] Deep-link error:', err.message)
    showLoginWindow()
  }
}

// ── Auto break helpers ─────────────────────────────────────────────────────────
async function _autoStartBreak(reason = 'screen_lock') {
  try {
    const rec = await attendance.pauseWork(reason, 'Auto-detected screen lock')
    _isOnBreak          = true
    _autoBreakOn        = true
    _currentBreakStart  = rec?.pause_start || new Date().toISOString()
    console.log(`[timing] ⏸ Auto break started (${reason})`)
    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    console.warn('[timing] Auto break start skipped:', err.response?.data?.message || err.message)
  }
}

async function _autoResumeBreak() {
  try {
    await attendance.resumeWork()
    _isOnBreak         = false
    _autoBreakOn       = false
    _currentBreakStart = null
    console.log('[timing] ▶ Auto break resumed')
    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    console.warn('[timing] Auto resume skipped:', err.response?.data?.message || err.message)
  }
}

// ── State sync from backend ────────────────────────────────────────────────────
async function _syncState() {
  if (!auth.isLoggedIn()) return
  try {
    const record = await attendance.getToday()
    _isCheckedIn = !!(record?.check_in && !record?.check_out)
    _checkInTime = record?.check_in || null

    let _breakStartTime = null

    if (_isCheckedIn) {
      const pauses = await attendance.getMyPauses()
      const active = pauses.find(p => p.pause_start && !p.pause_end)
      _isOnBreak      = !!active
      _breakStartTime = active?.pause_start || null
      if (!active) _autoBreakOn = false
    } else {
      _isOnBreak      = false
      _autoBreakOn    = false
      _breakStartTime = null
    }

    // Store break start on module scope for push
    _currentBreakStart = _breakStartTime

    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    console.warn('[timing] Sync error:', err.message)
  }
}

// ── Poller ─────────────────────────────────────────────────────────────────────
function _startPoller() {
  if (_pollTimer) return
  _syncState()
  _pollTimer = setInterval(_syncState, POLL_MS)
  console.log(`[timing] Poller started — every ${POLL_MS / 1000}s`)
}

function _stopPoller() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null }
}

// ── Manual check-in / check-out ────────────────────────────────────────────────
async function _doCheckIn() {
  try {
    const rec    = await attendance.checkIn('office')
    _isCheckedIn = true
    _checkInTime = rec?.check_in || new Date().toISOString()
    _isOnBreak   = false
    _autoBreakOn = false
    _buildTrayMenu()
    _pushStatus()
    console.log('[timing] ✅ Checked in')
  } catch (err) {
    _pushError(err.response?.data?.message || err.message)
  }
}

async function _doCheckOut() {
  if (_isOnBreak) {
    try { await attendance.resumeWork() } catch { /* ignore */ }
  }
  try {
    await attendance.checkOut()
    _isCheckedIn  = false
    _isOnBreak    = false
    _autoBreakOn  = false
    _checkInTime  = null
    _buildTrayMenu()
    _pushStatus()
    console.log('[timing] 🔴 Checked out')
  } catch (err) {
    _pushError(err.response?.data?.message || err.message)
  }
}

async function _doManualBreak(reason = 'other') {
  try {
    const rec = await attendance.pauseWork(reason)
    _isOnBreak         = true
    _autoBreakOn       = false
    _currentBreakStart = rec?.pause_start || new Date().toISOString()
    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    _pushError(err.response?.data?.message || err.message)
  }
}

async function _doManualResume() {
  try {
    await attendance.resumeWork()
    _isOnBreak         = false
    _autoBreakOn       = false
    _currentBreakStart = null
    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    _pushError(err.response?.data?.message || err.message)
  }
}

// ── Tray ───────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(ICON_DIR, 'tray-icon.png')
  const icon     = nativeImage.createFromPath(iconPath)
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.setToolTip('ScreenLock')
  tray.on('click', () => auth.isLoggedIn() ? showStatusWindow() : null)
  _buildTrayMenu()
}

function _buildTrayMenu() {
  if (!tray) return
  const user     = auth.getUser()
  const loggedIn = auth.isLoggedIn()

  const statusLabel = !loggedIn
    ? '⚪  Waiting for website login…'
    : _isCheckedIn
      ? _isOnBreak
        ? _autoBreakOn ? '⏸  On Break (screen locked)' : '⏸  On Break'
        : '🟢  Checked In — Working'
      : '⚪  Logged in — Not checked in'

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: loggedIn ? `👤  ${user?.name || 'Employee'}` : '❌  Not logged in', enabled: false },
    { label: statusLabel, enabled: false },
    { type: 'separator' },

    { label: '📋  Open Status', click: () => auth.isLoggedIn() ? showStatusWindow() : null },
    { type: 'separator' },

    { label: '✅  Check In',  enabled: loggedIn && !_isCheckedIn, click: () => _doCheckIn() },
    { label: '🔴  Check Out', enabled: loggedIn && _isCheckedIn,  click: () => _doCheckOut() },
    { type: 'separator' },

    {
      label:   _isOnBreak ? '▶  Resume Work' : '⏸  Take Break',
      enabled: loggedIn && _isCheckedIn,
      submenu: _isOnBreak
        ? [{ label: '▶  Resume Work', click: () => _doManualResume() }]
        : [
            { label: '☕  Tea Break',   click: () => _doManualBreak('tea_break')   },
            { label: '🍽  Lunch Break', click: () => _doManualBreak('lunch_break') },
            { label: '📅  Meeting',     click: () => _doManualBreak('meeting')     },
            { label: '👤  Personal',    click: () => _doManualBreak('personal')    },
            { label: '•  Other',        click: () => _doManualBreak('other')       },
          ],
    },
    { type: 'separator' },

    {
      label: '🌐  Open Dashboard',
      click: () => shell.openExternal(config.getServerUrl().replace(':5000', ':5173')),
    },
    { type: 'separator' },
    { label: 'Sign Out', enabled: loggedIn, click: () => _doLogout() },
    { label: 'Quit',     click: () => { _stopPoller(); app.quit() } },
  ]))

  tray.setToolTip(
    !loggedIn          ? 'ScreenLock — Waiting for website login' :
    _isCheckedIn
      ? _isOnBreak     ? 'ScreenLock — On Break'
                       : 'ScreenLock — Working'
      : 'ScreenLock — Not checked in'
  )
}

// ── Push state to status window ────────────────────────────────────────────────
function _pushStatus() {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.webContents.send('status:update', {
      isCheckedIn:    _isCheckedIn,
      isOnBreak:      _isOnBreak,
      autoBreakOn:    _autoBreakOn,
      checkInTime:    _checkInTime,
      breakStartTime: _currentBreakStart,  // ← actual pause_start from backend
      user:           auth.getUser(),
    })
  }
}

function _pushError(msg) {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.webContents.send('status:error', msg)
  }
}

// ── Windows ────────────────────────────────────────────────────────────────────
function showLoginWindow() {
  // Fallback only — normally website handles login
  if (loginWin && !loginWin.isDestroyed()) { loginWin.show(); loginWin.focus(); return }
  loginWin = new BrowserWindow({
    width: 360, height: 440,
    resizable: false, maximizable: false, fullscreenable: false,
    frame: false, alwaysOnTop: true, center: true, show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
  })
  loginWin.loadFile(path.join(__dirname, 'renderer', 'login.html'))
  loginWin.once('ready-to-show', () => loginWin.show())
  if (isDev) loginWin.webContents.openDevTools({ mode: 'detach' })
  loginWin.on('closed', () => { loginWin = null })
}

function showStatusWindow() {
  if (statusWin && !statusWin.isDestroyed()) { statusWin.show(); statusWin.focus(); return }
  const { screen } = require('electron')
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  statusWin = new BrowserWindow({
    width: 320, height: 420,
    x: width - 336, y: height - 436,
    resizable: false, maximizable: false, fullscreenable: false,
    frame: false, alwaysOnTop: true, skipTaskbar: true, show: false,
    backgroundColor: '#1e293b',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
  })
  statusWin.loadFile(path.join(__dirname, 'renderer', 'status.html'))
  statusWin.once('ready-to-show', () => {
    statusWin.show()
    _pushStatus()
  })
  if (isDev) statusWin.webContents.openDevTools({ mode: 'detach' })
  statusWin.on('blur',   () => { if (statusWin && !statusWin.isDestroyed()) statusWin.hide() })
  statusWin.on('closed', () => { statusWin = null })
}

// ── IPC ────────────────────────────────────────────────────────────────────────
function setupIPC() {
  // Fallback login (only if website didn't launch agent)
  ipcMain.handle('auth:login', async (_, username, password) => {
    const user = await auth.login(username, password)
    if (loginWin && !loginWin.isDestroyed()) loginWin.close()
    await _syncState()
    _startPoller()
    _buildTrayMenu()
    showStatusWindow()
    return user
  })

  ipcMain.handle('auth:logout',    () => _doLogout())
  ipcMain.handle('auth:getUser',   () => auth.getUser())
  ipcMain.handle('auth:isLoggedIn',() => auth.isLoggedIn())

  ipcMain.handle('attendance:checkIn',   (_, mode) => _doCheckIn(mode))
  ipcMain.handle('attendance:checkOut',  ()        => _doCheckOut())
  ipcMain.handle('attendance:pause',     (_, r)    => _doManualBreak(r))
  ipcMain.handle('attendance:resume',    ()        => _doManualResume())
  ipcMain.handle('attendance:getStatus', ()        => ({
    isCheckedIn:    _isCheckedIn,
    isOnBreak:      _isOnBreak,
    autoBreakOn:    _autoBreakOn,
    checkInTime:    _checkInTime,
    breakStartTime: _currentBreakStart,
    user:           auth.getUser(),
  }))

  ipcMain.handle('window:close', () => {
    if (statusWin && !statusWin.isDestroyed()) statusWin.hide()
  })
}

// ── Logout ─────────────────────────────────────────────────────────────────────
function _doLogout() {
  _stopPoller()
  auth.logout()
  _isCheckedIn = false
  _isOnBreak   = false
  _autoBreakOn = false
  _checkInTime = null
  _buildTrayMenu()
  if (statusWin && !statusWin.isDestroyed()) statusWin.close()
  // Don't show login window — employee should use the website
  console.log('[timing] Signed out — waiting for website login')
}
