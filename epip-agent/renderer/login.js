// renderer/login.js — login window logic
const usernameEl = document.getElementById('username')
const passwordEl = document.getElementById('password')
const loginBtn   = document.getElementById('loginBtn')
const errorBox   = document.getElementById('errorBox')

function showError(msg) {
  errorBox.textContent = msg
  errorBox.classList.add('show')
}
function clearError() {
  errorBox.textContent = ''
  errorBox.classList.remove('show')
}
function setLoading(on) {
  loginBtn.disabled = on
  loginBtn.innerHTML = on
    ? '<span class="spinner"></span>Signing in…'
    : 'Sign In'
}

async function doLogin() {
  clearError()
  const username = usernameEl.value.trim()
  const password = passwordEl.value

  if (!username) { showError('Please enter your username or email'); return }
  if (!password) { showError('Please enter your password'); return }

  setLoading(true)
  try {
    const user = await window.epipAgent.login(username, password)
    // Main process will close this window and show tray on success
    console.log('Logged in as', user?.name)
  } catch (err) {
    showError(err?.message || 'Login failed. Check your credentials and server connection.')
    setLoading(false)
  }
}

// Allow Enter key to submit
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doLogin()
})

// Focus username on load
window.addEventListener('DOMContentLoaded', () => {
  usernameEl.focus()
})
