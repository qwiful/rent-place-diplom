const getContractStatuses = (req, res) => {
  const statuses = ['draft', 'pending', 'active', 'terminated', 'completed'];
  res.json({ enums: statuses });
};

const getTicketStatuses = (req, res) => {
  const statuses = ['new', 'in_progress', 'on_hold', 'completed', 'cancelled'];
  res.json({ enums: statuses });
};

const getPriorities = (req, res) => {
  const priorities = ['low', 'medium', 'high', 'critical'];
  res.json({ enums: priorities });
};

const getInteractionTypes = (req, res) => {
  const types = ['phone', 'email', 'meeting', 'note'];
  res.json({ enums: types });
};

const getServiceTypes = (req, res) => {
  const types = ['cleaning', 'repair', 'technical', 'other'];
  res.json({ enums: types });
};

const getRentalStatuses = (req, res) => {
  const statuses = ['available', 'occupied', 'reserved', 'under_renovation'];
  res.json({ enums: statuses });
};

const getGenders = (req, res) => {
  const genders = ['male', 'female'];
  res.json({ enums: genders });
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
