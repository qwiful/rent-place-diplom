const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
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
} = require('../controllers/properties-controller');

router.use(authenticate);

router.get('/', getProperties);
router.get('/available', getAvailableProperties);
router.get('/occupied', getOccupiedProperties);
router.get('/by-center/:bcId', getPropertiesByCenter);
router.get('/by-manager/:userId', getPropertiesByManager);
router.get('/:id', getPropertyById);

router.post('/', authorize('admin', 'manager'), createProperty);
router.put('/:id', authorize('admin', 'manager'), updateProperty);
router.patch(
  '/:id/status',
  authorize('admin', 'manager'),
  updatePropertyStatus,
);
router.delete('/:id', authorize('admin'), deleteProperty);

module.exports = router;
