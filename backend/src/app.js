const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth-routes');
const usersRoutes = require('./routes/users-routes');
const rolesRoutes = require('./routes/roles-routes');
const organizationsRoutes = require('./routes/organizations-routes');
const businessCentersRoutes = require('./routes/businessCenters-routes');
const propertiesRoutes = require('./routes/properties-routes');
const contractsRoutes = require('./routes/contracts-routes');
const ticketsRoutes = require('./routes/tickets-routes');
const interactionsRoutes = require('./routes/interactions-routes');
const enumsRoutes = require('./routes/enums-routes');
const reportsRoutes = require('./routes/reports-routes');
const auditRoutes = require('./routes/audit-routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(helmet());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/organizations', organizationsRoutes);
app.use('/api/business-centers', businessCentersRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/contracts', contractsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/enums', enumsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/audit-logs', auditRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'RentPlace API работает',
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Что-то пошло не так!' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Роутер не найден' });
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
});
