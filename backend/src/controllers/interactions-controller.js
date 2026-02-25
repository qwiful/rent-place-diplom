const prisma = require('../utils/prisma');

const canAccessContractInteractions = async (contractId, user) => {
  if (user.roles.name === 'admin') return true;
  const contract = await prisma.contracts.findUnique({
    where: { id: contractId },
    include: {
      rental_objects: { select: { manager_id: true } },
    },
  });
  if (!contract) return false;
  if (user.roles.name === 'manager') {
    return contract.rental_objects?.manager_id === user.id;
  }
  if (user.roles.name === 'tenant') {
    return contract.tenant_user_id === user.id;
  }
  return false;
};

const getInteractions = async (req, res) => {
  try {
    const { contract_id } = req.query;
    let where = {};

    if (contract_id) {
      const contractId = parseInt(contract_id);
      if (!(await canAccessContractInteractions(contractId, req.user))) {
        return res.status(403).json({
          error: 'У вас нет прав на просмотр взаимодействий по этому договору',
        });
      }
      where.contract_id = contractId;
    } else {
      if (req.user.roles.name === 'manager') {
        const managedContracts = await prisma.contracts.findMany({
          where: { rental_objects: { manager_id: req.user.id } },
          select: { id: true },
        });
        where.contract_id = { in: managedContracts.map((c) => c.id) };
      } else if (req.user.roles.name === 'tenant') {
        return res.status(403).json({
          error:
            'Арендатор может просматривать взаимодействия только по конкретному договору',
        });
      }
    }

    const interactions = await prisma.interactions.findMany({
      where,
      include: {
        contracts: {
          include: {
            rental_objects: true,
            users: { include: { user_profiles: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ interactions });
  } catch (error) {
    console.error('GetInteractions error:', error);
    res.status(500).json({ error: 'Ошибка при получении взаимодействий' });
  }
};

const getInteractionById = async (req, res) => {
  try {
    const { id } = req.params;
    const interactionId = parseInt(id);

    const interaction = await prisma.interactions.findUnique({
      where: { id: interactionId },
      include: {
        contracts: {
          include: {
            rental_objects: true,
            users: { include: { user_profiles: true } },
          },
        },
      },
    });

    if (!interaction) {
      return res.status(404).json({ error: 'Взаимодействие не найдено' });
    }

    if (
      !(await canAccessContractInteractions(interaction.contract_id, req.user))
    ) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на просмотр этого взаимодействия' });
    }

    res.json({ interaction });
  } catch (error) {
    console.error('GetInteractionById error:', error);
    res.status(500).json({ error: 'Ошибка при получении взаимодействия' });
  }
};

const createInteraction = async (req, res) => {
  try {
    const { contract_id, type, content } = req.body;

    if (!contract_id || !type || !content) {
      return res
        .status(400)
        .json({ error: 'contract_id, type и content обязательны' });
    }

    if (
      !(await canAccessContractInteractions(parseInt(contract_id), req.user))
    ) {
      return res.status(403).json({
        error: 'У вас нет прав на создание взаимодействий по этому договору',
      });
    }

    const interaction = await prisma.interactions.create({
      data: {
        contract_id: parseInt(contract_id),
        type,
        content,
        created_by: req.user.id,
      },
    });

    res.status(201).json({
      message: 'Взаимодействие создано',
      interaction,
    });
  } catch (error) {
    console.error('CreateInteraction error:', error);
    res.status(500).json({ error: 'Ошибка при создании взаимодействия' });
  }
};

const updateInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const interactionId = parseInt(id);
    const { type, content } = req.body;

    const existing = await prisma.interactions.findUnique({
      where: { id: interactionId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Взаимодействие не найдено' });
    }

    if (
      !(await canAccessContractInteractions(existing.contract_id, req.user))
    ) {
      return res.status(403).json({
        error: 'У вас нет прав на редактирование этого взаимодействия',
      });
    }

    const updated = await prisma.interactions.update({
      where: { id: interactionId },
      data: { type, content },
    });

    res.json({
      message: 'Взаимодействие обновлено',
      interaction: updated,
    });
  } catch (error) {
    console.error('UpdateInteraction error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении взаимодействия' });
  }
};

const deleteInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const interactionId = parseInt(id);

    const existing = await prisma.interactions.findUnique({
      where: { id: interactionId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Взаимодействие не найдено' });
    }

    if (req.user.roles.name !== 'admin') {
      if (req.user.roles.name === 'manager') {
        const contract = await prisma.contracts.findUnique({
          where: { id: existing.contract_id },
          include: { rental_objects: { select: { manager_id: true } } },
        });
        if (contract?.rental_objects?.manager_id !== req.user.id) {
          return res
            .status(403)
            .json({ error: 'У вас нет прав на удаление этого взаимодействия' });
        }
      } else {
        return res.status(403).json({ error: 'У вас нет прав на удаление' });
      }
    }

    await prisma.interactions.delete({
      where: { id: interactionId },
    });

    res.json({ message: 'Взаимодействие удалено' });
  } catch (error) {
    console.error('DeleteInteraction error:', error);
    res.status(500).json({ error: 'Ошибка при удалении взаимодействия' });
  }
};

const getInteractionsByContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const contractIdInt = parseInt(contractId);

    if (!(await canAccessContractInteractions(contractIdInt, req.user))) {
      return res.status(403).json({
        error: 'У вас нет прав на просмотр взаимодействий по этому договору',
      });
    }

    const interactions = await prisma.interactions.findMany({
      where: { contract_id: contractIdInt },
      orderBy: { created_at: 'desc' },
    });

    res.json({ interactions });
  } catch (error) {
    console.error('GetInteractionsByContract error:', error);
    res.status(500).json({ error: 'Ошибка при получении взаимодействий' });
  }
};

const getInteractionsByManager = async (req, res) => {
  try {
    const { managerId } = req.params;
    const managerIdInt = parseInt(managerId);

    if (req.user.roles.name === 'manager' && req.user.id !== managerIdInt) {
      return res
        .status(403)
        .json({ error: 'Вы можете просматривать только свои взаимодействия' });
    }

    const interactions = await prisma.interactions.findMany({
      where: { created_by: managerIdInt },
      include: {
        contracts: {
          include: {
            rental_objects: true,
            users: { include: { user_profiles: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ interactions });
  } catch (error) {
    console.error('GetInteractionsByManager error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при получении взаимодействий менеджера' });
  }
};

module.exports = {
  getInteractions,
  getInteractionById,
  createInteraction,
  updateInteraction,
  deleteInteraction,
  getInteractionsByContract,
  getInteractionsByManager,
};
