const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth-middleware')
const {
  getViewingRequests,
  updateRequestStatus,
  createViewingRequest,
} = require('../controllers/viewing-requests-controller')

router.use(authenticate)

router.get('/', getViewingRequests)
router.patch('/:id/status', updateRequestStatus)
router.post('/', createViewingRequest)

module.exports = router
