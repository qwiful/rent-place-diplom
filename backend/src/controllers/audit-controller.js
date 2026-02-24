const prisma = require('../utils/prisma');
const getAuditLogs = async (req, res) => {
  try {
    const { userId, entityType, action, limit = 100, offset = 0 } = req.query;

    const where = {};
    if (userId) where.user_id = parseInt(userId);
    if (entityType) where.entity_type = entityType;
    if (action) where.action = action;

    const logs = await prisma.audit_logs.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            user_profiles: { select: { first_name: true, last_name: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.audit_logs.count({ where });

    res.json({
      logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('GetAuditLogs error:', error);
    res.status(500).json({ error: 'Ошибка при получении аудит-логов' });
  }
};

const getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await prisma.audit_logs.findUnique({
      where: { id: parseInt(id) },
      include: { users: true },
    });
    if (!log) {
      return res.status(404).json({ error: 'Запись не найдена' });
    }
    res.json({ log });
  } catch (error) {
    console.error('GetAuditLogById error:', error);
    res.status(500).json({ error: 'Ошибка при получении записи аудита' });
  }
};

const deleteAuditLog = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.audit_logs.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Запись удалена' });
  } catch (error) {
    console.error('DeleteAuditLog error:', error);
    res.status(500).json({ error: 'Ошибка при удалении записи' });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogById,
  deleteAuditLog,
};
