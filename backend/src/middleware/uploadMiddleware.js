const { upload } = require('../config/storage')
const multer = require('multer')

// Memory storage for screenshots — gives buffer for base64 encoding
// Works regardless of Cloudinary/local — no file system dependency
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
})

module.exports = {
  uploadAvatar:     upload.single('avatar'),
  uploadDocument:   upload.single('document'),
  uploadEvidence:   upload.single('evidence'),
  uploadScreenshot: memoryUpload.single('screenshot'),  // memory for base64
  uploadAttachment: upload.single('attachment'),
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
