const multer    = require('multer')
const path      = require('path')
const fs        = require('fs')

const USE_CLOUDINARY = process.env.STORAGE_PROVIDER === 'cloudinary'
  && process.env.CLOUDINARY_CLOUD_NAME
  && process.env.CLOUDINARY_API_KEY
  && process.env.CLOUDINARY_API_SECRET

// ── Cloudinary setup ──────────────────────────────────────────────────────────
let cloudinaryStorage = null

if (USE_CLOUDINARY) {
  const cloudinary                   = require('cloudinary').v2
  const { CloudinaryStorage }        = require('multer-storage-cloudinary')

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
      let folder = 'epip/documents'
      if (file.fieldname === 'screenshot') folder = 'epip/screenshots'
      if (file.fieldname === 'avatar')     folder = 'epip/avatars'
      if (file.fieldname === 'evidence')   folder = 'epip/evidence'
      return {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        // Keep original format for screenshots (PNG from Node.js tool)
        format: file.fieldname === 'screenshot' ? 'png' : undefined,
      }
    },
  })

  console.log('[STORAGE] Using Cloudinary storage ✅')
} else {
  console.log('[STORAGE] Using local disk storage')
}

// ── Local disk storage (fallback) ─────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads')

if (!USE_CLOUDINARY) {
  ;['screenshots', 'documents', 'avatars', 'evidence', 'attachments'].forEach(dir => {
    const p = path.join(UPLOAD_DIR, dir)
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
  })
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subDir = 'documents'
    if (file.fieldname === 'screenshot')  subDir = 'screenshots'
    if (file.fieldname === 'avatar')      subDir = 'avatars'
    if (file.fieldname === 'evidence')    subDir = 'evidence'
    if (file.fieldname === 'attachment')  subDir = 'attachments'
    cb(null, path.join(UPLOAD_DIR, subDir))
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    cb(null, `${unique}${path.extname(file.originalname)}`)
  },
})

// ── File filter ───────────────────────────────────────────────────────────────
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

// ── Multer instance ───────────────────────────────────────────────────────────
const upload = multer({
  storage: USE_CLOUDINARY ? cloudinaryStorage : diskStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

// ── File URL helper ───────────────────────────────────────────────────────────
// Cloudinary returns full URL in req.file.path
// Local returns filename only → build URL from BACKEND_URL
const getFileUrl = (subDir, filename) => {
  if (USE_CLOUDINARY) return filename // already full URL from Cloudinary
  const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`
  return `${backendUrl}/uploads/${subDir}/${filename}`
}

module.exports = { upload, getFileUrl, UPLOAD_DIR, USE_CLOUDINARY }
