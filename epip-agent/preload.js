// preload.js — exposes safe IPC bridge to renderer windows
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('epipAgent', {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login:         (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout:        ()                   => ipcRenderer.invoke('auth:logout'),
  getUser:       ()                   => ipcRenderer.invoke('auth:getUser'),
  isLoggedIn:    ()                   => ipcRenderer.invoke('auth:isLoggedIn'),

  // ── Scheduler ─────────────────────────────────────────────────────────────
  startCapture:  ()                   => ipcRenderer.invoke('scheduler:start'),
  stopCapture:   ()                   => ipcRenderer.invoke('scheduler:stop'),
  pauseCapture:  ()                   => ipcRenderer.invoke('scheduler:pause'),
  resumeCapture: ()                   => ipcRenderer.invoke('scheduler:resume'),
  getStatus:     ()                   => ipcRenderer.invoke('scheduler:status'),

  // ── Config ────────────────────────────────────────────────────────────────
  getConfig:     ()                   => ipcRenderer.invoke('config:get'),
  setConfig:     (key, val)           => ipcRenderer.invoke('config:set', key, val),

  // Events from main → renderer
  onStatusUpdate:  (cb) => ipcRenderer.on('status:update',  (_, data) => cb(data)),
  onCaptureResult: (cb) => ipcRenderer.on('capture:result', (_, data) => cb(data)),
  onCheckinUpdate: (cb) => ipcRenderer.on('checkin:update', (_, data) => cb(data)),

  // Check-in state
  getCheckinStatus: () => ipcRenderer.invoke('checkin:status'),
})
