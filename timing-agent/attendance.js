// attendance.js — all attendance API wrappers for Timing Agent
'use strict'
const axios  = require('axios')
const config = require('./config')
const auth   = require('./auth')

const BASE = () => `${config.getServerUrl()}/api/attendance`
const HDR  = () => auth.getHeaders()

const attendance = {
  // GET /api/attendance/today
  async getToday() {
    const res = await axios.get(`${BASE()}/today`, { headers: HDR(), timeout: 8000 })
    return res.data?.data || null
  },

  // POST /api/attendance/check-in
  async checkIn(work_mode = 'office') {
    const res = await axios.post(`${BASE()}/check-in`, { work_mode }, { headers: HDR(), timeout: 10000 })
    return res.data?.data
  },

  // POST /api/attendance/check-out
  async checkOut() {
    const res = await axios.post(`${BASE()}/check-out`, {}, { headers: HDR(), timeout: 10000 })
    return res.data?.data
  },

  // POST /api/attendance/pause
  async pauseWork(reason = 'other', comment = '') {
    const res = await axios.post(`${BASE()}/pause`, { reason, comment }, { headers: HDR(), timeout: 10000 })
    return res.data?.data
  },

  // POST /api/attendance/resume
  async resumeWork() {
    const res = await axios.post(`${BASE()}/resume`, {}, { headers: HDR(), timeout: 10000 })
    return res.data?.data
  },

  // GET /api/attendance/pauses
  async getMyPauses() {
    const res = await axios.get(`${BASE()}/pauses`, { headers: HDR(), timeout: 8000 })
    return res.data?.data || []
  },
}

module.exports = attendance
