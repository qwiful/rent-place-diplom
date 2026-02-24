const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  getActiveContracts,
  getExpiringContracts,
  getContractsByTenant,
  getContractsByProperty,
  updateContractStatus,
  getContractHistory,
} = require('../controllers/contracts-controller');

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), getContracts);
router.get('/active', authorize('admin', 'manager'), getActiveContracts);
router.get('/expiring', authorize('admin', 'manager'), getExpiringContracts);
router.get(
  '/by-property/:propertyId',
  authorize('admin', 'manager'),
  getContractsByProperty,
);
router.get('/:id', authorize('admin', 'manager'), getContractById);
router.get('/:id/history', authorize('admin', 'manager'), getContractHistory);

router.get('/by-tenant/:tenantId', getContractsByTenant);

router.post('/', authorize('admin', 'manager'), createContract);
router.put('/:id', authorize('admin', 'manager'), updateContract);
router.patch(
  '/:id/status',
  authorize('admin', 'manager'),
  updateContractStatus,
);
router.delete('/:id', authorize('admin'), deleteContract);

module.exports = router;
