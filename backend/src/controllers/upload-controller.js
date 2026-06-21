const path = require('path')
const fs = require('fs')
const multer = require('multer')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/rental-objects')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `property-${uniqueSuffix}${ext}`)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  )
  const mimetype = allowedTypes.test(file.mimetype)
  if (mimetype && extname) {
    cb(null, true)
  } else {
    cb(new Error('Только изображения (jpeg, jpg, png, gif, webp)'))
  }
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter,
}).array('photos', 10)

const uploadPhotos = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message })
    }
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Файлы не выбраны' })
    }
    const uploadedUrls = req.files.map((file) => {
      return `/uploads/rental-objects/${file.filename}`
    })
    res.json({ urls: uploadedUrls })
  })
}

module.exports = { uploadPhotos }
