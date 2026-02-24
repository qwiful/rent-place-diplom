const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getOpenTickets,
  getMyTickets,
  getTicketsByContract,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority,
  getTicketHistory,
} = require('../controllers/tickets-controller');

router.use(authenticate);

router.get('/', getTickets);
router.get('/open', authorize('admin', 'manager'), getOpenTickets);
router.get('/my', getMyTickets);
router.get('/by-contract/:contractId', getTicketsByContract);
router.get('/:id', getTicketById);
router.get('/:id/history', getTicketHistory);

router.post('/', createTicket);

router.put('/:id', authorize('admin', 'manager'), updateTicket);
router.patch('/:id/assign', authorize('admin', 'manager'), assignTicket);
router.patch('/:id/status', authorize('admin', 'manager'), updateTicketStatus);
router.patch(
  '/:id/priority',
  authorize('admin', 'manager'),
  updateTicketPriority,
);
router.delete('/:id', authorize('admin'), deleteTicket);

module.exports = router;
