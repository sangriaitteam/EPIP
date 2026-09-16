// scheduler.js — interval timer, start/stop/pause logic
const config = require('./config')
const { captureAndUpload } = require('./capture')

let _timer          = null
let _paused         = false
let _lastCapture    = null
let _captureCount   = 0
let _currentInterval = 0        // track what interval the timer was set with
let _onStatusChange = null

function setStatusCallback(fn) { _onStatusChange = fn }

function _notifyStatus() {
  if (_onStatusChange) _onStatusChange(getStatus())
}

// ── Start ────────────────────────────────────────────────────────────────────
function start() {
  // If already running with same interval — do nothing
  const intervalMs = config.getIntervalMs()
  if (_timer && _currentInterval === intervalMs) return

  // Stop existing timer first
  if (_timer) {
    clearInterval(_timer)
    _timer = null
  }

  _paused          = false
  _currentInterval = intervalMs
  console.log(`[scheduler] Starting — interval: ${config.getIntervalMinutes()} min`)

  // Capture immediately, then repeat
  _doCapture()
  _timer = setInterval(_doCapture, intervalMs)
  _notifyStatus()
}

// ── Stop ─────────────────────────────────────────────────────────────────────
function stop() {
  if (_timer) {
    clearInterval(_timer)
    _timer = null
  }
  _paused          = false
  _currentInterval = 0
  console.log('[scheduler] Stopped')
  _notifyStatus()
}

// ── Pause / Resume ────────────────────────────────────────────────────────────
function pause() {
  _paused = true
  console.log('[scheduler] Paused')
  _notifyStatus()
}

function resume() {
  if (!_timer) { start(); return }
  _paused = false
  console.log('[scheduler] Resumed')
  _doCapture()
  _notifyStatus()
}

// ── Update interval — restarts timer with new interval ───────────────────────
function updateInterval(minutes) {
  const newMs = minutes * 60 * 1000
  if (_currentInterval === newMs && _timer) return   // no change needed

  console.log(`[scheduler] Updating interval → ${minutes} min`)
  config.set('intervalMinutes', minutes)

  if (_timer) {
    // Restart with new interval
    clearInterval(_timer)
    _timer           = null
    _currentInterval = newMs
    _timer = setInterval(_doCapture, newMs)
    console.log(`[scheduler] Restarted — interval: ${minutes} min`)
  }
  _notifyStatus()
}

// ── Internal capture ──────────────────────────────────────────────────────────
async function _doCapture() {
  if (_paused) return
  try {
    const result = await captureAndUpload()
    if (result.success) {
      _captureCount++
      _lastCapture = new Date()
      console.log(`[scheduler] Capture #${_captureCount} at ${_lastCapture.toLocaleTimeString()}`)
    }
    _notifyStatus()
  } catch (err) {
    console.error('[scheduler] Capture error:', err.message)
    _notifyStatus()
  }
}

// ── Status ────────────────────────────────────────────────────────────────────
function getStatus() {
  return {
    running:      !!_timer,
    paused:       _paused,
    lastCapture:  _lastCapture ? _lastCapture.toISOString() : null,
    captureCount: _captureCount,
    intervalMin:  config.getIntervalMinutes(),
  }
}

function isRunning() { return !!_timer }
function isPaused()  { return _paused  }

module.exports = {
  start, stop, pause, resume, updateInterval,
  getStatus, isRunning, isPaused, setStatusCallback,
}
