const multer = require('multer')
const path   = require('path')
const fs     = require('fs')

const UPLOAD_DIR = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads')

// Ensure upload directories exist
;['screenshots', 'documents', 'avatars', 'evidence'].forEach(dir => {
  const p = path.join(UPLOAD_DIR, dir)
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
})

// Multer disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'documents'
    if (file.fieldname === 'screenshot') subDir = 'screenshots'
    if (file.fieldname === 'avatar')     subDir = 'avatars'
    if (file.fieldname === 'evidence')   subDir = 'evidence'
    cb(null, path.join(UPLOAD_DIR, subDir))
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowed = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

const getFileUrl = (subDir, filename) => {
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`
  return `${backendUrl}/uploads/${subDir}/${filename}`
}

module.exports = { upload, getFileUrl, UPLOAD_DIR }
