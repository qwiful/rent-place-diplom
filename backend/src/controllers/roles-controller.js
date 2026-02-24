const prisma = require('../utils/prisma');

const getRoles = async (req, res) => {
  try {
    const roles = await prisma.roles.findMany({
      orderBy: { id: 'asc' },
    });
    res.json({ roles });
  } catch (error) {
    console.error('GetRoles error:', error);
    res.status(500).json({ error: 'Ошибка при получении списка ролей' });
  }
};

const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await prisma.roles.findUnique({
      where: { id: parseInt(id) },
    });

    if (!role) {
      return res.status(404).json({ error: 'Роль не найдена' });
    }

    res.json({ role });
  } catch (error) {
    console.error('GetRoleById error:', error);
    res.status(500).json({ error: 'Ошибка при получении роли' });
  }
};

const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Название роли обязательно' });
    }

    const existing = await prisma.roles.findUnique({
      where: { name },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: 'Роль с таким названием уже существует' });
    }

    const role = await prisma.roles.create({
      data: {
        name,
        description,
      },
    });

    res.status(201).json({
      message: 'Роль создана',
      role,
    });
  } catch (error) {
    console.error('CreateRole error:', error);
    res.status(500).json({ error: 'Ошибка при создании роли' });
  }
};

const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const roleId = parseInt(id);

    const existing = await prisma.roles.findUnique({
      where: { id: roleId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Роль не найдена' });
    }

    if (name && name !== existing.name) {
      const nameExists = await prisma.roles.findUnique({
        where: { name },
      });
      if (nameExists) {
        return res
          .status(400)
          .json({ error: 'Роль с таким названием уже существует' });
      }
    }

    const updated = await prisma.roles.update({
      where: { id: roleId },
      data: {
        name: name || existing.name,
        description:
          description !== undefined ? description : existing.description,
      },
    });

    res.json({
      message: 'Роль обновлена',
      role: updated,
    });
  } catch (error) {
    console.error('UpdateRole error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении роли' });
  }
};

const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const roleId = parseInt(id);

    const usersWithRole = await prisma.users.count({
      where: { role_id: roleId },
    });

    if (usersWithRole > 0) {
      return res.status(400).json({
        error: 'Невозможно удалить роль, так как она назначена пользователям',
      });
    }

    await prisma.roles.delete({
      where: { id: roleId },
    });

    res.json({ message: 'Роль удалена' });
  } catch (error) {
    console.error('DeleteRole error:', error);
    res.status(500).json({ error: 'Ошибка при удалении роли' });
  }
};

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
