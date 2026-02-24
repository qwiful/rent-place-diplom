const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeRole,
  changeStatus,
  getUserProfile,
  updateUserProfile,
} = require('../controllers/users-controller');

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), getUsers);
router.get('/:id', getUserById);
router.post('/', authorize('admin'), createUser);
router.put('/:id', updateUser);
router.delete('/:id', authorize('admin'), deleteUser);

router.patch('/:id/role', authorize('admin'), changeRole);
router.patch('/:id/status', authorize('admin'), changeStatus);

router.get('/:id/profiles', getUserProfile);
router.put('/:id/profiles', updateUserProfile);

module.exports = router;
