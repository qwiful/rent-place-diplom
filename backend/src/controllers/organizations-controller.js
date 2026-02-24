const prisma = require('../utils/prisma');

const getOrganizations = async (req, res) => {
  try {
    const organizations = await prisma.organizations.findMany({
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            users: true,
            business_centers: true,
            contracts_contracts_landlord_organization_idToorganizations: true,
            contracts_contracts_tenant_organization_idToorganizations: true,
          },
        },
      },
    });
    res.json({ organizations });
  } catch (error) {
    console.error('GetOrganizations error:', error);
    res.status(500).json({ error: 'Ошибка при получении списка организаций' });
  }
};

const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = parseInt(id);

    const organization = await prisma.organizations.findUnique({
      where: { id: orgId },
      include: {
        business_centers: true,
        users: true,
        contracts_contracts_landlord_organization_idToorganizations: true,
        contracts_contracts_tenant_organization_idToorganizations: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Организация не найдена' });
    }

    res.json({ organization });
  } catch (error) {
    console.error('GetOrganizationById error:', error);
    res.status(500).json({ error: 'Ошибка при получении организации' });
  }
};

const createOrganization = async (req, res) => {
  try {
    const {
      full_name,
      short_name,
      inn,
      kpp,
      ogrn,
      legal_address,
      actual_address,
      phone,
      email,
    } = req.body;

    if (!full_name || !inn) {
      return res.status(400).json({ error: 'Название и ИНН обязательны' });
    }

    const existing = await prisma.organizations.findUnique({
      where: { inn },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: 'Организация с таким ИНН уже существует' });
    }

    const organization = await prisma.organizations.create({
      data: {
        full_name,
        short_name,
        inn,
        kpp,
        ogrn,
        legal_address,
        actual_address,
        phone,
        email,
      },
    });

    res.status(201).json({
      message: 'Организация создана',
      organization,
    });
  } catch (error) {
    console.error('CreateOrganization error:', error);
    res.status(500).json({ error: 'Ошибка при создании организации' });
  }
};

const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = parseInt(id);
    const data = req.body;

    const existing = await prisma.organizations.findUnique({
      where: { id: orgId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Организация не найдена' });
    }

    if (data.inn && data.inn !== existing.inn) {
      const innExists = await prisma.organizations.findUnique({
        where: { inn: data.inn },
      });
      if (innExists) {
        return res
          .status(400)
          .json({ error: 'Организация с таким ИНН уже существует' });
      }
    }

    const updated = await prisma.organizations.update({
      where: { id: orgId },
      data,
    });

    res.json({
      message: 'Организация обновлена',
      organization: updated,
    });
  } catch (error) {
    console.error('UpdateOrganization error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении организации' });
  }
};

const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = parseInt(id);

    const relatedBusinessCenters = await prisma.business_centers.count({
      where: { organization_id: orgId },
    });

    const relatedContractsAsLandlord = await prisma.contracts.count({
      where: { landlord_organization_id: orgId },
    });

    const relatedContractsAsTenant = await prisma.contracts.count({
      where: { tenant_organization_id: orgId },
    });

    const relatedUsers = await prisma.users.count({
      where: { organization_id: orgId },
    });

    if (
      relatedBusinessCenters > 0 ||
      relatedContractsAsLandlord > 0 ||
      relatedContractsAsTenant > 0 ||
      relatedUsers > 0
    ) {
      return res.status(400).json({
        error:
          'Невозможно удалить организацию, так как с ней связаны бизнес-центры, договоры или пользователи',
      });
    }

    await prisma.organizations.delete({
      where: { id: orgId },
    });

    res.json({ message: 'Организация удалена' });
  } catch (error) {
    console.error('DeleteOrganization error:', error);
    res.status(500).json({ error: 'Ошибка при удалении организации' });
  }
};

const getOrganizationContracts = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = parseInt(id);

    const organization = await prisma.organizations.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Организация не найдена' });
    }

    const contracts = await prisma.contracts.findMany({
      where: {
        OR: [
          { landlord_organization_id: orgId },
          { tenant_organization_id: orgId },
        ],
      },
      include: {
        rental_objects: {
          include: {
            business_centers: true,
          },
        },
        users: {
          include: {
            user_profiles: true,
          },
        },
        organizations_contracts_tenant_organization_idToorganizations: true,
        organizations_contracts_landlord_organization_idToorganizations: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ contracts });
  } catch (error) {
    console.error('GetOrganizationContracts error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при получении договоров организации' });
  }
};

const getOrganizationUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = parseInt(id);

    const organization = await prisma.organizations.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Организация не найдена' });
    }

    const users = await prisma.users.findMany({
      where: { organization_id: orgId },
      include: {
        roles: true,
        user_profiles: true,
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ users });
  } catch (error) {
    console.error('GetOrganizationUsers error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при получении сотрудников организации' });
  }
};

module.exports = {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationContracts,
  getOrganizationUsers,
};
