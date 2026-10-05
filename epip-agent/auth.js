// auth.js — Token storage for Sangria Screenshot Tool
'use strict'
const Store  = require('electron-store')
const axios  = require('axios')
const config = require('./config')

const store = new Store({
  name: 'sangria-screenshot-auth',
  encryptionKey: 'sangria-ss-auth-v3',
})

module.exports = {
  loginWithToken(token, user) {
    if (!token) throw new Error('No token')
    if (user?.role !== 'employee') throw new Error(`Employees only. Got: "${user?.role}"`)
    store.set('token',   token)
    store.set('user',    user)
    store.set('loginAt', Date.now())
    console.log('[auth] Logged in:', user?.name)
  },

  async login(username, password) {
    const res = await axios.post(
      `${config.getServerUrl()}/api/auth/login`,
      { username, password, expectedRole: 'employee' },
      { timeout: 10000 }
    )
    const { token, user } = res.data.data
    if (!token) throw new Error('No token')
    if (user?.role !== 'employee') throw new Error('Employees only')
    store.set('token', token); store.set('user', user); store.set('loginAt', Date.now())
    return user
  },

  logout()     { store.clear() },
  getToken()   { return store.get('token') || null },
  getUser()    { return store.get('user')  || null },
  isLoggedIn() { return !!store.get('token') },
  getHeaders() { return { Authorization: `Bearer ${this.getToken()}` } },

  async validateToken() {
    const token = this.getToken()
    if (!token) return false
    try {
      const res = await axios.get(`${config.getServerUrl()}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }, timeout: 8000,
      })
      return res.data?.success === true
    } catch { return false }
  },
}
