// preload.js — contextBridge IPC for Timing Agent renderer pages
'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('timingAgent', {
  // Auth
  login:      (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout:     ()                   => ipcRenderer.invoke('auth:logout'),
  getUser:    ()                   => ipcRenderer.invoke('auth:getUser'),
  isLoggedIn: ()                   => ipcRenderer.invoke('auth:isLoggedIn'),

  // Attendance
  checkIn:   (mode) => ipcRenderer.invoke('attendance:checkIn', mode),
  checkOut:  ()     => ipcRenderer.invoke('attendance:checkOut'),
  pause:     (r)    => ipcRenderer.invoke('attendance:pause', r),
  resume:    ()     => ipcRenderer.invoke('attendance:resume'),
  getStatus: ()     => ipcRenderer.invoke('attendance:getStatus'),

  // Window
  closeWindow: () => ipcRenderer.invoke('window:close'),

  // Events from main → renderer
  onStatusUpdate: (cb) => ipcRenderer.on('status:update', (_, data) => cb(data)),
  onError:        (cb) => ipcRenderer.on('status:error',  (_, msg)  => cb(msg)),
})
