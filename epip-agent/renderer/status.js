// renderer/status.js — status popup logic
let _paused = false

async function refresh() {
  try {
    const [status, user] = await Promise.all([
      window.epipAgent.getStatus(),
      window.epipAgent.getUser(),
    ])

    // User info
    if (user) {
      const name = user.name || user.username || 'Employee'
      document.getElementById('userName').textContent    = name
      document.getElementById('userRole').textContent    = user.role || '—'
      document.getElementById('userInitial').textContent = name.charAt(0).toUpperCase()
    }

    // Check-in status
    const checkinEl = document.getElementById('checkinStatus')
    if (status.checkedIn) {
      checkinEl.textContent  = '✅ Checked In'
      checkinEl.style.color  = '#4ade80'
    } else {
      checkinEl.textContent  = '⏸ Not checked in'
      checkinEl.style.color  = '#94a3b8'
    }

    // Status badge
    const badge = document.getElementById('statusBadge')
    if (!status.checkedIn) {
      badge.textContent = 'Waiting'
      badge.className   = 'status-badge badge-stopped'
      _paused = false
    } else if (status.paused) {
      badge.textContent = 'Paused'
      badge.className   = 'status-badge badge-paused'
      _paused = true
    } else if (status.running) {
      badge.textContent = 'Active'
      badge.className   = 'status-badge badge-active'
      _paused = false
    } else {
      badge.textContent = 'Stopped'
      badge.className   = 'status-badge badge-stopped'
    }

    // Stats
    document.getElementById('interval').textContent     = `${status.intervalMin} min`
    document.getElementById('captureCount').textContent = `${status.captureCount} screenshots`
    document.getElementById('lastCapture').textContent  = status.lastCapture
      ? new Date(status.lastCapture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : 'Not yet'

    // Pause button
    const pauseBtn = document.getElementById('pauseBtn')
    pauseBtn.textContent = _paused ? '▶ Resume' : '⏸ Pause'
    pauseBtn.className   = _paused ? 'btn btn-resume' : 'btn btn-pause'
    pauseBtn.disabled    = !status.checkedIn
  } catch (err) {
    console.error('Status refresh error:', err)
  }
}

async function togglePause() {
  if (_paused) {
    await window.epipAgent.resumeCapture()
  } else {
    await window.epipAgent.pauseCapture()
  }
  await refresh()
}

async function captureNow() {
  const btn = document.getElementById('captureBtn')
  btn.textContent = '⏳ Capturing…'
  btn.disabled    = true
  // Trigger via start which does immediate capture
  await window.epipAgent.startCapture()
  setTimeout(async () => {
    btn.textContent = '📸 Capture Now'
    btn.disabled    = false
    await refresh()
  }, 2500)
}

async function doLogout() {
  await window.epipAgent.logout()
  // Main process will reopen login window
}

// Listen for live updates pushed from main process
window.epipAgent.onStatusUpdate((data) => {
  if (data.captureCount !== undefined)
    document.getElementById('captureCount').textContent = `${data.captureCount} screenshots`
  if (data.lastCapture)
    document.getElementById('lastCapture').textContent =
      new Date(data.lastCapture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  // Interval changed — update live without full refresh
  if (data.intervalMin !== undefined)
    document.getElementById('interval').textContent = `${data.intervalMin} min`
  // Full refresh if checkedIn state changes
  if (data.checkedIn !== undefined) refresh()
})

// Initial load
window.addEventListener('DOMContentLoaded', refresh)
