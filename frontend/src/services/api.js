// Real API service — connected to backend at http://localhost:5000/api

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const getToken = () => localStorage.getItem('epip_token')

const request = async (endpoint, options = {}) => {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  try {
    const res  = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })
    const data = await res.json()
    // Attach HTTP status as httpStatus (not 'status' — avoids colliding with data.status fields)
    data.httpStatus = res.status
    return data
  } catch (err) {
    console.error('[API Error]', err.message)
    return { success: false, message: 'Network error — is the backend running?' }
  }
}

export const api = {
  get:    (endpoint)        => request(endpoint, { method: 'GET' }),
  post:   (endpoint, body)  => request(endpoint, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (endpoint, body)  => request(endpoint, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  (endpoint, body)  => request(endpoint, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: (endpoint)        => request(endpoint, { method: 'DELETE' }),
}

export default api
