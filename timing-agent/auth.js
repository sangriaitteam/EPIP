// auth.js — login, JWT storage, token management for Timing Agent
'use strict'
const Store  = require('electron-store')
const axios  = require('axios')
const config = require('./config')

const authStore = new Store({
  name:          'screenlock-auth',
  encryptionKey: 'screenlock-secure-v1',
})

const auth = {
  // ── Normal login (fallback — not used when website launches agent) ────────
  async login(username, password) {
    const url = `${config.getServerUrl()}/api/auth/login`
    const res = await axios.post(url,
      { username, password, expectedRole: 'employee' },
      { timeout: 10000 }
    )
    const { token, user } = res.data.data
    if (!token) throw new Error('No token received from server')
    if (user?.role !== 'employee') {
      throw new Error(
        `This agent is for employees only.\nYour role is "${user?.role}".`
      )
    }
    authStore.set('token',   token)
    authStore.set('user',    user)
    authStore.set('loginAt', Date.now())
    return user
  },

  // ── Token-based login — called when website launches agent via deep-link ──
  // Website passes its JWT + user JSON directly; no password needed
  loginWithToken(token, user) {
    if (!token) throw new Error('No token provided')
    if (user?.role !== 'employee') {
      throw new Error(`Agent is for employees only. Role: "${user?.role}"`)
    }
    authStore.set('token',   token)
    authStore.set('user',    user)
    authStore.set('loginAt', Date.now())
    console.log('[auth] Logged in via website token for:', user?.name)
    return user
  },

  logout() { authStore.clear() },

  getToken()   { return authStore.get('token') || null },
  getUser()    { return authStore.get('user')  || null },
  isLoggedIn() { return !!authStore.get('token') },

  getHeaders() {
    return { Authorization: `Bearer ${this.getToken()}` }
  },

  async validateToken() {
    const token = this.getToken()
    if (!token) return false
    try {
      const res = await axios.get(`${config.getServerUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      })
      const user = res.data?.data?.user
      if (user && user.role !== 'employee') { this.logout(); return false }
      return res.data?.success === true
    } catch { return false }
  },
}

module.exports = auth
