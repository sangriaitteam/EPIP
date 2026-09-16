// auth.js — login, JWT storage, token management
const Store   = require('electron-store')
const axios   = require('axios')
const config  = require('./config')

// Separate encrypted store for credentials
const authStore = new Store({
  name: 'epip-agent-auth',
  encryptionKey: 'epip-auth-secure-v1',
})

const auth = {
  // ── Login ────────────────────────────────────────────────────────────────
  async login(username, password) {
    const url = `${config.getServerUrl()}/api/auth/login`
    const res = await axios.post(url, { username, password }, { timeout: 10000 })
    const { token, user } = res.data.data

    if (!token) throw new Error('No token received from server')

    // ✅ EMPLOYEE ONLY — block HR, Admin, Superadmin
    if (user?.role !== 'employee') {
      throw new Error(
        `This agent is for employees only.\n` +
        `Your role is "${user?.role}" — please use the web dashboard instead.`
      )
    }

    authStore.set('token',   token)
    authStore.set('user',    user)
    authStore.set('loginAt', Date.now())
    return user
  },

  // ── Logout ───────────────────────────────────────────────────────────────
  logout() {
    authStore.clear()
  },

  // ── Accessors ────────────────────────────────────────────────────────────
  getToken()   { return authStore.get('token') || null },
  getUser()    { return authStore.get('user')  || null },
  isLoggedIn() { return !!authStore.get('token') },

  // ── Token validation — ping backend ──────────────────────────────────────
  async validateToken() {
    const token = this.getToken()
    if (!token) return false
    try {
      const url = `${config.getServerUrl()}/api/auth/me`
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 8000,
      })
      // Also re-check role on revalidation
      const user = res.data?.data
      if (user && user.role !== 'employee') {
        this.logout()
        return false
      }
      return res.data?.success === true
    } catch {
      return false
    }
  },

  // ── Auth header for axios requests ───────────────────────────────────────
  getHeaders() {
    return { Authorization: `Bearer ${this.getToken()}` }
  },
}

module.exports = auth
