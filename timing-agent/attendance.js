// attendance.js — Attendance API wrappers for EPIP Timing Agent
'use strict'
const axios  = require('axios')
const config = require('./config')
const auth   = require('./auth')

const BASE = () => `${config.getServerUrl()}/api/attendance`
const HDR  = () => auth.getHeaders()
const OPTS = { timeout: 10000 }

const attendance = {
  async getToday() {
    const res = await axios.get(`${BASE()}/today`, { headers: HDR(), timeout: 8000 })
    return res.data?.data || null
  },

  async checkIn(work_mode = 'office') {
    const res = await axios.post(`${BASE()}/check-in`, { work_mode }, { headers: HDR(), ...OPTS })
    return res.data?.data
  },

  async checkOut() {
    const res = await axios.post(`${BASE()}/check-out`, {}, { headers: HDR(), ...OPTS })
    return res.data?.data
  },

  // reason: tea_break | lunch_break | meeting | personal | other | screen_lock
  async pauseWork(reason = 'other', comment = '') {
    const res = await axios.post(`${BASE()}/pause`, { reason, comment }, { headers: HDR(), ...OPTS })
    return res.data?.data
  },

  async resumeWork() {
    const res = await axios.post(`${BASE()}/resume`, {}, { headers: HDR(), ...OPTS })
    return res.data?.data
  },

  async getMyPauses() {
    const res = await axios.get(`${BASE()}/pauses`, { headers: HDR(), timeout: 8000 })
    return res.data?.data || []
  },
}

module.exports = attendance
