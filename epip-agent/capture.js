// capture.js — full Windows screen capture + upload to EPIP backend
const { desktopCapturer, screen } = require('electron')
const axios      = require('axios')
const FormData   = require('form-data')
const config     = require('./config')
const auth       = require('./auth')

// ── Get active window title via Electron's built-in ──────────────────────────
// NOTE: requires the main process to expose it via IPC
let _getActiveWindowTitle = () => 'Unknown'
function setActiveWindowTitleFn(fn) { _getActiveWindowTitle = fn }

// ── Capture all screens and upload ───────────────────────────────────────────
async function captureAndUpload() {
  if (!auth.isLoggedIn()) {
    console.log('[capture] Skipping — not logged in')
    return { success: false, reason: 'not_logged_in' }
  }

  try {
    // Get all display sources (multi-monitor support)
    const displays = screen.getAllDisplays()
    const sources  = await desktopCapturer.getSources({
      types:            ['screen'],
      thumbnailSize:    { width: 1920, height: 1080 },
      fetchWindowIcons: false,
    })

    if (!sources.length) {
      console.warn('[capture] No screen sources found')
      return { success: false, reason: 'no_sources' }
    }

    const activeWindowTitle = _getActiveWindowTitle()
    const results = []

    for (const source of sources) {
      try {
        // Get PNG buffer from thumbnail
        const thumbnail  = source.thumbnail
        const pngBuffer  = thumbnail.toPNG()

        if (!pngBuffer || pngBuffer.length === 0) {
          console.warn(`[capture] Empty buffer for source: ${source.name}`)
          continue
        }

        // Build multipart form
        const form = new FormData()
        form.append('screenshot', pngBuffer, {
          filename:    `screenshot-${Date.now()}.png`,
          contentType: 'image/png',
        })
        form.append('active_window_title', activeWindowTitle)
        form.append('monitor_name',        source.name)
        form.append('monitor_count',       String(displays.length))

        const url = `${config.getServerUrl()}/api/screenshots/my`
        const res = await axios.post(url, form, {
          headers: {
            ...auth.getHeaders(),
            ...form.getHeaders(),
          },
          timeout:  30000,
          maxBodyLength: Infinity,
        })

        if (res.data?.success) {
          console.log(`[capture] ✅ Uploaded — ${source.name} — window: "${activeWindowTitle}"`)
          results.push({ monitor: source.name, success: true })
        } else {
          console.warn(`[capture] ❌ Upload failed for ${source.name}:`, res.data)
          results.push({ monitor: source.name, success: false })
        }
      } catch (err) {
        console.error(`[capture] Error for source ${source.name}:`, err.message)
        results.push({ monitor: source.name, success: false, error: err.message })
      }
    }

    const anySuccess = results.some(r => r.success)
    return { success: anySuccess, results, timestamp: new Date().toISOString() }

  } catch (err) {
    console.error('[capture] Fatal error:', err.message)
    return { success: false, reason: err.message }
  }
}

module.exports = { captureAndUpload, setActiveWindowTitleFn }
