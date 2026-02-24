const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth-middleware');
const {
  getPropertiesReport,
  getContractsReport,
  getTicketsReport,
  getFinancialReport,
  getOccupancyReport,
} = require('../controllers/reports-controller');

router.use(authenticate);
router.use(authorize('admin', 'manager'));

router.get('/properties', getPropertiesReport);
router.get('/contracts', getContractsReport);
router.get('/tickets', getTicketsReport);
router.get('/financial', getFinancialReport);
router.get('/occupancy', getOccupancyReport);

module.exports = router;
