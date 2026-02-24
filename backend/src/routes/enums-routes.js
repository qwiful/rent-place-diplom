const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth-middleware');
const {
  getContractStatuses,
  getTicketStatuses,
  getPriorities,
  getInteractionTypes,
  getServiceTypes,
  getRentalStatuses,
  getGenders,
} = require('../controllers/enums-controller');

router.use(authenticate);

router.get('/contract-status', getContractStatuses);
router.get('/ticket-status', getTicketStatuses);
router.get('/priorities', getPriorities);
router.get('/interaction-types', getInteractionTypes);
router.get('/service-types', getServiceTypes);
router.get('/rental-status', getRentalStatuses);
router.get('/genders', getGenders);

module.exports = router;
