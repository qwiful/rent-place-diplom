const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} = require('../controllers/roles-controller');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.delete('/:id', deleteRole);

module.exports = router;
