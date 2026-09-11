const { upload } = require('../config/storage')

module.exports = {
  uploadAvatar:     upload.single('avatar'),
  uploadDocument:   upload.single('document'),
  uploadEvidence:   upload.single('evidence'),
  uploadScreenshot: upload.single('screenshot'),
  uploadMultiple:   upload.array('files', 5),

  // All verification documents in one multipart request
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
