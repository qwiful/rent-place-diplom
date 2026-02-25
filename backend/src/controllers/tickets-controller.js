const prisma = require('../utils/prisma');

const canViewTicket = async (ticketId, user) => {
  if (user.roles.name === 'admin') return true;
  const ticket = await prisma.service_tickets.findUnique({
    where: { id: ticketId },
    include: {
      contracts: {
        include: {
          rental_objects: { select: { manager_id: true } },
        },
      },
    },
  });
  if (!ticket) return false;
  if (user.roles.name === 'manager') {
    return ticket.contracts?.rental_objects?.manager_id === user.id;
  }
  if (user.roles.name === 'tenant') {
    return ticket.creator_id === user.id;
  }
  return false;
};

const canModifyTicket = async (ticketId, user) => {
  if (user.roles.name === 'admin') return true;
  if (user.roles.name === 'manager') {
    const ticket = await prisma.service_tickets.findUnique({
      where: { id: ticketId },
      include: {
        contracts: {
          include: {
            rental_objects: { select: { manager_id: true } },
          },
        },
      },
    });
    return ticket?.contracts?.rental_objects?.manager_id === user.id;
  }
  return false;
};

const getTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      contract_id,
      assigned_to,
      creator_id,
      limit = 50,
      offset = 0,
    } = req.query;
    let where = {};

    if (req.user.roles.name === 'manager') {
      const managedContracts = await prisma.contracts.findMany({
        where: {
          rental_objects: { manager_id: req.user.id },
        },
        select: { id: true },
      });
      const contractIds = managedContracts.map((c) => c.id);
      where.contract_id = { in: contractIds };
    } else if (req.user.roles.name === 'tenant') {
      where.creator_id = req.user.id;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (contract_id) where.contract_id = parseInt(contract_id);
    if (assigned_to) where.assigned_manager_id = parseInt(assigned_to);
    if (creator_id && req.user.roles.name === 'admin')
      where.creator_id = parseInt(creator_id);

    const [tickets, total] = await Promise.all([
      prisma.service_tickets.findMany({
        where,
        include: {
          users_service_tickets_creator_idTousers: {
            include: { user_profiles: true },
          },
          users_service_tickets_assigned_manager_idTousers: {
            include: { user_profiles: true },
          },
          contracts: {
            include: {
              rental_objects: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.service_tickets.count({ where }),
    ]);

    res.json({
      tickets,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
    });
  } catch (error) {
    console.error('GetTickets error:', error);
    res.status(500).json({ error: 'Ошибка при получении списка заявок' });
  }
};

const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id);

    if (!(await canViewTicket(ticketId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на просмотр этой заявки' });
    }

    const ticket = await prisma.service_tickets.findUnique({
      where: { id: ticketId },
      include: {
        users_service_tickets_creator_idTousers: {
          include: { user_profiles: true },
        },
        users_service_tickets_assigned_manager_idTousers: {
          include: { user_profiles: true },
        },
        contracts: {
          include: {
            rental_objects: true,
            users: { include: { user_profiles: true } },
            organizations_contracts_tenant_organization_idToorganizations: true,
          },
        },
        ticket_status_history: {
          orderBy: { change_date: 'desc' },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('GetTicketById error:', error);
    res.status(500).json({ error: 'Ошибка при получении заявки' });
  }
};

const createTicket = async (req, res) => {
  try {
    const {
      contract_id,
      title,
      description,
      type = 'other',
      priority = 'medium',
    } = req.body;

    if (!contract_id || !title) {
      return res.status(400).json({ error: 'contract_id и title обязательны' });
    }

    const contract = await prisma.contracts.findUnique({
      where: { id: parseInt(contract_id) },
      include: { users: true },
    });

    if (!contract) {
      return res.status(400).json({ error: 'Договор не найден' });
    }

    if (req.user.roles.name === 'tenant') {
      if (contract.tenant_user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Вы можете создавать заявки только по своим договорам',
        });
      }
    }

    const ticket = await prisma.service_tickets.create({
      data: {
        creator_id: req.user.id,
        contract_id: parseInt(contract_id),
        title,
        description,
        type,
        priority,
        status: 'new',
      },
    });

    await prisma.ticket_status_history.create({
      data: {
        ticket_id: ticket.id,
        old_status: null,
        new_status: 'new',
        changed_by_user_id: req.user.id,
        change_reason: 'Ticket created',
      },
    });

    res.status(201).json({
      message: 'Заявка создана',
      ticket,
    });
  } catch (error) {
    console.error('CreateTicket error:', error);
    res.status(500).json({ error: 'Ошибка при создании заявки' });
  }
};

const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id);
    const data = req.body;

    if (!(await canModifyTicket(ticketId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на редактирование этой заявки' });
    }

    const existing = await prisma.service_tickets.findUnique({
      where: { id: ticketId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    delete data.creator_id;
    delete data.contract_id;

    const statusChanged = data.status && data.status !== existing.status;

    const updated = await prisma.service_tickets.update({
      where: { id: ticketId },
      data,
    });

    if (statusChanged) {
      await prisma.ticket_status_history.create({
        data: {
          ticket_id: ticketId,
          old_status: existing.status,
          new_status: data.status,
          changed_by_user_id: req.user.id,
          change_reason: data.change_reason || 'Status updated',
        },
      });
    }

    res.json({
      message: 'Заявка обновлена',
      ticket: updated,
    });
  } catch (error) {
    console.error('UpdateTicket error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении заявки' });
  }
};

const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id);

    if (req.user.roles.name !== 'admin') {
      return res
        .status(403)
        .json({ error: 'Только администратор может удалять заявки' });
    }

    await prisma.ticket_status_history.deleteMany({
      where: { ticket_id: ticketId },
    });

    await prisma.service_tickets.delete({
      where: { id: ticketId },
    });

    res.json({ message: 'Заявка удалена' });
  } catch (error) {
    console.error('DeleteTicket error:', error);
    res.status(500).json({ error: 'Ошибка при удалении заявки' });
  }
};

const getOpenTickets = async (req, res) => {
  try {
    let where = {
      status: { in: ['new', 'in_progress'] },
    };

    if (req.user.roles.name === 'manager') {
      const managedContracts = await prisma.contracts.findMany({
        where: {
          rental_objects: { manager_id: req.user.id },
        },
        select: { id: true },
      });
      const contractIds = managedContracts.map((c) => c.id);
      where.contract_id = { in: contractIds };
    } else if (req.user.roles.name !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }

    const tickets = await prisma.service_tickets.findMany({
      where,
      include: {
        users_service_tickets_creator_idTousers: {
          include: { user_profiles: true },
        },
        users_service_tickets_assigned_manager_idTousers: {
          include: { user_profiles: true },
        },
        contracts: {
          include: {
            rental_objects: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ tickets });
  } catch (error) {
    console.error('GetOpenTickets error:', error);
    res.status(500).json({ error: 'Ошибка при получении открытых заявок' });
  }
};

const getMyTickets = async (req, res) => {
  try {
    let where = {};

    if (req.user.roles.name === 'tenant') {
      where.creator_id = req.user.id;
    } else if (req.user.roles.name === 'manager') {
      where.assigned_manager_id = req.user.id;
    } else if (req.user.roles.name === 'admin') {
      return res
        .status(400)
        .json({ error: 'Используйте основной список заявок' });
    }

    const tickets = await prisma.service_tickets.findMany({
      where,
      include: {
        contracts: {
          include: {
            rental_objects: true,
          },
        },
        users_service_tickets_creator_idTousers: {
          include: { user_profiles: true },
        },
        users_service_tickets_assigned_manager_idTousers: {
          include: { user_profiles: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ tickets });
  } catch (error) {
    console.error('GetMyTickets error:', error);
    res.status(500).json({ error: 'Ошибка при получении ваших заявок' });
  }
};

const getTicketsByContract = async (req, res) => {
  try {
    const { contractId } = req.params;
    const contractIdInt = parseInt(contractId);

    const contract = await prisma.contracts.findUnique({
      where: { id: contractIdInt },
      include: {
        rental_objects: { select: { manager_id: true } },
      },
    });
    if (!contract) {
      return res.status(404).json({ error: 'Договор не найден' });
    }

    if (
      req.user.roles.name === 'manager' &&
      contract.rental_objects?.manager_id !== req.user.id
    ) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на просмотр заявок по этому договору' });
    }
    if (
      req.user.roles.name === 'tenant' &&
      contract.tenant_user_id !== req.user.id
    ) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на просмотр заявок по этому договору' });
    }

    const tickets = await prisma.service_tickets.findMany({
      where: { contract_id: contractIdInt },
      include: {
        users_service_tickets_creator_idTousers: {
          include: { user_profiles: true },
        },
        users_service_tickets_assigned_manager_idTousers: {
          include: { user_profiles: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    res.json({ tickets });
  } catch (error) {
    console.error('GetTicketsByContract error:', error);
    res.status(500).json({ error: 'Ошибка при получении заявок по договору' });
  }
};

const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { manager_id } = req.body;
    const ticketId = parseInt(id);

    if (!(await canModifyTicket(ticketId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на назначение исполнителя' });
    }

    const ticket = await prisma.service_tickets.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    if (manager_id) {
      const manager = await prisma.users.findUnique({
        where: { id: parseInt(manager_id) },
        include: { roles: true },
      });
      if (
        !manager ||
        (manager.roles.name !== 'manager' && manager.roles.name !== 'admin')
      ) {
        return res
          .status(400)
          .json({ error: 'Указанный пользователь не является менеджером' });
      }
    }

    const updated = await prisma.service_tickets.update({
      where: { id: ticketId },
      data: { assigned_manager_id: manager_id ? parseInt(manager_id) : null },
    });

    res.json({
      message: 'Исполнитель назначен',
      ticket: updated,
    });
  } catch (error) {
    console.error('AssignTicket error:', error);
    res.status(500).json({ error: 'Ошибка при назначении исполнителя' });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const ticketId = parseInt(id);

    if (!status) {
      return res.status(400).json({ error: 'status обязателен' });
    }

    if (!(await canModifyTicket(ticketId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на изменение статуса' });
    }

    const existing = await prisma.service_tickets.findUnique({
      where: { id: ticketId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const updateData = { status };
    if (status === 'completed' && !existing.completion_date) {
      updateData.completion_date = new Date();
    }

    const updated = await prisma.service_tickets.update({
      where: { id: ticketId },
      data: updateData,
    });

    await prisma.ticket_status_history.create({
      data: {
        ticket_id: ticketId,
        old_status: existing.status,
        new_status: status,
        changed_by_user_id: req.user.id,
        change_reason: reason || 'Status changed',
      },
    });

    res.json({
      message: 'Статус обновлен',
      ticket: updated,
    });
  } catch (error) {
    console.error('UpdateTicketStatus error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении статуса' });
  }
};

const updateTicketPriority = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority } = req.body;
    const ticketId = parseInt(id);

    if (!priority) {
      return res.status(400).json({ error: 'priority обязателен' });
    }

    if (!(await canModifyTicket(ticketId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на изменение приоритета' });
    }

    const existing = await prisma.service_tickets.findUnique({
      where: { id: ticketId },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    const updated = await prisma.service_tickets.update({
      where: { id: ticketId },
      data: { priority },
    });

    res.json({
      message: 'Приоритет обновлен',
      ticket: updated,
    });
  } catch (error) {
    console.error('UpdateTicketPriority error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении приоритета' });
  }
};

const getTicketHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketId = parseInt(id);

    if (!(await canViewTicket(ticketId, req.user))) {
      return res
        .status(403)
        .json({ error: 'У вас нет прав на просмотр истории этой заявки' });
    }

    const history = await prisma.ticket_status_history.findMany({
      where: { ticket_id: ticketId },
      include: {
        users: { include: { user_profiles: true } },
      },
      orderBy: { change_date: 'desc' },
    });

    res.json({ history });
  } catch (error) {
    console.error('GetTicketHistory error:', error);
    res.status(500).json({ error: 'Ошибка при получении истории статусов' });
  }
};

module.exports = {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  deleteTicket,
  getOpenTickets,
  getMyTickets,
  getTicketsByContract,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority,
  getTicketHistory,
};
