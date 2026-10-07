// capture.js — Screenshot capture for Sangria Screenshot Tool
// Uses desktopCapturer directly in main process (Electron 29 supports this)
// Small fixed thumbnail size (1280x720) — reliable, fast, small file size
'use strict'
const { desktopCapturer } = require('electron')
const axios    = require('axios')
const FormData = require('form-data')
const config   = require('./config')
const auth     = require('./auth')

async function captureAndUpload() {
  try {
    // Small fixed size — reliable across all Windows machines
    const sources = await desktopCapturer.getSources({
      types:         ['screen'],
      thumbnailSize: { width: 1280, height: 720 },
      fetchWindowIcons: false,
    })

    if (!sources?.length) {
      console.warn('[capture] No sources')
      return false
    }

    const png = sources[0].thumbnail.toPNG()
    if (!png || png.length < 500) {
      console.warn('[capture] Empty buffer:', png?.length)
      return false
    }

    const ts   = new Date().toISOString().replace(/[:.]/g, '-')
    const form = new FormData()
    form.append('screenshot', png, { filename: `sc-${ts}.png`, contentType: 'image/png' })
    form.append('active_window_title', 'Screen Capture')
    form.append('captured_at', new Date().toISOString())

    await axios.post(
      `${config.getServerUrl()}/api/screenshots/my`,
      form,
      {
        headers: { ...auth.getHeaders(), ...form.getHeaders() },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength:    Infinity,
      }
    )
    console.log(`[capture] ✅ Uploaded ${(png.length / 1024).toFixed(0)} KB`)
    return true
  } catch (err) {
    console.error('[capture] ❌', err.response?.data?.message || err.message)
    return false
  }
}

module.exports = { captureAndUpload }
