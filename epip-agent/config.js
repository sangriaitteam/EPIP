// config.js — local settings + backend interval sync
const Store = require('electron-store')
const axios = require('axios')
const path  = require('path')
const fs    = require('fs')

const store = new Store({
  name: 'epip-agent-config',
  defaults: {
    serverUrl:       'http://localhost:5000',
    intervalMinutes: 10,
    autoStart:       true,
  },
  encryptionKey: 'epip-agent-v1',
})

// ── Load server URL from epip-agent.config.json if present ───────────────────
// IT team deploys this file alongside the .exe with the production URL.
// This runs once at startup and writes the URL into the encrypted store.
function loadExternalConfig() {
  // Look for config file next to the executable (production)
  // or in the project root (development)
  const locations = [
    path.join(process.execPath, '..', 'epip-agent.config.json'),
    path.join(__dirname, 'epip-agent.config.json'),
  ]

  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const raw = fs.readFileSync(loc, 'utf8')
        const cfg = JSON.parse(raw)
        if (cfg.serverUrl && cfg.serverUrl !== store.get('serverUrl')) {
          console.log(`[config] Server URL loaded from config file: ${cfg.serverUrl}`)
          store.set('serverUrl', cfg.serverUrl)
        }
        if (cfg.intervalMinutes && typeof cfg.intervalMinutes === 'number') {
          store.set('intervalMinutes', cfg.intervalMinutes)
        }
        if (typeof cfg.autoStart === 'boolean') {
          store.set('autoStart', cfg.autoStart)
        }
        break
      } catch (err) {
        console.warn('[config] Could not parse config file:', err.message)
      }
    }
  }
}

// Load external config on startup
loadExternalConfig()

const config = {
  get:    (key)      => store.get(key),
  set:    (key, val) => store.set(key, val),
  getAll: ()         => store.store,

  getServerUrl:       () => store.get('serverUrl'),
  getIntervalMinutes: () => store.get('intervalMinutes'),
  getIntervalMs:      () => store.get('intervalMinutes') * 60 * 1000,
  isAutoStart:        () => store.get('autoStart'),

  // ── Fetch interval from /api/attendance/agent-config (employee-accessible)
  // Returns { minutes, changed, prev }
  async fetchIntervalFromBackend(token) {
    try {
      const url = `${store.get('serverUrl')}/api/attendance/agent-config`
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 6000,
      })
      const raw     = res.data?.data?.interval_minutes
      const minutes = parseInt(raw)
      if (!isNaN(minutes) && minutes > 0) {
        const prev    = store.get('intervalMinutes')
        const changed = prev !== minutes
        if (changed) {
          store.set('intervalMinutes', minutes)
          console.log(`[config] Interval: ${prev} → ${minutes} min`)
        }
        return { minutes, changed, prev }
      }
    } catch (err) {
      console.warn('[config] Interval fetch failed:', err.message)
    }
    const current = store.get('intervalMinutes')
    return { minutes: current, changed: false, prev: current }
  },
}

module.exports = config
