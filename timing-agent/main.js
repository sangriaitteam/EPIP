// main.js — Screen Lock Tracker v5.0.0
// Sangria Edutainment Pvt Ltd
//
// Flow:
//   Website employee login → fires epip-timing://launch?token=<jwt>&user=<b64>
//   Agent receives deep-link → stores token → starts tracking
//   Screen lock / sleep  → POST /api/attendance/pause (reason: screen_lock)
//   Screen unlock/resume → POST /api/attendance/resume
//   Polls backend every 30s to stay in sync
'use strict'

const {
  app, BrowserWindow, Tray, Menu, ipcMain,
  nativeImage, shell, powerMonitor,
} = require('electron')
const path       = require('path')
const auth       = require('./auth')
const config     = require('./config')
const attendance = require('./attendance')

// ── Register epip-timing:// protocol BEFORE app.ready ────────────────────────
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('epip-timing', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('epip-timing')
}

// ── State ─────────────────────────────────────────────────────────────────────
let tray       = null
let statusWin  = null
let loginWin   = null
let _pollTimer = null

let _isCheckedIn       = false
let _isOnBreak         = false
let _autoBreak         = false   // true when break triggered by screen lock
let _checkInTime       = null
let _breakStartTime    = null

const isDev    = process.argv.includes('--dev')
const ICON_DIR = path.join(__dirname, 'assets')
const POLL_MS  = 30 * 1000   // sync with backend every 30s

// ── Single instance lock ──────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }

app.on('second-instance', (_e, argv) => {
  const url = argv.find(a => a.startsWith('epip-timing://'))
  if (url) {
    _handleDeepLink(url)
  } else {
    if (statusWin && !statusWin.isDestroyed()) { statusWin.show(); statusWin.focus() }
    else if (auth.isLoggedIn()) showStatusWindow()
    else showLoginWindow()
  }
})

// macOS protocol handler
app.on('open-url', (_e, url) => _handleDeepLink(url))

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  app.setAppUserModelId('com.sangria.screen-lock-tracker')

  // Windows auto-start on boot
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: config.isAutoStart(),
      path:        process.execPath,
      args:        ['--hidden'],
    })
  }

  console.log('[tracker] Starting server discovery...')
  await config.discoverServerUrl()
  console.log('[tracker] Using server:', config.getServerUrl())

  // ── Screen lock / sleep → auto start break ────────────────────────────────
  powerMonitor.on('lock-screen', () => {
    console.log('[tracker] 🔒 Screen locked')
    if (_isCheckedIn && !_isOnBreak) _autoStartBreak()
  })
  powerMonitor.on('suspend', () => {
    console.log('[tracker] 💤 System suspended')
    if (_isCheckedIn && !_isOnBreak) _autoStartBreak()
  })

  // ── Screen unlock / resume → ALWAYS try to resume ────────────────────────
  // Do NOT rely on _isOnBreak in-memory state — call resume unconditionally
  // when checked in. Backend handles the case where there is no active pause.
  powerMonitor.on('unlock-screen', () => {
    console.log('[tracker] 🔓 Screen unlocked')
    if (_isCheckedIn) _autoResumeBreak()
  })
  powerMonitor.on('resume', () => {
    console.log('[tracker] ☀️  System resumed')
    if (_isCheckedIn) _autoResumeBreak()
  })

  createTray()
  setupIPC()

  // Check if launched via deep-link on first start
  const deepLinkUrl = process.argv.find(a => a.startsWith('epip-timing://'))
  if (deepLinkUrl) {
    console.log('[tracker] Launched via deep-link')
    await _handleDeepLink(deepLinkUrl)
  } else {
    // Restore previous session
    const valid = await auth.validateToken()
    if (valid) {
      await _syncState()
      _startPoller()
      if (!process.argv.includes('--hidden')) showStatusWindow()
    } else {
      auth.logout()
      console.log('[tracker] Waiting for website login deep-link...')
    }
  }
})

app.on('window-all-closed', e => e.preventDefault())
app.on('before-quit', () => _stopPoller())

// ── Deep-link handler ─────────────────────────────────────────────────────────
// URL: epip-timing://launch?token=<jwt>&user=<base64-json>
async function _handleDeepLink(url) {
  try {
    console.log('[tracker] Processing deep-link:', url.substring(0, 60) + '...')
    const parsed  = new URL(url)
    if (parsed.hostname !== 'launch') return

    const token   = parsed.searchParams.get('token')
    const userB64 = parsed.searchParams.get('user')
    if (!token) { showLoginWindow(); return }

    let user = null
    if (userB64) {
      try { user = JSON.parse(Buffer.from(decodeURIComponent(userB64), 'base64').toString('utf8')) }
      catch (e) { console.warn('[tracker] Could not decode user:', e.message) }
    }

    auth.loginWithToken(token, user)

    // Re-run discovery after login in case network changed
    await config.discoverServerUrl()

    await _syncState()
    _startPoller()
    _buildTrayMenu()
    showStatusWindow()
    console.log('[tracker] ✅ Ready for:', user?.name || 'Employee')
  } catch (err) {
    console.error('[tracker] Deep-link error:', err.message)
    showLoginWindow()
  }
}

// ── Auto break (screen lock) ──────────────────────────────────────────────────
async function _autoStartBreak() {
  try {
    const rec       = await attendance.pauseWork('screen_lock', 'Screen locked automatically')
    _isOnBreak      = true
    _autoBreak      = true
    _breakStartTime = rec?.pause_start || new Date().toISOString()
    console.log('[tracker] ⏸ Screen lock break started')
    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    const msg = err.response?.data?.message || err.message
    // Already on break = that's fine, update local state
    if (msg?.includes('Already on a break')) {
      _isOnBreak  = true
      _autoBreak  = true
      console.log('[tracker] ⏸ Already on break — state synced')
    } else {
      console.warn('[tracker] Auto break skipped:', msg)
    }
    _buildTrayMenu()
    _pushStatus()
  }
}

// ── Auto resume (screen unlock) ───────────────────────────────────────────────
async function _autoResumeBreak() {
  try {
    await attendance.resumeWork()
    _isOnBreak      = false
    _autoBreak      = false
    _breakStartTime = null
    console.log('[tracker] ▶ Screen unlock — break resumed')
    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    const status = err.response?.status
    const msg    = err.response?.data?.message || err.message

    if (status === 404) {
      // No active break in DB — still clear local state, was out of sync
      _isOnBreak      = false
      _autoBreak      = false
      _breakStartTime = null
      console.log('[tracker] ▶ No active break found — local state cleared')
      _buildTrayMenu()
      _pushStatus()
    } else {
      console.warn('[tracker] Auto resume skipped:', msg)
    }
  }
}

// ── Manual break / resume ─────────────────────────────────────────────────────
async function _doManualBreak(reason = 'other') {
  try {
    const rec       = await attendance.pauseWork(reason)
    _isOnBreak      = true
    _autoBreak      = false
    _breakStartTime = rec?.pause_start || new Date().toISOString()
    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    _pushError(err.response?.data?.message || err.message)
  }
}

async function _doManualResume() {
  try {
    await attendance.resumeWork()
    _isOnBreak      = false
    _autoBreak      = false
    _breakStartTime = null
    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    _pushError(err.response?.data?.message || err.message)
  }
}

// ── State sync from backend ───────────────────────────────────────────────────
async function _syncState() {
  if (!auth.isLoggedIn()) return
  try {
    const record = await attendance.getToday()
    const hasCheckedIn = !!(record?.check_in)

    if (hasCheckedIn) {
      const pauses = await attendance.getMyPauses()
      const active = pauses.find(p => !p.pause_end)

      _isCheckedIn    = true
      _checkInTime    = record.check_in
      _isOnBreak      = !!active
      _autoBreak      = active?.reason === 'screen_lock'
      _breakStartTime = active?.pause_start || null

      // If DB says on break but we know screen is ON (app is responding),
      // and this is a screen_lock break, call resume to close the stale pause.
      // Guard: only do this if _autoBreak was previously true in memory,
      // meaning unlock-screen already fired but resume failed silently.
      if (active && active.reason === 'screen_lock' && !_isScreenLocked()) {
        console.log('[tracker] 🔄 Stale screen_lock pause — auto-resuming')
        await _autoResumeBreak()
      }
    } else {
      _isCheckedIn    = false
      _isOnBreak      = false
      _autoBreak      = false
      _breakStartTime = null
      _checkInTime    = null
    }

    _buildTrayMenu()
    _pushStatus()
  } catch (err) {
    console.warn('[tracker] Sync error:', err.message)
  }
}

// ── Screen lock state helper ──────────────────────────────────────────────────
// Returns true if the screen is currently locked.
// On Windows, we detect this by checking if the system is currently locked
// using a lightweight PowerShell command.
function _isScreenLocked() {
  try {
    const { execSync } = require('child_process')
    // Query the session state — "Disc" or "Listen" means locked/disconnected
    const out = execSync(
      'powershell -NoProfile -Command "(Get-Process logonui -ErrorAction SilentlyContinue) -ne $null"',
      { timeout: 3000, windowsHide: true }
    ).toString().trim()
    return out === 'True'
  } catch {
    return false
  }
}

// ── Poller ────────────────────────────────────────────────────────────────────
function _startPoller() {
  if (_pollTimer) return
  _syncState()
  _pollTimer = setInterval(_syncState, POLL_MS)
  console.log(`[tracker] Poller started — every ${POLL_MS / 1000}s`)
}
function _stopPoller() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null }
}

// ── Logout ────────────────────────────────────────────────────────────────────
function _doLogout() {
  _stopPoller()
  auth.logout()
  _isCheckedIn = false; _isOnBreak = false; _autoBreak = false; _checkInTime = null
  _buildTrayMenu()
  if (statusWin && !statusWin.isDestroyed()) statusWin.close()
  console.log('[tracker] Signed out — waiting for website login')
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(ICON_DIR, 'icon.ico')
  const img      = nativeImage.createFromPath(iconPath)
  tray = new Tray(img.isEmpty() ? nativeImage.createEmpty() : img)
  tray.setToolTip('Screen Lock Tracker')
  tray.on('click', () => auth.isLoggedIn() ? showStatusWindow() : showLoginWindow())
  _buildTrayMenu()
}

function _buildTrayMenu() {
  if (!tray) return
  const user     = auth.getUser()
  const loggedIn = auth.isLoggedIn()
  const server   = config.getServerUrl()

  const statusLine =
    !loggedIn     ? '⚪  Waiting for website login…'
    : _isCheckedIn
      ? _isOnBreak
        ? _autoBreak ? '🔒  Screen Locked (break active)' : '⏸  On Break'
        : '🟢  Working'
      : '⚪  Not checked in'

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Screen Lock Tracker 5.0.0', enabled: false },
    { label: loggedIn ? `👤  ${user?.name || 'Employee'}` : '❌  Not logged in', enabled: false },
    { label: statusLine, enabled: false },
    { label: `🔗  ${server}`, enabled: false },
    { type: 'separator' },
    { label: '📋  Open Status', click: () => auth.isLoggedIn() ? showStatusWindow() : showLoginWindow() },
    { type: 'separator' },
    {
      label:   _isOnBreak ? '▶  Resume Work' : '⏸  Take Break',
      enabled: loggedIn && _isCheckedIn,
      submenu: _isOnBreak
        ? [{ label: '▶  Resume Work', click: () => _doManualResume() }]
        : [
            { label: '☕  Tea Break',    click: () => _doManualBreak('tea_break')   },
            { label: '🍽  Lunch Break',  click: () => _doManualBreak('lunch_break') },
            { label: '📅  Meeting',      click: () => _doManualBreak('meeting')     },
            { label: '👤  Personal',     click: () => _doManualBreak('personal')    },
            { label: '•   Other',        click: () => _doManualBreak('other')       },
          ],
    },
    { type: 'separator' },
    {
      label: '🌐  Open Dashboard',
      click: () => shell.openExternal(server.replace(':5000', ':5173')),
    },
    { type: 'separator' },
    { label: 'Sign Out', enabled: loggedIn, click: () => _doLogout() },
    { label: 'Quit',     click: () => { _stopPoller(); app.quit() } },
  ]))

  tray.setToolTip(
    !loggedIn    ? 'Screen Lock Tracker — Waiting for login'
    : _isCheckedIn
      ? _isOnBreak ? 'Screen Lock Tracker — On Break'
                   : 'Screen Lock Tracker — Working'
      : 'Screen Lock Tracker — Not checked in'
  )
}

// ── Push status to renderer ───────────────────────────────────────────────────
function _pushStatus() {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.webContents.send('status:update', {
      isCheckedIn:    _isCheckedIn,
      isOnBreak:      _isOnBreak,
      autoBreak:      _autoBreak,
      checkInTime:    _checkInTime,
      breakStartTime: _breakStartTime,
      serverUrl:      config.getServerUrl(),
      user:           auth.getUser(),
    })
  }
}

function _pushError(msg) {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.webContents.send('status:error', msg)
  }
}

// ── Windows ───────────────────────────────────────────────────────────────────
function showStatusWindow() {
  if (statusWin && !statusWin.isDestroyed()) { statusWin.show(); statusWin.focus(); return }
  const { screen } = require('electron')
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  statusWin = new BrowserWindow({
    width: 340, height: 460,
    x: width - 356, y: height - 476,
    resizable: false, maximizable: false, fullscreenable: false,
    frame: false, alwaysOnTop: true, skipTaskbar: true, show: false,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
  })
  statusWin.loadFile(path.join(__dirname, 'renderer', 'status.html'))
  statusWin.once('ready-to-show', () => { statusWin.show(); _pushStatus() })
  if (isDev) statusWin.webContents.openDevTools({ mode: 'detach' })
  statusWin.on('blur',   () => { if (statusWin && !statusWin.isDestroyed()) statusWin.hide() })
  statusWin.on('closed', () => { statusWin = null })
}

function showLoginWindow() {
  if (loginWin && !loginWin.isDestroyed()) { loginWin.show(); loginWin.focus(); return }
  loginWin = new BrowserWindow({
    width: 360, height: 460,
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

// ── IPC handlers ──────────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('auth:login', async (_, username, password) => {
    const user = await auth.login(username, password)
    if (loginWin && !loginWin.isDestroyed()) loginWin.close()
    await config.discoverServerUrl()
    await _syncState()
    _startPoller()
    _buildTrayMenu()
    showStatusWindow()
    return user
  })

  ipcMain.handle('auth:logout',     () => _doLogout())
  ipcMain.handle('auth:getUser',    () => auth.getUser())
  ipcMain.handle('auth:isLoggedIn', () => auth.isLoggedIn())

  ipcMain.handle('attendance:checkIn',   (_, mode) => attendance.checkIn(mode))
  ipcMain.handle('attendance:checkOut',  ()        => attendance.checkOut())
  ipcMain.handle('attendance:pause',     (_, r)    => _doManualBreak(r))
  ipcMain.handle('attendance:resume',    ()        => _doManualResume())
  ipcMain.handle('attendance:getStatus', ()        => ({
    isCheckedIn:    _isCheckedIn,
    isOnBreak:      _isOnBreak,
    autoBreak:      _autoBreak,
    checkInTime:    _checkInTime,
    breakStartTime: _breakStartTime,
    serverUrl:      config.getServerUrl(),
    user:           auth.getUser(),
  }))

  ipcMain.handle('window:close', () => {
    if (statusWin && !statusWin.isDestroyed()) statusWin.hide()
  })
}
