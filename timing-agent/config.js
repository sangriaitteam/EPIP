// config.js — Smart server URL discovery for EPIP Timing Agent
// Works on:  localhost dev  |  LAN (WiFi/Ethernet)  |  Mobile hotspot
//
// Discovery order:
//   1. Saved working URL from previous session (fast path)
//   2. localhost:5000
//   3. All local network interface IPs on port 5000
//   4. Falls back to saved config file URL
'use strict'

const Store = require('electron-store')
const axios = require('axios')
const os    = require('os')
const path  = require('path')
const fs    = require('fs')

const store = new Store({
  name:          'epip-timing-config',
  encryptionKey: 'epip-timing-v2',
  defaults: {
    serverUrl:    'http://localhost:5000',
    autoStart:    true,
    autoDiscover: true,
  },
})

// ── Load external config file (next to .exe or project root) ─────────────────
;(function loadExternalConfig() {
  const locations = [
    path.join(process.execPath, '..', 'epip-timing.config.json'),
    path.join(process.resourcesPath || '', 'epip-timing.config.json'),
    path.join(__dirname, 'epip-timing.config.json'),
  ]
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(loc, 'utf8'))
        if (cfg.serverUrl)                         store.set('serverUrl',    cfg.serverUrl)
        if (typeof cfg.autoStart    === 'boolean') store.set('autoStart',    cfg.autoStart)
        if (typeof cfg.autoDiscover === 'boolean') store.set('autoDiscover', cfg.autoDiscover)
        console.log('[config] Loaded external config from:', loc)
      } catch (e) { console.warn('[config] Parse error:', e.message) }
      break
    }
  }
})()

// ── Get all candidate IPs from local network interfaces ──────────────────────
function _getLANIPs() {
  const ips = []
  const interfaces = os.networkInterfaces()
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // IPv4 only, skip loopback (127.x handled separately)
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address)
      }
    }
  }
  return ips
}

// ── Probe a single URL — returns true if EPIP backend responds ───────────────
async function _probe(url) {
  try {
    const res = await axios.get(`${url}/health`, { timeout: 2500 })
    return res.data?.service === 'EPIP Backend API'
  } catch {
    return false
  }
}

// ── Auto-discover working server URL ─────────────────────────────────────────
// Called once on startup. Tries saved URL first (fast), then scans LAN.
async function discoverServerUrl() {
  if (!store.get('autoDiscover')) return store.get('serverUrl')

  const candidates = [
    store.get('serverUrl'),          // previously working URL (fast path)
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ]

  // Add all LAN IPs dynamically
  for (const ip of _getLANIPs()) {
    const url = `http://${ip}:5000`
    if (!candidates.includes(url)) candidates.push(url)
  }

  console.log('[config] Probing candidates:', candidates)

  for (const url of candidates) {
    const ok = await _probe(url)
    if (ok) {
      console.log('[config] ✅ Server found at:', url)
      store.set('serverUrl', url)   // save for next session
      return url
    }
  }

  // Nothing responded — keep last known URL and let connection errors surface
  console.warn('[config] ⚠️ No server found — using last known:', store.get('serverUrl'))
  return store.get('serverUrl')
}

module.exports = {
  getServerUrl:    () => store.get('serverUrl'),
  setServerUrl:    (url) => store.set('serverUrl', url),
  isAutoStart:     () => store.get('autoStart'),
  isAutoDiscover:  () => store.get('autoDiscover'),
  discoverServerUrl,
}
