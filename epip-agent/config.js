// config.js — Smart network auto-discovery for Sangria Screenshot Tool
'use strict'
const Store = require('electron-store')
const axios = require('axios')
const os    = require('os')
const path  = require('path')
const fs    = require('fs')

const store = new Store({
  name: 'sangria-screenshot-config',
  encryptionKey: 'sangria-ss-v3',
  defaults: {
    serverUrl:       'http://localhost:5000',
    autoStart:       true,
    intervalMinutes: 10,
  },
})

// Load external config file (next to .exe or project root)
;(function loadExternalConfig() {
  const locations = [
    path.join(process.execPath, '..', 'sangria-screenshot.config.json'),
    path.join(process.resourcesPath || '', 'sangria-screenshot.config.json'),
    path.join(__dirname, 'sangria-screenshot.config.json'),
  ]
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(loc, 'utf8'))
        if (cfg.serverUrl)                           store.set('serverUrl',       cfg.serverUrl)
        if (typeof cfg.autoStart === 'boolean')      store.set('autoStart',       cfg.autoStart)
        if (typeof cfg.intervalMinutes === 'number') store.set('intervalMinutes', cfg.intervalMinutes)
        console.log('[config] Loaded from:', loc)
      } catch (e) { console.warn('[config] Error:', e.message) }
      break
    }
  }
})()

function _getLANIPs() {
  const ips = []
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) ips.push(i.address)
    }
  }
  return ips
}

async function _probe(url) {
  try {
    const res = await axios.get(`${url}/health`, { timeout: 2000 })
    return res.data?.service === 'EPIP Backend API'
  } catch { return false }
}

async function discoverServerUrl() {
  const candidates = [
    store.get('serverUrl'),
    'http://localhost:5000',
    'http://127.0.0.1:5000',
    ..._getLANIPs().map(ip => `http://${ip}:5000`),
  ]
  const unique = [...new Set(candidates)]
  console.log('[config] Probing:', unique)
  for (const url of unique) {
    if (await _probe(url)) {
      console.log('[config] ✅ Server:', url)
      store.set('serverUrl', url)
      return url
    }
  }
  console.warn('[config] ⚠️ Using last known:', store.get('serverUrl'))
  return store.get('serverUrl')
}

async function fetchInterval(token) {
  try {
    const res = await axios.get(`${store.get('serverUrl')}/api/attendance/agent-config`, {
      headers: { Authorization: `Bearer ${token}` }, timeout: 8000,
    })
    const mins = parseInt(res.data?.data?.interval_minutes || 10)
    store.set('intervalMinutes', mins)
    return mins
  } catch {
    return store.get('intervalMinutes') || 10
  }
}

module.exports = {
  getServerUrl:      () => store.get('serverUrl'),
  isAutoStart:       () => store.get('autoStart'),
  getInterval:       () => store.get('intervalMinutes'),
  discoverServerUrl,
  fetchInterval,
}
