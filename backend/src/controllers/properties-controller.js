const prisma = require('../utils/prisma');

const canModifyProperty = async (propertyId, user) => {
  if (user.roles.name === 'admin') return true;
  if (user.roles.name === 'manager') {
    const property = await prisma.rental_objects.findUnique({
      where: { id: propertyId },
      select: { manager_id: true },
    });
    return property && property.manager_id === user.id;
  }
  return false;
};

const getProperties = async (req, res) => {
  try {
    const { status, minPrice, maxPrice, area, business_center_id, manager_id } =
      req.query;

    const where = {};

    if (status) where.status = status;
    if (business_center_id)
      where.business_center_id = parseInt(business_center_id);
    if (manager_id) where.manager_id = parseInt(manager_id);

    if (minPrice || maxPrice) {
      where.price_per_month = {};
      if (minPrice) where.price_per_month.gte = parseFloat(minPrice);
      if (maxPrice) where.price_per_month.lte = parseFloat(maxPrice);
    }

    if (area) {
      where.area = parseFloat(area);
    }

    const properties = await prisma.rental_objects.findMany({
      where,
      include: {
        business_centers: true,
        users: {
          include: { user_profiles: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ properties });
  } catch (error) {
    console.error('GetProperties error:', error);
    res.status(500).json({ error: 'Ошибка при получении списка помещений' });
  }
};

const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const propertyId = parseInt(id);

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
    });

    if (!property) {
      return res.status(404).json({ error: 'Помещение не найдено' });
    }

    res.json({ property });
  } catch (error) {
    console.error('GetPropertyById error:', error);
    res.status(500).json({ error: 'Ошибка при получении помещения' });
  }
};

const createProperty = async (req, res) => {
  try {
    const {
      business_center_id,
      manager_id,
      title,
      area,
      price_per_month,
      status = 'available',
    } = req.body;

    if (!business_center_id || !title || !area || !price_per_month) {
      return res.status(400).json({
        error: 'business_center_id, title, area, price_per_month обязательны',
      });
    }

    const center = await prisma.business_centers.findUnique({
      where: { id: parseInt(business_center_id) },
    });
    if (!center) {
      return res.status(400).json({ error: 'Бизнес-центр не найден' });
    }

    if (manager_id) {
      const manager = await prisma.users.findUnique({
        where: { id: parseInt(manager_id) },
        include: { roles: true },
      });
      if (!manager) {
        return res.status(400).json({ error: 'Менеджер не найден' });
      }
      if (manager.roles.name !== 'manager' && manager.roles.name !== 'admin') {
        return res
          .status(400)
          .json({ error: 'Указанный пользователь не является менеджером' });
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
      },
    });

    res.status(201).json({
      message: 'Помещение создано',
      property,
    });
  } catch (error) {
    console.error('CreateProperty error:', error);
    res.status(500).json({ error: 'Ошибка при создании помещения' });
  }
};

const updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const propertyId = parseInt(id);
    const {
      business_center_id,
      manager_id,
      title,
      area,
      price_per_month,
      status,
    } = req.body;

    const existing = await prisma.rental_objects.findUnique({
      where: { id: propertyId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Помещение не найдено' });
    }

    if (!(await canModifyProperty(propertyId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на редактирование этого помещения' });
    }

    if (business_center_id) {
      const center = await prisma.business_centers.findUnique({
        where: { id: parseInt(business_center_id) },
      });
      if (!center) {
        return res.status(400).json({ error: 'Бизнес-центр не найден' });
      }
    }

    if (manager_id !== undefined) {
      if (req.user.roles.name !== 'admin') {
        if (manager_id !== null && parseInt(manager_id) !== req.user.id) {
          return res.status(403).json({
            error:
              'Вы можете назначить ответственным только себя или снять назначение',
          });
        }
      }
      if (manager_id !== null) {
        const manager = await prisma.users.findUnique({
          where: { id: parseInt(manager_id) },
          include: { roles: true },
        });
        if (!manager) {
          return res.status(400).json({ error: 'Менеджер не найден' });
        }
        if (
          manager.roles.name !== 'manager' &&
          manager.roles.name !== 'admin'
        ) {
          return res
            .status(400)
            .json({ error: 'Указанный пользователь не является менеджером' });
        }
      }
    }

    const data = {};
    if (business_center_id)
      data.business_center_id = parseInt(business_center_id);
    if (manager_id !== undefined)
      data.manager_id = manager_id ? parseInt(manager_id) : null;
    if (title) data.title = title;
    if (area) data.area = parseFloat(area);
    if (price_per_month) data.price_per_month = parseFloat(price_per_month);
    if (status) data.status = status;

    const updated = await prisma.rental_objects.update({
      where: { id: propertyId },
      data,
    });

    res.json({
      message: 'Помещение обновлено',
      property: updated,
    });
  } catch (error) {
    console.error('UpdateProperty error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении помещения' });
  }
};

const deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const propertyId = parseInt(id);

    if (!(await canModifyProperty(propertyId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на удаление этого помещения' });
    }

    const contractsCount = await prisma.contracts.count({
      where: { rental_object_id: propertyId },
    });
    if (contractsCount > 0) {
      return res.status(400).json({
        error: 'Невозможно удалить помещение, так как с ним связаны договоры',
      });
    }

    await prisma.rental_objects.delete({
      where: { id: propertyId },
    });

    res.json({ message: 'Помещение удалено' });
  } catch (error) {
    console.error('DeleteProperty error:', error);
    res.status(500).json({ error: 'Ошибка при удалении помещения' });
  }
};

const getAvailableProperties = async (req, res) => {
  try {
    const properties = await prisma.rental_objects.findMany({
      where: { status: 'available' },
      include: { business_centers: true },
    });
    res.json({ properties });
  } catch (error) {
    console.error('GetAvailableProperties error:', error);
    res.status(500).json({ error: 'Ошибка при получении свободных помещений' });
  }
};

const getOccupiedProperties = async (req, res) => {
  try {
    const properties = await prisma.rental_objects.findMany({
      where: { status: 'occupied' },
      include: { business_centers: true },
    });
    res.json({ properties });
  } catch (error) {
    console.error('GetOccupiedProperties error:', error);
    res.status(500).json({ error: 'Ошибка при получении занятых помещений' });
  }
};

const getPropertiesByCenter = async (req, res) => {
  try {
    const { bcId } = req.params;
    const centerId = parseInt(bcId);

    const properties = await prisma.rental_objects.findMany({
      where: { business_center_id: centerId },
      include: { users: true },
    });
    res.json({ properties });
  } catch (error) {
    console.error('GetPropertiesByCenter error:', error);
    res.status(500).json({ error: 'Ошибка при получении помещений' });
  }
};

const getPropertiesByManager = async (req, res) => {
  try {
    const { userId } = req.params;
    const managerId = parseInt(userId);

    const properties = await prisma.rental_objects.findMany({
      where: { manager_id: managerId },
      include: { business_centers: true },
    });
    res.json({ properties });
  } catch (error) {
    console.error('GetPropertiesByManager error:', error);
    res.status(500).json({ error: 'Ошибка при получении помещений' });
  }
};

const updatePropertyStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const propertyId = parseInt(id);

    if (!status) {
      return res.status(400).json({ error: 'status обязателен' });
    }

    if (!(await canModifyProperty(propertyId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на изменение статуса этого помещения' });
    }

    const existing = await prisma.rental_objects.findUnique({
      where: { id: propertyId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Помещение не найдено' });
    }

    const updated = await prisma.rental_objects.update({
      where: { id: propertyId },
      data: { status },
    });

    res.json({
      message: 'Статус обновлен',
      property: updated,
    });
  } catch (error) {
    console.error('UpdatePropertyStatus error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса' });
  }
};

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
};
