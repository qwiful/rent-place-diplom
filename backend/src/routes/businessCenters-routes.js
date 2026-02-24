const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getBusinessCenters,
  getBusinessCenterById,
  createBusinessCenter,
  updateBusinessCenter,
  deleteBusinessCenter,
  getCenterProperties,
  getCenterContracts,
} = require('../controllers/businessCenters-controller');

router.use(authenticate);

router.get('/', getBusinessCenters);
router.get('/:id', getBusinessCenterById);
router.get('/:id/properties', getCenterProperties);
router.get('/:id/contracts', getCenterContracts);

router.post('/', authorize('admin', 'manager'), createBusinessCenter);
router.put('/:id', authorize('admin', 'manager'), updateBusinessCenter);
router.delete('/:id', authorize('admin'), deleteBusinessCenter);

module.exports = router;
