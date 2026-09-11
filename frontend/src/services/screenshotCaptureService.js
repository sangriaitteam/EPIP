/**
 * screenshotCaptureService.js
 *
 * Captures the current browser window using html2canvas
 * and uploads to the backend at the configured interval.
 *
 * Called from DashboardLayout when employee is logged in and checked in.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

let captureTimer = null

// Convert canvas to Blob
const canvasToBlob = (canvas) =>
  new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7))

// Capture + upload one screenshot
export const captureAndUpload = async () => {
  try {
    const token = localStorage.getItem('epip_token')
    if (!token) return

    // Dynamically import html2canvas to avoid SSR issues
    const html2canvas = (await import('html2canvas')).default

    const canvas = await html2canvas(document.body, {
      scale:           0.5,          // 50% size — smaller file
      useCORS:         true,
      allowTaint:      true,
      logging:         false,
      ignoreElements:  (el) => el.classList?.contains('no-screenshot'),
    })

    const blob = await canvasToBlob(canvas)
    const formData = new FormData()
    formData.append('screenshot', blob, `ss_${Date.now()}.jpg`)

    await fetch(`${BASE_URL}/screenshots/my`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}` },
      body:    formData,
    })

    console.log('[Screenshot] Captured and uploaded')
  } catch (err) {
    console.warn('[Screenshot] Capture failed:', err.message)
  }
}

// Start auto-capture at given interval (minutes)
export const startCapture = (intervalMinutes = 10) => {
  stopCapture() // clear any existing timer
  const ms = intervalMinutes * 60 * 1000

  // First capture after 30 seconds
  const firstTimeout = setTimeout(() => {
    captureAndUpload()
    captureTimer = setInterval(captureAndUpload, ms)
  }, 30 * 1000)

  // Store reference
  captureTimer = firstTimeout
  console.log(`[Screenshot] Auto-capture started — every ${intervalMinutes} min`)
}

export const stopCapture = () => {
  if (captureTimer) {
    clearInterval(captureTimer)
    clearTimeout(captureTimer)
    captureTimer = null
    console.log('[Screenshot] Auto-capture stopped')
  }
}
