// preload.js — contextBridge IPC for EPIP Timing Agent renderer
'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('epipAgent', {
  // Auth
  login:      (u, p) => ipcRenderer.invoke('auth:login', u, p),
  logout:     ()     => ipcRenderer.invoke('auth:logout'),
  getUser:    ()     => ipcRenderer.invoke('auth:getUser'),
  isLoggedIn: ()     => ipcRenderer.invoke('auth:isLoggedIn'),

  // Attendance
  checkIn:   (mode) => ipcRenderer.invoke('attendance:checkIn', mode),
  checkOut:  ()     => ipcRenderer.invoke('attendance:checkOut'),
  pause:     (r)    => ipcRenderer.invoke('attendance:pause', r),
  resume:    ()     => ipcRenderer.invoke('attendance:resume'),
  getStatus: ()     => ipcRenderer.invoke('attendance:getStatus'),

  // Window
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Push events: main → renderer
  onStatusUpdate: (cb) => ipcRenderer.on('status:update', (_, d) => cb(d)),
  onError:        (cb) => ipcRenderer.on('status:error',  (_, m) => cb(m)),
})
