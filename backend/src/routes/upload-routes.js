const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth-middleware');
const { uploadPhotos } = require('../controllers/upload-controller');

router.post('/photos', authenticate, uploadPhotos);

module.exports = router;
