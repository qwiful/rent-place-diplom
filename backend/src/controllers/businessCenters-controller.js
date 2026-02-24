const prisma = require('../utils/prisma');

const getBusinessCenters = async (req, res) => {
  try {
    const { organization_id } = req.query;
    const where = {};
    if (organization_id) {
      where.organization_id = parseInt(organization_id);
    }

    const centers = await prisma.business_centers.findMany({
      where,
      include: {
        organizations: true,
        _count: {
          select: {
            rental_objects: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ businessCenters: centers });
  } catch (error) {
    console.error('GetBusinessCenters error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при получении списка бизнес-центров' });
  }
};

const getBusinessCenterById = async (req, res) => {
  try {
    const { id } = req.params;
    const centerId = parseInt(id);

    const center = await prisma.business_centers.findUnique({
      where: { id: centerId },
      include: {
        organizations: true,
        rental_objects: true,
      },
    });

    if (!center) {
      return res.status(404).json({ error: 'Бизнес-центр не найден' });
    }

    res.json({ businessCenter: center });
  } catch (error) {
    console.error('GetBusinessCenterById error:', error);
    res.status(500).json({ error: 'Ошибка при получении бизнес-центра' });
  }
};

const createBusinessCenter = async (req, res) => {
  try {
    const { organization_id, name, address } = req.body;

    if (!organization_id || !name || !address) {
      return res
        .status(400)
        .json({ error: 'organization_id, name и address обязательны' });
    }

    const org = await prisma.organizations.findUnique({
      where: { id: parseInt(organization_id) },
    });
    if (!org) {
      return res.status(400).json({ error: 'Организация не найдена' });
    }

    const center = await prisma.business_centers.create({
      data: {
        organization_id: parseInt(organization_id),
        name,
        address,
      },
    });

    res.status(201).json({
      message: 'Бизнес-центр создан',
      businessCenter: center,
    });
  } catch (error) {
    console.error('CreateBusinessCenter error:', error);
    res.status(500).json({ error: 'Ошибка при создании бизнес-центра' });
  }
};

const updateBusinessCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const centerId = parseInt(id);
    const { organization_id, name, address } = req.body;

    const existing = await prisma.business_centers.findUnique({
      where: { id: centerId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Бизнес-центр не найден' });
    }

    const data = {};
    if (organization_id !== undefined) {
      const org = await prisma.organizations.findUnique({
        where: { id: parseInt(organization_id) },
      });
      if (!org) {
        return res.status(400).json({ error: 'Организация не найдена' });
      }
      data.organization_id = parseInt(organization_id);
    }
    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;

    const updated = await prisma.business_centers.update({
      where: { id: centerId },
      data,
    });

    res.json({
      message: 'Бизнес-центр обновлен',
      businessCenter: updated,
    });
  } catch (error) {
    console.error('UpdateBusinessCenter error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении бизнес-центра' });
  }
};

const deleteBusinessCenter = async (req, res) => {
  try {
    const { id } = req.params;
    const centerId = parseInt(id);

    const relatedProperties = await prisma.rental_objects.count({
      where: { business_center_id: centerId },
    });

    if (relatedProperties > 0) {
      return res.status(400).json({
        error: 'Невозможно удалить бизнес-центр, так как в нем есть помещения',
      });
    }

    await prisma.business_centers.delete({
      where: { id: centerId },
    });

    res.json({ message: 'Бизнес-центр удален' });
  } catch (error) {
    console.error('DeleteBusinessCenter error:', error);
    res.status(500).json({ error: 'Ошибка при удалении бизнес-центра' });
  }
};

const getCenterProperties = async (req, res) => {
  try {
    const { id } = req.params;
    const centerId = parseInt(id);

    const center = await prisma.business_centers.findUnique({
      where: { id: centerId },
    });
    if (!center) {
      return res.status(404).json({ error: 'Бизнес-центр не найден' });
    }

    const properties = await prisma.rental_objects.findMany({
      where: { business_center_id: centerId },
      include: {
        users: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ properties });
  } catch (error) {
    console.error('GetCenterProperties error:', error);
    res.status(500).json({ error: 'Ошибка при получении помещений' });
  }
};

const getCenterContracts = async (req, res) => {
  try {
    const { id } = req.params;
    const centerId = parseInt(id);

    const center = await prisma.business_centers.findUnique({
      where: { id: centerId },
    });
    if (!center) {
      return res.status(404).json({ error: 'Бизнес-центр не найден' });
    }

    const properties = await prisma.rental_objects.findMany({
      where: { business_center_id: centerId },
      select: { id: true },
    });
    const propertyIds = properties.map((p) => p.id);

    const contracts = await prisma.contracts.findMany({
      where: {
        rental_object_id: { in: propertyIds },
      },
      include: {
        rental_objects: true,
        users: { include: { user_profiles: true } },
        organizations_contracts_tenant_organization_idToorganizations: true,
        organizations_contracts_landlord_organization_idToorganizations: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ contracts });
  } catch (error) {
    console.error('GetCenterContracts error:', error);
    res.status(500).json({ error: 'Ошибка при получении договоров' });
  }
};

module.exports = {
  getBusinessCenters,
  getBusinessCenterById,
  createBusinessCenter,
  updateBusinessCenter,
  deleteBusinessCenter,
  getCenterProperties,
  getCenterContracts,
};
