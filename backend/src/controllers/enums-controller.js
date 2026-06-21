const {
  CONTRACT_STATUSES,
  TICKET_STATUSES,
  PRIORITIES,
  INTERACTION_TYPES,
  SERVICE_TYPES,
  RENTAL_STATUSES,
  GENDERS,
} = require('../utils/enums');

const getContractStatuses = (req, res) => {
  res.json({ enums: CONTRACT_STATUSES });
};

const getTicketStatuses = (req, res) => {
  res.json({ enums: TICKET_STATUSES });
};

const getPriorities = (req, res) => {
  res.json({ enums: PRIORITIES });
};

const getInteractionTypes = (req, res) => {
  res.json({ enums: INTERACTION_TYPES });
};

const getServiceTypes = (req, res) => {
  res.json({ enums: SERVICE_TYPES });
};

const getRentalStatuses = (req, res) => {
  res.json({ enums: RENTAL_STATUSES });
};

const getGenders = (req, res) => {
  res.json({ enums: GENDERS });
};

module.exports = {
  getContractStatuses,
  getTicketStatuses,
  getPriorities,
  getInteractionTypes,
  getServiceTypes,
  getRentalStatuses,
  getGenders,
};
