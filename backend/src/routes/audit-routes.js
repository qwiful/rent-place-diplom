const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getAuditLogs,
  getAuditLogById,
  deleteAuditLog,
} = require('../controllers/audit-controller');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAuditLogs);
router.get('/:id', getAuditLogById);
router.delete('/:id', deleteAuditLog);

module.exports = router;
