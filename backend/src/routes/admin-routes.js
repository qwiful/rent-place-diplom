const express = require('express')
const router = express.Router()
const { authenticate, authorize } = require('../middleware/auth-middleware')
const {
  getUsers,
  toggleUserBlock,
  changeUserRole,
  getOrganizations,
  deleteOrganization,
  getAuditLogs,
  createOrganization,
} = require('../controllers/admin-controller')

router.use(authenticate, authorize('admin'))

router.get('/users', getUsers)
router.patch('/users/:id/block', toggleUserBlock)
router.patch('/users/:id/role', changeUserRole)

router.get('/organizations', getOrganizations)
router.delete('/organizations/:id', deleteOrganization)
router.post('/organizations', createOrganization)

router.get('/audit-logs', getAuditLogs)

module.exports = router
