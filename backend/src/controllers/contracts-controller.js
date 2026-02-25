const prisma = require('../utils/prisma');

const generateContractNumber = () => {
  return 'CNT-' + Date.now().toString().slice(-8);
};

const canAccessContract = async (contractId, user, action = 'read') => {
  if (user.roles.name === 'admin') return true;
  if (user.roles.name === 'manager') {
    const contract = await prisma.contracts.findUnique({
      where: { id: contractId },
      include: {
        rental_objects: {
          select: { manager_id: true },
        },
      },
    });
    if (!contract) return false;
    return contract.rental_objects?.manager_id === user.id;
  }
  if (user.roles.name === 'tenant' && action === 'read') {
    const contract = await prisma.contracts.findUnique({
      where: { id: contractId },
    });
    if (!contract) return false;
    return contract.tenant_user_id === user.id;
  }
  return false;
};

const getManagedPropertyIds = async (managerId) => {
  const properties = await prisma.rental_objects.findMany({
    where: { manager_id: managerId },
    select: { id: true },
  });
  return properties.map((p) => p.id);
};

const getContracts = async (req, res) => {
  try {
    const {
      status,
      tenant_type,
      tenant_id,
      property_id,
      limit = 50,
      offset = 0,
    } = req.query;
    let where = {};

    if (req.user.roles.name === 'manager') {
      const propertyIds = await getManagedPropertyIds(req.user.id);
      if (propertyIds.length === 0) {
        return res.json({
          contracts: [],
          pagination: {
            total: 0,
            limit: parseInt(limit),
            offset: parseInt(offset),
          },
        });
      }
      where.rental_object_id = { in: propertyIds };
    }

    if (status) where.status = status;
    if (property_id) where.rental_object_id = parseInt(property_id);

    if (tenant_type === 'individual' && tenant_id) {
      where.tenant_user_id = parseInt(tenant_id);
    } else if (tenant_type === 'legal' && tenant_id) {
      where.tenant_organization_id = parseInt(tenant_id);
    }

    const [contracts, total] = await Promise.all([
      prisma.contracts.findMany({
        where,
        include: {
          rental_objects: {
            include: { business_centers: true },
          },
          users: {
            include: { user_profiles: true },
          },
          organizations_contracts_tenant_organization_idToorganizations: true,
          organizations_contracts_landlord_organization_idToorganizations: true,
          contract_status_history: {
            orderBy: { change_date: 'desc' },
            take: 1,
          },
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.contracts.count({ where }),
    ]);

    res.json({
      contracts,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (error) {
    console.error('GetContracts error:', error);
    res.status(500).json({ error: 'Ошибка при получении списка договоров' });
  }
};

const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const contractId = parseInt(id);

    if (!(await canAccessContract(contractId, req.user, 'read'))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на просмотр этого договора' });
    }

    const contract = await prisma.contracts.findUnique({
      where: { id: contractId },
      include: {
        rental_objects: {
          include: { business_centers: true },
        },
        users: { include: { user_profiles: true } },
        organizations_contracts_tenant_organization_idToorganizations: true,
        organizations_contracts_landlord_organization_idToorganizations: true,
        contract_status_history: {
          orderBy: { change_date: 'desc' },
        },
        interactions: true,
        service_tickets: true,
      },
    });

    if (!contract) {
      return res.status(404).json({ error: 'Договор не найден' });
    }

    res.json({ contract });
  } catch (error) {
    console.error('GetContractById error:', error);
    res.status(500).json({ error: 'Ошибка при получении договора' });
  }
};

const createContract = async (req, res) => {
  try {
    const {
      rental_object_id,
      tenant_user_id,
      tenant_organization_id,
      landlord_organization_id,
      start_date,
      end_date,
      monthly_rent,
      deposit,
      payment_day,
      contract_file_url,
      signed_at,
      status = 'draft',
    } = req.body;

    if (!tenant_user_id && !tenant_organization_id) {
      return res.status(400).json({
        error: 'Должен быть указан арендатор (физическое или юридическое лицо)',
      });
    }
    if (tenant_user_id && tenant_organization_id) {
      return res.status(400).json({
        error:
          'Арендатор не может быть одновременно физическим и юридическим лицом',
      });
    }

    const property = await prisma.rental_objects.findUnique({
      where: { id: parseInt(rental_object_id) },
    });
    if (!property) {
      return res.status(400).json({ error: 'Помещение не найдено' });
    }

    if (
      req.user.roles.name === 'manager' &&
      property.manager_id !== req.user.id
    ) {
      return res.status(403).json({
        error: 'Вы можете создавать договоры только для своих помещений',
      });
    }

    const landlord = await prisma.organizations.findUnique({
      where: { id: parseInt(landlord_organization_id) },
    });
    if (!landlord) {
      return res
        .status(400)
        .json({ error: 'Организация-арендодатель не найдена' });
    }

    if (tenant_user_id) {
      const tenantUser = await prisma.users.findUnique({
        where: { id: parseInt(tenant_user_id) },
      });
      if (!tenantUser) {
        return res.status(400).json({ error: 'Арендатор (физлицо) не найден' });
      }
    }

    if (tenant_organization_id) {
      const tenantOrg = await prisma.organizations.findUnique({
        where: { id: parseInt(tenant_organization_id) },
      });
      if (!tenantOrg) {
        return res
          .status(400)
          .json({ error: 'Организация-арендатор не найдена' });
      }
    }

    if (new Date(end_date) <= new Date(start_date)) {
      return res
        .status(400)
        .json({ error: 'Дата окончания должна быть позже даты начала' });
    }

    const contractNumber = generateContractNumber();

    const contract = await prisma.contracts.create({
      data: {
        contract_number: contractNumber,
        rental_object_id: parseInt(rental_object_id),
        tenant_user_id: tenant_user_id ? parseInt(tenant_user_id) : null,
        tenant_organization_id: tenant_organization_id
          ? parseInt(tenant_organization_id)
          : null,
        landlord_organization_id: parseInt(landlord_organization_id),
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        monthly_rent: parseFloat(monthly_rent),
        deposit: deposit ? parseFloat(deposit) : 0,
        payment_day: payment_day ? parseInt(payment_day) : null,
        contract_file_url,
        signed_at: signed_at ? new Date(signed_at) : null,
        status,
      },
    });

    if (status !== 'draft') {
      await prisma.contract_status_history.create({
        data: {
          contract_id: contract.id,
          old_status: null,
          new_status: status,
          changed_by_user_id: req.user.id,
          change_reason: 'Initial status',
        },
      });
    }

    res.status(201).json({
      message: 'Договор создан',
      contract,
    });
  } catch (error) {
    console.error('CreateContract error:', error);
    res.status(500).json({ error: 'Ошибка при создании договора' });
  }
};

const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contractId = parseInt(id);
    const data = req.body;

    if (!(await canAccessContract(contractId, req.user, 'write'))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на редактирование этого договора' });
    }

    const existing = await prisma.contracts.findUnique({
      where: { id: contractId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Договор не найден' });
    }

    const changeReason = data.change_reason;
    delete data.contract_number;
    delete data.change_reason;
    delete data.id;
    delete data.created_at;
    delete data.updated_at;

    const statusChanged = data.status && data.status !== existing.status;

    const updated = await prisma.contracts.update({
      where: { id: contractId },
      data: {
        ...data,
        rental_object_id: data.rental_object_id
          ? parseInt(data.rental_object_id)
          : undefined,
        tenant_user_id:
          data.tenant_user_id !== undefined
            ? data.tenant_user_id
              ? parseInt(data.tenant_user_id)
              : null
            : undefined,
        tenant_organization_id:
          data.tenant_organization_id !== undefined
            ? data.tenant_organization_id
              ? parseInt(data.tenant_organization_id)
              : null
            : undefined,
        landlord_organization_id: data.landlord_organization_id
          ? parseInt(data.landlord_organization_id)
          : undefined,
        monthly_rent: data.monthly_rent
          ? parseFloat(data.monthly_rent)
          : undefined,
        deposit:
          data.deposit !== undefined ? parseFloat(data.deposit) : undefined,
        payment_day:
          data.payment_day !== undefined
            ? data.payment_day
              ? parseInt(data.payment_day)
              : null
            : undefined,
        start_date: data.start_date ? new Date(data.start_date) : undefined,
        end_date: data.end_date ? new Date(data.end_date) : undefined,
        signed_at: data.signed_at ? new Date(data.signed_at) : undefined,
      },
    });

    if (statusChanged) {
      await prisma.contract_status_history.create({
        data: {
          contract_id: contractId,
          old_status: existing.status,
          new_status: data.status,
          changed_by_user_id: req.user.id,
          change_reason: changeReason || 'Status updated',
        },
      });
    }

    res.json({
      message: 'Договор обновлен',
      contract: updated,
    });
  } catch (error) {
    console.error('UpdateContract error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении договора' });
  }
};

const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contractId = parseInt(id);

    if (!(await canAccessContract(contractId, req.user, 'write'))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на удаление этого договора' });
    }

    await prisma.contract_status_history.deleteMany({
      where: { contract_id: contractId },
    });

    await prisma.interactions.deleteMany({
      where: { contract_id: contractId },
    });

    const ticketsToDelete = await prisma.service_tickets.findMany({
      where: { contract_id: contractId },
      select: { id: true },
    });
    const ticketIds = ticketsToDelete.map((t) => t.id);

    if (ticketIds.length > 0) {
      await prisma.ticket_status_history.deleteMany({
        where: { ticket_id: { in: ticketIds } },
      });
    }

    await prisma.service_tickets.deleteMany({
      where: { contract_id: contractId },
    });

    await prisma.contracts.delete({
      where: { id: contractId },
    });

    res.json({ message: 'Договор удален' });
  } catch (error) {
    console.error('DeleteContract error:', error);
    res.status(500).json({ error: 'Ошибка при удалении договора' });
  }
};

const getActiveContracts = async (req, res) => {
  try {
    let where = { status: 'active' };

    if (req.user.roles.name === 'manager') {
      const propertyIds = await getManagedPropertyIds(req.user.id);
      if (propertyIds.length === 0) {
        return res.json({ contracts: [] });
      }
      where.rental_object_id = { in: propertyIds };
    }

    const contracts = await prisma.contracts.findMany({
      where,
      include: {
        rental_objects: { include: { business_centers: true } },
        users: { include: { user_profiles: true } },
        organizations_contracts_tenant_organization_idToorganizations: true,
      },
      orderBy: { end_date: 'asc' },
    });
    res.json({ contracts });
  } catch (error) {
    console.error('GetActiveContracts error:', error);
    res.status(500).json({ error: 'Ошибка при получении активных договоров' });
  }
};

const getExpiringContracts = async (req, res) => {
  try {
    const today = new Date();
    const monthLater = new Date();
    monthLater.setDate(monthLater.getDate() + 30);

    let where = {
      status: 'active',
      end_date: {
        gte: today,
        lte: monthLater,
      },
    };

    if (req.user.roles.name === 'manager') {
      const propertyIds = await getManagedPropertyIds(req.user.id);
      if (propertyIds.length === 0) {
        return res.json({ contracts: [] });
      }
      where.rental_object_id = { in: propertyIds };
    }

    const contracts = await prisma.contracts.findMany({
      where,
      include: {
        rental_objects: true,
        users: { include: { user_profiles: true } },
        organizations_contracts_tenant_organization_idToorganizations: true,
      },
      orderBy: { end_date: 'asc' },
    });
    res.json({ contracts });
  } catch (error) {
    console.error('GetExpiringContracts error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при получении истекающих договоров' });
  }
};

const getContractsByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenantIdInt = parseInt(tenantId);
    const { type } = req.query;

    if (req.user.roles.name === 'tenant' && req.user.id !== tenantIdInt) {
      return res
        .status(403)
        .json({ error: 'Вы можете просматривать только свои договоры' });
    }

    const where = {};
    if (type === 'individual') {
      where.tenant_user_id = tenantIdInt;
    } else if (type === 'legal') {
      where.tenant_organization_id = tenantIdInt;
    } else {
      where.OR = [
        { tenant_user_id: tenantIdInt },
        { tenant_organization_id: tenantIdInt },
      ];
    }

    if (req.user.roles.name === 'manager') {
      const propertyIds = await getManagedPropertyIds(req.user.id);
      if (propertyIds.length === 0) {
        return res.json({ contracts: [] });
      }
      where.rental_object_id = { in: propertyIds };
    }

    const contracts = await prisma.contracts.findMany({
      where,
      include: {
        rental_objects: { include: { business_centers: true } },
        users: { include: { user_profiles: true } },
        organizations_contracts_tenant_organization_idToorganizations: true,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ contracts });
  } catch (error) {
    console.error('GetContractsByTenant error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при получении договоров арендатора' });
  }
};

const getContractsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const propertyIdInt = parseInt(propertyId);

    if (req.user.roles.name === 'manager') {
      const property = await prisma.rental_objects.findUnique({
        where: { id: propertyIdInt },
        select: { manager_id: true },
      });
      if (!property || property.manager_id !== req.user.id) {
        return res.status(403).json({
          error: 'У вас нет прав на просмотр договоров этого помещения',
        });
      }
    }

    const contracts = await prisma.contracts.findMany({
      where: { rental_object_id: propertyIdInt },
      include: {
        users: { include: { user_profiles: true } },
        organizations_contracts_tenant_organization_idToorganizations: true,
      },
      orderBy: { created_at: 'desc' },
    });
    res.json({ contracts });
  } catch (error) {
    console.error('GetContractsByProperty error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при получении договоров по помещению' });
  }
};

const updateContractStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const contractId = parseInt(id);

    if (!status) {
      return res.status(400).json({ error: 'status обязателен' });
    }

    if (!(await canAccessContract(contractId, req.user, 'write'))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на изменение статуса этого договора' });
    }

    const existing = await prisma.contracts.findUnique({
      where: { id: contractId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Договор не найден' });
    }

    const updated = await prisma.contracts.update({
      where: { id: contractId },
      data: { status },
    });

    await prisma.contract_status_history.create({
      data: {
        contract_id: contractId,
        old_status: existing.status,
        new_status: status,
        changed_by_user_id: req.user.id,
        change_reason: reason || 'Status changed',
      },
    });

    res.json({
      message: 'Статус договора обновлен',
      contract: updated,
    });
  } catch (error) {
    console.error('UpdateContractStatus error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса' });
  }
};

const getContractHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const contractId = parseInt(id);

    if (!(await canAccessContract(contractId, req.user, 'read'))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на просмотр истории этого договора' });
    }

    const history = await prisma.contract_status_history.findMany({
      where: { contract_id: contractId },
      include: {
        users: { include: { user_profiles: true } },
      },
      orderBy: { change_date: 'desc' },
    });

    res.json({ history });
  } catch (error) {
    console.error('GetContractHistory error:', error);
    res.status(500).json({ error: 'Ошибка при получении истории статусов' });
  }
};

module.exports = {
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  getActiveContracts,
  getExpiringContracts,
  getContractsByTenant,
  getContractsByProperty,
  updateContractStatus,
  getContractHistory,
};
