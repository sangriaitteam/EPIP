// main.js — Sangria Agent
// 1. Employee-only login
// 2. Check-in  → screenshot capture starts automatically
// 3. Check-out → capture stops automatically
// 4. Superadmin interval change → applied within 30 seconds
'use strict'

const {
  app, BrowserWindow, Tray, Menu, ipcMain,
  nativeImage, shell, powerMonitor,
} = require('electron')
const path      = require('path')
const axios     = require('axios')
const auth      = require('./auth')
const config    = require('./config')
const scheduler = require('./scheduler')
const { captureAndUpload, setActiveWindowTitleFn } = require('./capture')

// ── State ─────────────────────────────────────────────────────────────────────
let tray             = null
let loginWin         = null
let statusWin        = null
let _activeWindow    = 'Unknown'
let _pollTimer       = null
let _isCheckedIn     = false
let _isOnScreenBreak = false   // true when screen is locked/off
let _screenOffStart  = null    // timestamp when screen went off

const isDev    = process.argv.includes('--dev')
const ICON_DIR = path.join(__dirname, 'assets')
const POLL_MS  = 30 * 1000   // check attendance + interval every 30s

// ── Single instance ───────────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0) }
app.on('second-instance', () => {
  if (statusWin && !statusWin.isDestroyed()) { statusWin.show(); statusWin.focus() }
  else if (auth.isLoggedIn()) showStatusWindow()
  else showLoginWindow()
})

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  app.setAppUserModelId('com.sangria.agent')

  // Windows auto-start
  if (process.platform === 'win32') {
    app.setLoginItemSettings({
      openAtLogin: config.isAutoStart(),
      path:        process.execPath,
      args:        ['--hidden'],
    })
  }

  setActiveWindowTitleFn(() => _activeWindow)
  setInterval(updateActiveWindow, 3000)

  // ── Screen lock / sleep → pause screenshot capture + record screen-off ──
  powerMonitor.on('lock-screen', () => {
    if (scheduler.isRunning()) scheduler.pause()
    _onScreenOff('lock-screen')
  })
  powerMonitor.on('suspend', () => {
    if (scheduler.isRunning()) scheduler.pause()
    _onScreenOff('suspend')
  })

  // ── Screen unlock / resume → resume screenshot capture + end screen-off ─
  powerMonitor.on('unlock-screen', () => {
    if (scheduler.isPaused()) scheduler.resume()
    _onScreenOn()
  })
  powerMonitor.on('resume', () => {
    if (scheduler.isPaused()) scheduler.resume()
    _onScreenOn()
  })

  // When scheduler fires a capture, push status to tray + popup
  scheduler.setStatusCallback((status) => {
    _updateTray(status)
    _pushStatus(status)
  })

  createTray()
  setupIPC()

  // Restore previous session
  const valid = await auth.validateToken()
  if (valid) {
    const { minutes } = await config.fetchIntervalFromBackend(auth.getToken())
    scheduler.updateInterval(minutes)
    _startPoller()
  } else {
    auth.logout()
    showLoginWindow()
  }
})

app.on('window-all-closed', e => e.preventDefault())
app.on('before-quit', () => { _stopPoller(); scheduler.stop() })

// ── Poller — runs every 30s while logged in ───────────────────────────────────
// Checks: (a) attendance status → start/stop capture
//         (b) interval setting  → apply any admin changes live

async function _poll() {
  if (!auth.isLoggedIn()) return
  try {
    const [attendanceRes, intervalData] = await Promise.all([
      axios.get(`${config.getServerUrl()}/api/attendance/today`, {
        headers: auth.getHeaders(), timeout: 8000,
      }),
      config.fetchIntervalFromBackend(auth.getToken()),
    ])

    // ── 1. Attendance check ─────────────────────────────────────────────────
    const record    = attendanceRes.data?.data
    const checkedIn = !!(record?.check_in && !record?.check_out)

    if (checkedIn && !_isCheckedIn) {
      // Just checked in → start capturing
      _isCheckedIn     = true
      _isOnScreenBreak = false
      _screenOffStart  = null
      console.log('[agent] ✅ Checked in — starting capture')
      scheduler.updateInterval(intervalData.minutes)
      scheduler.start()
      _buildTrayMenu()
      _pushToStatus({ checkedIn: true })

    } else if (!checkedIn && _isCheckedIn) {
      // Just checked out → stop capturing then quit agent
      _isCheckedIn     = false
      _isOnScreenBreak = false
      _screenOffStart  = null
      console.log('[agent] 🔴 Checked out — stopping capture, quitting in 5s')
      scheduler.stop()
      _buildTrayMenu()
      _pushToStatus({ checkedIn: false })

      // Show "Checked out" in status popup for 5 seconds then quit
      setTimeout(() => {
        console.log('[agent] Quitting after check-out')
        _stopPoller()
        app.quit()
      }, 5000)

    } else if (checkedIn && _isCheckedIn && intervalData.changed) {
      // ── 2. Interval changed while checked in → apply immediately ──────────
      console.log(`[agent] ⚙ Interval changed: ${intervalData.prev} → ${intervalData.minutes} min`)
      scheduler.updateInterval(intervalData.minutes)
      _buildTrayMenu()
      // Push full status so popup updates the interval number live
      _pushStatus({ ...scheduler.getStatus(), checkedIn: true })
    }

  } catch (err) {
    console.warn('[agent] Poll error:', err.message)
  }
}

function _startPoller() {
  if (_pollTimer) return
  _poll()   // run immediately
  _pollTimer = setInterval(_poll, POLL_MS)
  console.log(`[agent] Poller started — every ${POLL_MS / 1000}s`)
}

function _stopPoller() {
  if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null }
  _isCheckedIn = false
}

// ── Screen-Off helpers ────────────────────────────────────────────────────────
async function _onScreenOff(event) {
  if (!auth.isLoggedIn() || !_isCheckedIn || _isOnScreenBreak) return
  _isOnScreenBreak = true
  _screenOffStart  = Date.now()
  console.log(`[agent] 🔒 Screen off (${event}) — recording pause`)
  try {
    await axios.post(
      `${config.getServerUrl()}/api/attendance/pause`,
      { reason: 'screen_lock', comment: `Auto-detected: ${event}` },
      { headers: auth.getHeaders(), timeout: 8000 }
    )
    console.log('[agent] ✅ Screen-off pause recorded')
  } catch (err) {
    // 409 = already on break — fine
    console.warn('[agent] Screen-off pause skipped:', err.response?.data?.message || err.message)
  }
  _buildTrayMenu()
  _pushStatus({ ...scheduler.getStatus(), checkedIn: _isCheckedIn, screenOff: true })
}

async function _onScreenOn() {
  if (!auth.isLoggedIn() || !_isCheckedIn || !_isOnScreenBreak) return
  _isOnScreenBreak = false
  const offSecs = _screenOffStart ? Math.round((Date.now() - _screenOffStart) / 1000) : 0
  _screenOffStart  = null
  console.log(`[agent] 🔓 Screen on — resuming after ${offSecs}s off`)
  try {
    await axios.post(
      `${config.getServerUrl()}/api/attendance/resume`,
      {},
      { headers: auth.getHeaders(), timeout: 8000 }
    )
    console.log('[agent] ✅ Screen-on resume recorded')
  } catch (err) {
    // 404 = no active break — fine (e.g. agent restarted mid-break)
    console.warn('[agent] Screen-on resume skipped:', err.response?.data?.message || err.message)
  }
  _buildTrayMenu()
  _pushStatus({ ...scheduler.getStatus(), checkedIn: _isCheckedIn, screenOff: false })
}

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const icon = nativeImage.createFromPath(path.join(ICON_DIR, 'tray-icon.png'))
  tray       = new Tray(icon)
  tray.setToolTip('Sangria Agent')
  tray.on('click', () => auth.isLoggedIn() ? showStatusWindow() : showLoginWindow())
  _buildTrayMenu()
}

function _buildTrayMenu() {
  if (!tray) return
  const running  = scheduler.isRunning()
  const paused   = scheduler.isPaused()
  const loggedIn = auth.isLoggedIn()
  const user     = auth.getUser()
  const interval = config.getIntervalMinutes()

  const statusLabel = !loggedIn
    ? '⚪  Not logged in'
    : !_isCheckedIn
    ? '⚪  Waiting for check-in'
    : _isOnScreenBreak
    ? '🔒  Screen Off — paused'
    : '🟢  Checked in — capturing'

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: loggedIn ? `👤  ${user?.name || 'Employee'}` : '❌  Not logged in', enabled: false },
    { label: statusLabel, enabled: false },
    { label: running && !paused ? `📸  Every ${interval} min` : paused ? '⏸  Paused (screen off)' : '⏹  Stopped', enabled: false },
    { type: 'separator' },
    { label: 'Open Status', click: () => auth.isLoggedIn() ? showStatusWindow() : showLoginWindow() },
    { type: 'separator' },
    {
      label:   paused ? '▶  Resume' : '⏸  Pause',
      enabled: loggedIn && running,
      click:   () => { paused ? scheduler.resume() : scheduler.pause(); _buildTrayMenu() },
    },
    {
      label:   '📸  Capture Now',
      enabled: loggedIn && _isCheckedIn && !_isOnScreenBreak,
      click:   () => captureAndUpload(),
    },
    { type: 'separator' },
    {
      label: '🌐  Open Sangria Dashboard',
      click: () => shell.openExternal(config.getServerUrl().replace(':5000', ':5173')),
    },
    { type: 'separator' },
    { label: 'Sign Out', enabled: loggedIn, click: _doLogout },
    { label: 'Quit', click: () => { _stopPoller(); scheduler.stop(); app.quit() } },
  ]))
}

function _updateTray(status) {
  if (!tray) return
  const last  = status.lastCapture
    ? new Date(status.lastCapture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never'
  const state = _isOnScreenBreak ? 'Screen Off' : status.paused ? 'Paused' : status.running ? 'Active' : 'Waiting'
  tray.setToolTip(`Sangria Agent — ${state} | Last: ${last} | Today: ${status.captureCount}`)
  _buildTrayMenu()
}

// ── Status window helpers ──────────────────────────────────────────────────────
function _pushStatus(data) {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.webContents.send('status:update', {
      ...data,
      checkedIn: _isCheckedIn,
      screenOff: _isOnScreenBreak,
    })
  }
}
function _pushToStatus(data) {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.webContents.send('checkin:update', { ...data, screenOff: _isOnScreenBreak })
  }
}

// ── Login Window ──────────────────────────────────────────────────────────────
function showLoginWindow() {
  if (loginWin && !loginWin.isDestroyed()) { loginWin.show(); loginWin.focus(); return }
  loginWin = new BrowserWindow({
    width: 360, height: 420,
    resizable: false, maximizable: false, fullscreenable: false,
    frame: false, alwaysOnTop: true, center: true, show: false,
    backgroundColor: '#0f172a',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  })
  loginWin.loadFile(path.join(__dirname, 'renderer', 'login.html'))
  loginWin.once('ready-to-show', () => loginWin.show())
  if (isDev) loginWin.webContents.openDevTools({ mode: 'detach' })
  loginWin.on('closed', () => { loginWin = null })
}

// ── Status Window ─────────────────────────────────────────────────────────────
function showStatusWindow() {
  if (statusWin && !statusWin.isDestroyed()) { statusWin.show(); statusWin.focus(); return }
  const { screen } = require('electron')
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  statusWin = new BrowserWindow({
    width: 300, height: 330,
    x: width - 316, y: height - 346,
    resizable: false, maximizable: false, fullscreenable: false,
    frame: false, alwaysOnTop: true, skipTaskbar: true, show: false,
    backgroundColor: '#1e293b',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: false },
  })
  statusWin.loadFile(path.join(__dirname, 'renderer', 'status.html'))
  statusWin.once('ready-to-show', () => statusWin.show())
  if (isDev) statusWin.webContents.openDevTools({ mode: 'detach' })
  statusWin.on('blur',   () => { if (statusWin && !statusWin.isDestroyed()) statusWin.hide() })
  statusWin.on('closed', () => { statusWin = null })
}

// ── IPC ────────────────────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('auth:login', async (_, username, password) => {
    const user = await auth.login(username, password)   // throws if not employee
    if (loginWin && !loginWin.isDestroyed()) loginWin.close()
    const { minutes } = await config.fetchIntervalFromBackend(auth.getToken())
    scheduler.updateInterval(minutes)
    _startPoller()
    _buildTrayMenu()
    return user
  })

  ipcMain.handle('auth:logout',     ()          => _doLogout())
  ipcMain.handle('auth:getUser',    ()          => auth.getUser())
  ipcMain.handle('auth:isLoggedIn', ()          => auth.isLoggedIn())

  ipcMain.handle('scheduler:start',  ()         => { scheduler.start();  _buildTrayMenu() })
  ipcMain.handle('scheduler:stop',   ()         => { scheduler.stop();   _buildTrayMenu() })
  ipcMain.handle('scheduler:pause',  ()         => { scheduler.pause();  _buildTrayMenu() })
  ipcMain.handle('scheduler:resume', ()         => { scheduler.resume(); _buildTrayMenu() })
  ipcMain.handle('scheduler:status', ()         => ({ ...scheduler.getStatus(), checkedIn: _isCheckedIn }))

  ipcMain.handle('config:get',      ()          => config.getAll())
  ipcMain.handle('config:set',      (_, k, v)   => config.set(k, v))
  ipcMain.handle('checkin:status',  ()          => _isCheckedIn)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function _doLogout() {
  _stopPoller()
  scheduler.stop()
  auth.logout()
  _isCheckedIn     = false
  _isOnScreenBreak = false
  _screenOffStart  = null
  _buildTrayMenu()
  if (statusWin && !statusWin.isDestroyed()) statusWin.close()
  showLoginWindow()
}

function updateActiveWindow() {
  try {
    require('child_process').execFile('powershell', [
      '-NoProfile', '-NonInteractive', '-Command',
      'Add-Type @\'\nusing System; using System.Runtime.InteropServices;\n' +
      'public class W { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();\n' +
      '[DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h,System.Text.StringBuilder s,int n);\n' +
      'public static string Get(){var b=new System.Text.StringBuilder(256);GetWindowText(GetForegroundWindow(),b,256);return b.ToString();}}\n\'@; [W]::Get()',
    ], { timeout: 2000 }, (err, stdout) => {
      if (!err && stdout.trim()) _activeWindow = stdout.trim()
    })
  } catch { /* silent */ }
}
