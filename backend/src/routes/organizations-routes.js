const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationContracts,
  getOrganizationUsers,
} = require('../controllers/organizations-controller');

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), getOrganizations);
router.get('/:id', getOrganizationById);
router.get('/:id/contracts', getOrganizationContracts);
router.get('/:id/users', authorize('admin', 'manager'), getOrganizationUsers);

router.post('/', authorize('admin', 'manager'), createOrganization);
router.put('/:id', authorize('admin', 'manager'), updateOrganization);
router.delete('/:id', authorize('admin'), deleteOrganization);

module.exports = router;
