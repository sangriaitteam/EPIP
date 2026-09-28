// config.js — server URL config for Timing Agent
'use strict'
const Store = require('electron-store')
const path  = require('path')
const fs    = require('fs')

const store = new Store({
  name: 'epip-timing-config',
  defaults: { serverUrl: 'http://localhost:5000', autoStart: true },
  encryptionKey: 'epip-timing-v1',
})

// Load external config file (next to .exe or project root)
;(function loadExternalConfig() {
  const locations = [
    path.join(process.execPath, '..', 'epip-timing.config.json'),
    path.join(__dirname, 'epip-timing.config.json'),
  ]
  for (const loc of locations) {
    if (fs.existsSync(loc)) {
      try {
        const cfg = JSON.parse(fs.readFileSync(loc, 'utf8'))
        if (cfg.serverUrl) store.set('serverUrl', cfg.serverUrl)
        if (typeof cfg.autoStart === 'boolean') store.set('autoStart', cfg.autoStart)
      } catch (e) { console.warn('[config] Parse error:', e.message) }
      break
    }
  }
})()

module.exports = {
  getServerUrl: () => store.get('serverUrl'),
  isAutoStart:  () => store.get('autoStart'),
  getAll:       () => store.store,
  set:          (k, v) => store.set(k, v),
}
