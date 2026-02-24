const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth-middleware');
const {
  register,
  login,
  logout,
  getMe,
  refreshToken,
} = require('../controllers/auth-controller');

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);

router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

module.exports = router;
