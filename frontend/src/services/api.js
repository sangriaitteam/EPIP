// api.js — HTTP client for EPIP backend
//
// URL resolution order:
//   1. VITE_API_URL env var (set at build time for production / Docker)
//   2. /api  (relative — works when frontend + backend served from same nginx)
//   3. http://<current-host>:5000/api  (works on any LAN IP, Wi-Fi, Ethernet, IPv6)
//
// This means employees can access the system via Wi-Fi, Ethernet,
// IPv4 (192.168.x.x / 10.x.x.x) or IPv6 — no hardcoded IPs needed.

const _resolveBaseUrl = () => {
  // Explicit env var always wins (production builds, Docker)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL
  }
  // In production build served by nginx — use relative path
  if (import.meta.env.PROD) {
    return '/api'
  }
  // Dev mode: use same host as the browser, port 5000
  // Works for: localhost, 192.168.x.x, 10.x.x.x, [::1], [fe80::...], etc.
  const { protocol, hostname } = window.location
  // IPv6 addresses need brackets in URLs
  const host = hostname.includes(':') ? `[${hostname}]` : hostname
  return `${protocol}//${host}:5000/api`
}

const BASE_URL = _resolveBaseUrl()

const getToken = () => localStorage.getItem('epip_token')

const request = async (endpoint, options = {}) => {
  const token   = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  try {
    const res  = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers })
    const data = await res.json()
    data.httpStatus = res.status
    return data
  } catch (err) {
    console.error('[API Error]', err.message)
    return { success: false, message: 'Network error — is the backend running?' }
  }
}

export const api = {
  get:    (endpoint)       => request(endpoint, { method: 'GET' }),
  post:   (endpoint, body) => request(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (endpoint, body) => request(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (endpoint, body) => request(endpoint, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (endpoint)       => request(endpoint, { method: 'DELETE' }),
}

export default api
