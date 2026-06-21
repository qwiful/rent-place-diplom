const express = require('express')
const router = express.Router()
const { authenticate, authorize } = require('../middleware/auth-middleware')
const {
  getOccupancyReport,
  getTicketsReport,
} = require('../controllers/reports-controller')

router.use(authenticate)
router.get('/occupancy', authorize('manager', 'admin'), getOccupancyReport)
router.get('/tickets', authorize('manager', 'admin'), getTicketsReport)

module.exports = router
