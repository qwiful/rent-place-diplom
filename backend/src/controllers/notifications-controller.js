const prisma = require('../utils/prisma')

const getNotifications = async (req, res) => {
  const notifications = await prisma.notifications.findMany({
    where: { user_id: req.user.id },
    orderBy: { created_at: 'desc' },
    take: 20,
  })
  res.json({ notifications })
}

const markAsRead = async (req, res) => {
  const { ids } = req.body
  await prisma.notifications.updateMany({
    where: { user_id: req.user.id, id: { in: ids } },
    data: { status: 'read', read_at: new Date() },
  })
  res.json({ success: true })
}

module.exports = { getNotifications, markAsRead }
