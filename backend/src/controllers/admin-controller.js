const prisma = require('../utils/prisma')

const getUsers = async (req, res) => {
  try {
    const users = await prisma.users.findMany({
      include: {
        roles: true,
        user_profiles: true,
        organizations: true,
      },
      orderBy: { id: 'asc' },
    })
    res.json({ users })
  } catch (error) {
    console.error('GetUsers error:', error)
    res.status(500).json({ error: 'Ошибка при получении пользователей' })
  }
}

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
    } = req.body

    if (!full_name || !inn) {
      return res.status(400).json({ error: 'full_name и inn обязательны' })
    }

    const newOrg = await prisma.organizations.create({
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
    })

    await prisma.audit_logs.create({
      data: {
        user_id: req.user.id,
        action: 'Создание организации',
        entity_type: 'Organization',
        entity_id: newOrg.id,
        new_values: { full_name, inn },
        ip_address: req.ip || null,
        user_agent: req.headers['user-agent'],
      },
    })

    res
      .status(201)
      .json({ message: 'Организация создана', organization: newOrg })
  } catch (error) {
    console.error('CreateOrganization error:', error)
    res.status(500).json({ error: 'Ошибка при создании организации' })
  }
}

const toggleUserBlock = async (req, res) => {
  try {
    const { id } = req.params
    const { is_active } = req.body
    const targetId = parseInt(id)

    const oldUser = await prisma.users.findUnique({
      where: { id: targetId },
      include: { user_profiles: true },
    })
    if (!oldUser) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }

    const user = await prisma.users.update({
      where: { id: targetId },
      data: { is_active },
      include: { roles: true, user_profiles: true },
    })

    await prisma.audit_logs.create({
      data: {
        user_id: req.user.id,
        action: is_active
          ? 'Разблокировка пользователя'
          : 'Блокировка пользователя',
        entity_type: 'User',
        entity_id: targetId,
        old_values: { is_active: oldUser.is_active },
        new_values: { is_active: is_active },
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers['user-agent'],
      },
    })

    res.json({
      user,
      message: is_active
        ? 'Пользователь разблокирован'
        : 'Пользователь заблокирован',
    })
  } catch (error) {
    console.error('ToggleUserBlock error:', error)
    res.status(500).json({ error: 'Ошибка при изменении статуса' })
  }
}

const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params
    const { role_id } = req.body
    const targetId = parseInt(id)

    const roleExists = await prisma.roles.findUnique({ where: { id: role_id } })
    if (!roleExists) {
      return res.status(400).json({ error: 'Роль не найдена' })
    }

    const oldUser = await prisma.users.findUnique({
      where: { id: targetId },
      include: { roles: true },
    })
    if (!oldUser) {
      return res.status(404).json({ error: 'Пользователь не найден' })
    }

    const user = await prisma.users.update({
      where: { id: targetId },
      data: { role_id },
      include: { roles: true, user_profiles: true },
    })

    await prisma.audit_logs.create({
      data: {
        user_id: req.user.id,
        action: 'Смена роли пользователя',
        entity_type: 'User',
        entity_id: targetId,
        old_values: { role: oldUser.roles?.name },
        new_values: { role: user.roles.name },
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers['user-agent'],
      },
    })

    res.json({ user, message: 'Роль изменена' })
  } catch (error) {
    console.error('ChangeUserRole error:', error)
    res.status(500).json({ error: 'Ошибка при смене роли' })
  }
}

const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params
    const orgId = parseInt(id)

    const businessCentersCount = await prisma.business_centers.count({
      where: { organization_id: orgId },
    })
    if (businessCentersCount > 0) {
      return res.status(400).json({
        error:
          'Невозможно удалить организацию – сначала удалите её бизнес-центры',
      })
    }

    await prisma.organizations.delete({
      where: { id: orgId },
    })

    await prisma.audit_logs.create({
      data: {
        user_id: req.user.id,
        action: 'Удаление организации',
        entity_type: 'Organization',
        entity_id: orgId,
        ip_address: req.ip || req.connection?.remoteAddress || null,
        user_agent: req.headers['user-agent'],
      },
    })

    res.json({ message: 'Организация удалена' })
  } catch (error) {
    console.error('DeleteOrganization error:', error)
    res.status(500).json({ error: 'Ошибка при удалении организации' })
  }
}

const getOrganizations = async (req, res) => {
  try {
    const orgs = await prisma.organizations.findMany({
      include: {
        users: true,
        business_centers: true,
      },
      orderBy: { id: 'asc' },
    })
    res.json({ organizations: orgs })
  } catch (error) {
    console.error('GetOrganizations error:', error)
    res.status(500).json({ error: 'Ошибка при получении организаций' })
  }
}

const getAuditLogs = async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query
    const logs = await prisma.audit_logs.findMany({
      include: {
        users: { include: { user_profiles: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    })
    const total = await prisma.audit_logs.count()
    res.json({
      logs,
      pagination: { total, limit: parseInt(limit), offset: parseInt(offset) },
    })
  } catch (error) {
    console.error('GetAuditLogs error:', error)
    res.status(500).json({ error: 'Ошибка при получении аудит-логов' })
  }
}

module.exports = {
  getUsers,
  toggleUserBlock,
  changeUserRole,
  getOrganizations,
  deleteOrganization,
  getAuditLogs,
  createOrganization,
}
