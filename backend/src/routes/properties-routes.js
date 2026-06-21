const express = require('express')
const router = express.Router()
const { authenticate, authorize } = require('../middleware/auth-middleware')
const {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getAvailableProperties,
  getOccupiedProperties,
  getPropertiesByCenter,
  getPropertiesByManager,
  updatePropertyStatus,
} = require('../controllers/properties-controller')

router.get('/', getProperties)
router.get('/available', getAvailableProperties)
router.get('/:id', getPropertyById)

router.use(authenticate)

router.get('/occupied', getOccupiedProperties)
router.get('/by-center/:bcId', getPropertiesByCenter)
router.get('/by-manager/:userId', getPropertiesByManager)

router.post('/', authorize('admin', 'manager'), createProperty)
router.put('/:id', authorize('admin', 'manager'), updateProperty)
router.patch('/:id/status', authorize('admin', 'manager'), updatePropertyStatus)
router.delete('/:id', authorize('admin', 'manager'), deleteProperty)

module.exports = router
