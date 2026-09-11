const fs   = require('fs')
const path = require('path')
const { UPLOAD_DIR } = require('../config/storage')

/**
 * Delete a file from local storage
 */
const deleteFile = (subDir, filename) => {
  try {
    const filePath = path.join(UPLOAD_DIR, subDir, filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
  } catch (err) {
    console.error('[STORAGE] Delete failed:', err.message)
  }
  return false
}

/**
 * Get file size in KB
 */
const getFileSize = (subDir, filename) => {
  try {
    const filePath = path.join(UPLOAD_DIR, subDir, filename)
    const stats = fs.statSync(filePath)
    return Math.round(stats.size / 1024)
  } catch {
    return 0
  }
}

/**
 * List all files in a subdirectory
 */
const listFiles = (subDir) => {
  try {
    const dirPath = path.join(UPLOAD_DIR, subDir)
    if (!fs.existsSync(dirPath)) return []
    return fs.readdirSync(dirPath).map(f => ({
      name: f,
      size: getFileSize(subDir, f),
      path: path.join(dirPath, f),
    }))
  } catch {
    return []
  }
}

/**
 * Clean up screenshots older than N days
 */
const cleanOldScreenshots = (days = 30) => {
  const dir = path.join(UPLOAD_DIR, 'screenshots')
  if (!fs.existsSync(dir)) return 0
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  let deleted = 0
  try {
    fs.readdirSync(dir).forEach(file => {
      const fp    = path.join(dir, file)
      const stats = fs.statSync(fp)
      if (stats.mtimeMs < cutoff) {
        fs.unlinkSync(fp)
        deleted++
      }
    })
  } catch (err) {
    console.error('[STORAGE] Cleanup error:', err.message)
  }
  console.log(`[STORAGE] Cleaned ${deleted} screenshots older than ${days} days`)
  return deleted
}

module.exports = { deleteFile, getFileSize, listFiles, cleanOldScreenshots }
