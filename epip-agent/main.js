// main.js — EPIP Desktop Agent
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
  app.setAppUserModelId('com.epip.agent')

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

  // Pause capture on system sleep / screen lock
  powerMonitor.on('suspend',       () => scheduler.isRunning() && scheduler.pause())
  powerMonitor.on('resume',        () => scheduler.isPaused()  && scheduler.resume())
  powerMonitor.on('lock-screen',   () => scheduler.isRunning() && scheduler.pause())
  powerMonitor.on('unlock-screen', () => scheduler.isPaused()  && scheduler.resume())

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
      _isCheckedIn = true
      console.log('[agent] ✅ Checked in — starting capture')
      scheduler.updateInterval(intervalData.minutes)
      scheduler.start()
      _buildTrayMenu()
      _pushToStatus({ checkedIn: true })

    } else if (!checkedIn && _isCheckedIn) {
      // Just checked out → stop capturing then quit agent
      _isCheckedIn = false
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

// ── Tray ──────────────────────────────────────────────────────────────────────
function createTray() {
  const icon = nativeImage.createFromPath(path.join(ICON_DIR, 'tray-icon.png'))
  tray       = new Tray(icon)
  tray.setToolTip('EPIP Agent')
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

  tray.setContextMenu(Menu.buildFromTemplate([
    { label: loggedIn ? `👤  ${user?.name || 'Employee'}` : '❌  Not logged in', enabled: false },
    { label: _isCheckedIn ? '🟢  Checked in — capturing' : '⚪  Waiting for check-in', enabled: false },
    { label: running && !paused ? `📸  Every ${interval} min` : paused ? '⏸  Paused' : '⏹  Stopped', enabled: false },
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
      enabled: loggedIn && _isCheckedIn,
      click:   () => captureAndUpload(),
    },
    { type: 'separator' },
    {
      label: '🌐  Open EPIP Dashboard',
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
  const state = status.paused ? 'Paused' : status.running ? 'Active' : 'Waiting'
  tray.setToolTip(`EPIP Agent — ${state} | Last: ${last} | Today: ${status.captureCount}`)
  _buildTrayMenu()
}

// ── Status window helpers ──────────────────────────────────────────────────────
function _pushStatus(data) {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.webContents.send('status:update', { ...data, checkedIn: _isCheckedIn })
  }
}
function _pushToStatus(data) {
  if (statusWin && !statusWin.isDestroyed()) {
    statusWin.webContents.send('checkin:update', data)
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
  _isCheckedIn = false
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
