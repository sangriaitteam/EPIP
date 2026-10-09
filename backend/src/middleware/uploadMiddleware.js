const { upload } = require('../config/storage')
const multer = require('multer')

// Memory storage — no disk dependency (Railway/Vercel ephemeral disk safe)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    // Allow all common file types for task chat attachments
    const blocked = ['application/x-msdownload', 'application/x-sh', 'application/x-bat']
    if (blocked.includes(file.mimetype)) {
      cb(new Error('File type not allowed'), false)
    } else {
      cb(null, true)
    }
  },
})

module.exports = {
  uploadAvatar:     upload.single('avatar'),
  uploadDocument:   upload.single('document'),
  uploadEvidence:   upload.single('evidence'),
  uploadScreenshot: memoryUpload.single('screenshot'),
  uploadAttachment: memoryUpload.single('attachment'),  // memory — base64 in DB
  uploadMultiple:   upload.array('files', 5),

  uploadVerifyDocs: upload.fields([
    { name: 'photo',              maxCount: 1 },
    { name: 'aadhaar_card',       maxCount: 1 },
    { name: 'marks_10th',         maxCount: 1 },
    { name: 'marks_12th',         maxCount: 1 },
    { name: 'degree_marksheet',   maxCount: 1 },
    { name: 'degree_certificate', maxCount: 1 },
    { name: 'diploma_marksheet',  maxCount: 1 },
    { name: 'diploma_certificate',maxCount: 1 },
    { name: 'experience_letter',  maxCount: 1 },
    { name: 'relieving_letter',   maxCount: 1 },
  ]),
}
