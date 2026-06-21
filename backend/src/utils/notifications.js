const prisma = require('../utils/prisma')

async function createNotification(
  userId,
  type,
  title,
  message,
  entityType,
  entityId,
) {
  if (!userId) return
  try {
    await prisma.notifications.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        entity_type: entityType,
        entity_id: entityId,
        status: 'unread',
      },
    })
  } catch (error) {
    console.error('Failed to create notification:', error)
  }
}

module.exports = { createNotification }
