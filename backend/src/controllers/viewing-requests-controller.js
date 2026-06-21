const prisma = require('../utils/prisma')
const { createNotification } = require('../utils/notifications')

const getViewingRequests = async (req, res) => {
  try {
    let where = {}
    if (req.user.roles.name === 'manager') {
      const managedProperties = await prisma.rental_objects.findMany({
        where: { manager_id: req.user.id },
        select: { id: true },
      })
      const propertyIds = managedProperties.map((p) => p.id)
      if (propertyIds.length === 0) {
        return res.json({ requests: [] })
      }
      where.rental_object_id = { in: propertyIds }
    }

    const requests = await prisma.viewing_requests.findMany({
      where,
      include: {
        rental_objects: {
          include: {
            business_centers: true,
          },
        },
        users_viewing_requests_user_idTousers: {
          include: {
            user_profiles: true,
          },
        },
        users_viewing_requests_processed_byTousers: {
          include: {
            user_profiles: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    res.json({ requests })
  } catch (error) {
    console.error('GetViewingRequests error:', error)
    res.status(500).json({ error: 'Ошибка при получении заявок' })
  }
}

const updateRequestStatus = async (req, res) => {
  const { id } = req.params
  const { status, scheduled_date, scheduled_time, manager_notes } = req.body
  try {
    const updated = await prisma.viewing_requests.update({
      where: { id: parseInt(id) },
      data: {
        status,
        scheduled_date: scheduled_date ? new Date(scheduled_date) : null,
        scheduled_time,
        manager_notes,
        processed_by: req.user.id,
        processed_at: new Date(),
      },
    })
    const vr = await prisma.viewing_requests.findUnique({
      where: { id: parseInt(id) },
      select: { user_id: true, preferred_date: true },
    })
    if (vr?.user_id) {
      const statusText = status === 'approved' ? 'одобрена' : 'отклонена'
      await createNotification(
        vr.user_id,
        'viewing',
        'Заявка на просмотр',
        `Ваша заявка от ${new Date(vr.preferred_date).toLocaleDateString()} ${statusText}.`,
        'ViewingRequest',
        parseInt(id),
      )
    }
    res.json({ request: updated })
  } catch (error) {
    console.error('UpdateRequestStatus error:', error)
    res.status(500).json({ error: 'Ошибка обновления' })
  }
}

const createViewingRequest = async (req, res) => {
  try {
    const { rental_object_id, preferred_date, preferred_time, user_notes } =
      req.body
    if (!rental_object_id || !preferred_date || !preferred_time) {
      return res.status(400).json({
        error: 'rental_object_id, preferred_date, preferred_time обязательны',
      })
    }
    const request = await prisma.viewing_requests.create({
      data: {
        rental_object_id: parseInt(rental_object_id),
        user_id: req.user.id,
        preferred_date: new Date(preferred_date),
        preferred_time,
        user_notes,
        status: 'pending',
      },
    })
    const property = await prisma.rental_objects.findUnique({
      where: { id: rental_object_id },
      select: { manager_id: true, title: true },
    })
    if (property?.manager_id) {
      await createNotification(
        property.manager_id,
        'viewing',
        'Запрос на просмотр',
        `По помещению "${property.title}" от ${req.user.email}`,
        'ViewingRequest',
        request.id,
      )
    }
    res.status(201).json({ request })
  } catch (error) {
    console.error('CreateViewingRequest error:', error)
    res.status(500).json({ error: 'Ошибка при создании заявки' })
  }
}

module.exports = {
  getViewingRequests,
  updateRequestStatus,
  createViewingRequest,
}
