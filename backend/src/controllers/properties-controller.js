const prisma = require('../utils/prisma')
const { RENTAL_STATUSES, validateEnum } = require('../utils/enums')

const canModifyProperty = async (propertyId, user) => {
  if (user.roles.name === 'admin') return true
  if (user.roles.name === 'manager') return true
  return false
}

const getProperties = async (req, res) => {
  try {
    const {
      status,
      minPrice,
      maxPrice,
      area,
      business_center_id,
      manager_id,
      limit = 50,
      offset = 0,
    } = req.query

    const where = {}

    if (status) where.status = status
    if (business_center_id)
      where.business_center_id = parseInt(business_center_id)
    if (manager_id) where.manager_id = parseInt(manager_id)

    if (minPrice || maxPrice) {
      where.price_per_month = {}
      if (minPrice) where.price_per_month.gte = parseFloat(minPrice)
      if (maxPrice) where.price_per_month.lte = parseFloat(maxPrice)
    }

    if (req.query.minArea || req.query.maxArea) {
      where.area = {}
      if (req.query.minArea) where.area.gte = parseFloat(req.query.minArea)
      if (req.query.maxArea) where.area.lte = parseFloat(req.query.maxArea)
    }

    const [properties, total] = await Promise.all([
      prisma.rental_objects.findMany({
        where,
        include: {
          business_centers: true,
          users: {
            include: { user_profiles: true },
          },
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.rental_objects.count({ where }),
    ])

    const processedProperties = properties.map((p) => ({
      ...p,
      photos: p.photos ? (Array.isArray(p.photos) ? p.photos : [p.photos]) : [],
    }))

    res.json({
      properties: processedProperties,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
    })
  } catch (error) {
    console.error('GetProperties error:', error)
    res.status(500).json({ error: 'Ошибка при получении списка помещений' })
  }
}

const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params
    const propertyId = parseInt(id)

    const property = await prisma.rental_objects.findUnique({
      where: { id: propertyId },
      include: {
        business_centers: true,
        users: { include: { user_profiles: true } },
        contracts: {
          where: { status: 'active' },
          take: 1,
        },
      },
    })

    if (!property) {
      return res.status(404).json({ error: 'Помещение не найдено' })
    }

    const processedProperty = {
      ...property,
      photos: property.photos
        ? Array.isArray(property.photos)
          ? property.photos
          : [property.photos]
        : [],
    }

    res.json({ property: processedProperty })
  } catch (error) {
    console.error('GetPropertyById error:', error)
    res.status(500).json({ error: 'Ошибка при получении помещения' })
  }
}

const createProperty = async (req, res) => {
  try {
    const {
      business_center_id,
      manager_id,
      title,
      area,
      price_per_month,
      status = 'available',
    } = req.body

    if (!business_center_id || !title || !area || !price_per_month) {
      return res.status(400).json({
        error: 'business_center_id, title, area, price_per_month обязательны',
      })
    }

    const statusCheck = validateEnum(status, RENTAL_STATUSES, 'status')
    if (!statusCheck.valid) {
      return res.status(400).json({ error: statusCheck.error })
    }

    const center = await prisma.business_centers.findUnique({
      where: { id: parseInt(business_center_id) },
    })
    if (!center) {
      return res.status(400).json({ error: 'Бизнес-центр не найден' })
    }

    if (manager_id) {
      const manager = await prisma.users.findUnique({
        where: { id: parseInt(manager_id) },
        include: { roles: true },
      })
      if (!manager) {
        return res.status(400).json({ error: 'Менеджер не найден' })
      }
      if (manager.roles.name !== 'manager' && manager.roles.name !== 'admin') {
        return res
          .status(400)
          .json({ error: 'Указанный пользователь не является менеджером' })
      }
    }

    const property = await prisma.rental_objects.create({
      data: {
        business_center_id: parseInt(business_center_id),
        manager_id: manager_id ? parseInt(manager_id) : null,
        title,
        area: parseFloat(area),
        price_per_month: parseFloat(price_per_month),
        status,
        photos: req.body.photos || [],
      },
    })

    res.status(201).json({
      message: 'Помещение создано',
      property,
    })
  } catch (error) {
    console.error('CreateProperty error:', error)
    res.status(500).json({ error: 'Ошибка при создании помещения' })
  }
}

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params
    const propertyId = parseInt(id)
    const {
      business_center_id,
      manager_id,
      title,
      area,
      price_per_month,
      status,
    } = req.body

    const existing = await prisma.rental_objects.findUnique({
      where: { id: propertyId },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Помещение не найдено' })
    }

    if (!(await canModifyProperty(propertyId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на редактирование этого помещения' })
    }

    if (business_center_id) {
      const center = await prisma.business_centers.findUnique({
        where: { id: parseInt(business_center_id) },
      })
      if (!center) {
        return res.status(400).json({ error: 'Бизнес-центр не найден' })
      }
    }

    if (manager_id !== undefined) {
      if (req.user.roles.name !== 'admin') {
        if (manager_id !== null && parseInt(manager_id) !== req.user.id) {
          return res.status(403).json({
            error:
              'Вы можете назначить ответственным только себя или снять назначение',
          })
        }
      }
      if (manager_id !== null) {
        const manager = await prisma.users.findUnique({
          where: { id: parseInt(manager_id) },
          include: { roles: true },
        })
        if (!manager) {
          return res.status(400).json({ error: 'Менеджер не найден' })
        }
        if (
          manager.roles.name !== 'manager' &&
          manager.roles.name !== 'admin'
        ) {
          return res
            .status(400)
            .json({ error: 'Указанный пользователь не является менеджером' })
        }
      }
    }

    const data = {}
    if (business_center_id)
      data.business_center_id = parseInt(business_center_id)
    if (manager_id !== undefined)
      data.manager_id = manager_id ? parseInt(manager_id) : null
    if (title) data.title = title
    if (area !== undefined) data.area = parseFloat(area)
    if (price_per_month) data.price_per_month = parseFloat(price_per_month)
    if (status) data.status = status
    if (req.body.photos) data.photos = req.body.photos
    const updated = await prisma.rental_objects.update({
      where: { id: propertyId },
      data,
    })

    res.json({
      message: 'Помещение обновлено',
      property: updated,
    })
  } catch (error) {
    console.error('UpdateProperty error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении помещения' })
  }
}

const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params
    const propertyId = parseInt(id)

    if (!(await canModifyProperty(propertyId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на удаление этого помещения' })
    }

    const activeContracts = await prisma.contracts.findFirst({
      where: {
        rental_object_id: propertyId,
        status: {
          notIn: ['terminated', 'completed'],
        },
      },
    })

    if (activeContracts) {
      return res.status(400).json({
        error:
          'Невозможно удалить помещение – есть активный договор (статус не "расторгнут" и не "завершён")',
      })
    }

    await prisma.$transaction(async (tx) => {
      const contracts = await tx.contracts.findMany({
        where: { rental_object_id: propertyId },
        select: { id: true },
      })
      const contractIds = contracts.map((c) => c.id)

      if (contractIds.length) {
        await tx.service_tickets.deleteMany({
          where: { contract_id: { in: contractIds } },
        })
        await tx.contract_status_history.deleteMany({
          where: { contract_id: { in: contractIds } },
        })
        await tx.interactions.deleteMany({
          where: { contract_id: { in: contractIds } },
        })
        await tx.contracts.deleteMany({
          where: { id: { in: contractIds } },
        })
      }

      await tx.viewing_requests.deleteMany({
        where: { rental_object_id: propertyId },
      })

      await tx.favorites.deleteMany({
        where: { rental_object_id: propertyId },
      })

      await tx.rental_objects.delete({
        where: { id: propertyId },
      })
    })

    res.json({ message: 'Помещение удалено вместе с расторгнутыми договорами' })
  } catch (error) {
    console.error('DeleteProperty error:', error)
    res
      .status(500)
      .json({ error: 'Ошибка при удалении помещения: ' + error.message })
  }
}

const getAvailableProperties = async (req, res) => {
  try {
    const properties = await prisma.rental_objects.findMany({
      where: { status: 'available' },
      include: { business_centers: true },
    })
    res.json({ properties })
  } catch (error) {
    console.error('GetAvailableProperties error:', error)
    res.status(500).json({ error: 'Ошибка при получении свободных помещений' })
  }
}

const getOccupiedProperties = async (req, res) => {
  try {
    const properties = await prisma.rental_objects.findMany({
      where: { status: 'occupied' },
      include: { business_centers: true },
    })
    res.json({ properties })
  } catch (error) {
    console.error('GetOccupiedProperties error:', error)
    res.status(500).json({ error: 'Ошибка при получении занятых помещений' })
  }
}

const getPropertiesByCenter = async (req, res) => {
  try {
    const { bcId } = req.params
    const centerId = parseInt(bcId)

    const properties = await prisma.rental_objects.findMany({
      where: { business_center_id: centerId },
      include: { users: true },
    })
    res.json({ properties })
  } catch (error) {
    console.error('GetPropertiesByCenter error:', error)
    res.status(500).json({ error: 'Ошибка при получении помещений' })
  }
}

const getPropertiesByManager = async (req, res) => {
  try {
    const { userId } = req.params
    const managerId = parseInt(userId)

    const properties = await prisma.rental_objects.findMany({
      where: { manager_id: managerId },
      include: { business_centers: true },
    })
    res.json({ properties })
  } catch (error) {
    console.error('GetPropertiesByManager error:', error)
    res.status(500).json({ error: 'Ошибка при получении помещений' })
  }
}

const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const propertyId = parseInt(id)

    if (!status) {
      return res.status(400).json({ error: 'status обязателен' })
    }

    const statusCheck = validateEnum(status, RENTAL_STATUSES, 'status')
    if (!statusCheck.valid) {
      return res.status(400).json({ error: statusCheck.error })
    }

    if (!(await canModifyProperty(propertyId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на изменение статуса этого помещения' })
    }

    const existing = await prisma.rental_objects.findUnique({
      where: { id: propertyId },
    })
    if (!existing) {
      return res.status(404).json({ error: 'Помещение не найдено' })
    }

    const updated = await prisma.rental_objects.update({
      where: { id: propertyId },
      data: { status },
    })

    res.json({
      message: 'Статус обновлен',
      property: updated,
    })
  } catch (error) {
    console.error('UpdatePropertyStatus error:', error)
    res.status(500).json({ error: 'Ошибка при обновлении статуса' })
  }
}

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  getAvailableProperties,
  getOccupiedProperties,
  getPropertiesByCenter,
  getPropertiesByManager,
  updatePropertyStatus,
}
