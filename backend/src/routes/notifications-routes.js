const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth-middleware')
const {
  getNotifications,
  markAsRead,
} = require('../controllers/notifications-controller')

router.use(authenticate)
router.get('/', authenticate, getNotifications)
router.patch('/mark-read', authenticate, markAsRead)

module.exports = router
