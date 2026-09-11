/**
 * Login brute-force protection
 *
 * Rules:
 * - employee / hr (Admin): max 20 failed attempts → 15 min lock
 * - superadmin / admin:    no lock (unlimited attempts)
 *
 * Storage: in-memory Map (per-process, resets on restart)
 * Key: loginId (email or username) — case-insensitive
 */

const MAX_ATTEMPTS  = 20
const LOCK_DURATION = 15 * 60 * 1000  // 15 minutes in ms

// Map<loginId, { attempts: number, lockedUntil: number|null }>
const store = new Map()

// Roles that are exempt from lockout
const EXEMPT_ROLES = ['admin', 'superadmin']

/**
 * Normalise the login identifier to lowercase
 */
const key = (loginId) => (loginId || '').toLowerCase().trim()

/**
 * Check if this loginId is currently locked.
 * Returns { locked: false } or { locked: true, remainingMs, remainingSecs, remainingMins }
 */
const checkLock = (loginId) => {
  const entry = store.get(key(loginId))
  if (!entry || !entry.lockedUntil) return { locked: false }

  const now = Date.now()
  if (now >= entry.lockedUntil) {
    // Lock expired — clear it
    store.delete(key(loginId))
    return { locked: false }
  }

  const remainingMs   = entry.lockedUntil - now
  const remainingSecs = Math.ceil(remainingMs / 1000)
  const remainingMins = Math.ceil(remainingMs / 60000)
  return { locked: true, remainingMs, remainingSecs, remainingMins }
}

/**
 * Record a failed login attempt.
 * If attempts reach MAX_ATTEMPTS, lock the account.
 * Pass the resolved user role so exempt roles are skipped.
 *
 * @param {string} loginId
 * @param {string|null} role  — pass null if user was not found
 * @returns {{ locked: boolean, attemptsLeft: number }}
 */
const recordFailure = (loginId, role = null) => {
  // Exempt roles — never lock
  if (role && EXEMPT_ROLES.includes(role)) {
    return { locked: false, attemptsLeft: Infinity }
  }

  const k     = key(loginId)
  const entry = store.get(k) || { attempts: 0, lockedUntil: null }

  entry.attempts += 1

  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_DURATION
    store.set(k, entry)
    const remainingSecs = Math.ceil(LOCK_DURATION / 1000)
    const remainingMins = Math.ceil(LOCK_DURATION / 60000)
    return { locked: true, attemptsLeft: 0, remainingSecs, remainingMins }
  }

  store.set(k, entry)
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - entry.attempts }
}

/**
 * Reset failure count on successful login.
 */
const recordSuccess = (loginId) => {
  store.delete(key(loginId))
}

/**
 * Get current attempt count (for debugging / admin use)
 */
const getAttempts = (loginId) => {
  return store.get(key(loginId))?.attempts || 0
}

module.exports = { checkLock, recordFailure, recordSuccess, getAttempts, MAX_ATTEMPTS, LOCK_DURATION }
