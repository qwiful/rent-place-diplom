const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getInteractions,
  getInteractionById,
  createInteraction,
  updateInteraction,
  deleteInteraction,
  getInteractionsByContract,
  getInteractionsByManager,
} = require('../controllers/interactions-controller');

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), getInteractions);
router.get('/by-contract/:contractId', getInteractionsByContract);
router.get(
  '/by-manager/:managerId',
  authorize('admin', 'manager'),
  getInteractionsByManager,
);
router.get('/:id', getInteractionById);

router.post('/', authorize('admin', 'manager'), createInteraction);
router.put('/:id', authorize('admin', 'manager'), updateInteraction);
router.delete('/:id', authorize('admin', 'manager'), deleteInteraction);

module.exports = router;
