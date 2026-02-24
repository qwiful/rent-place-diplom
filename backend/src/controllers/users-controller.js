const bcrypt = require('bcryptjs');
const { validateEmail, validatePhone } = require('../utils/validation');

const prisma = require('../utils/prisma');

const getUsers = async (req, res) => {
  try {
    const { role, active, search } = req.query;

    const where = {};

    if (role) {
      where.role_id = parseInt(role);
    }

    if (active !== undefined) {
      where.is_active = active === 'true';
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        {
          user_profiles: {
            OR: [
              { first_name: { contains: search, mode: 'insensitive' } },
              { last_name: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const users = await prisma.users.findMany({
      where,
      include: {
        roles: true,
        user_profiles: true,
        organizations: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('GetUsers error:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователей' });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        roles: true,
        user_profiles: true,
        organizations: true,
        ...(req.user.role_id === 1 && {
          audit_logs: true,
          contract_status_history: true,
          ticket_status_history: true,
        }),
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    res.json({ user });
  } catch (error) {
    console.error('GetUserById error:', error);
    res.status(500).json({ error: 'Ошибка при получении пользователя' });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      email,
      password,
      phone,
      role_id,
      organization_id,
      firstName,
      lastName,
      middleName,
      gender,
      is_active = true,
    } = req.body;

    if (!email || !password || !role_id) {
      return res
        .status(400)
        .json({ error: 'Email, пароль и роль обязательны' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Некорректный телефон' });
    }

    if (organization_id) {
      const org = await prisma.organizations.findUnique({
        where: { id: parseInt(organization_id) },
      });
      if (!org) {
        return res.status(400).json({ error: 'Организация не найдена' });
      }
    }

    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: 'Пользователь с таким email уже существует' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (prisma) => {
      const user = await prisma.users.create({
        data: {
          email,
          password_hash: hashedPassword,
          phone,
          role_id: parseInt(role_id),
          organization_id: organization_id ? parseInt(organization_id) : null,
          is_active,
        },
      });

      if (firstName || lastName) {
        await prisma.user_profiles.create({
          data: {
            user_id: user.id,
            first_name: firstName || '',
            last_name: lastName || '',
            middle_name: middleName,
            gender,
          },
        });
      }

      return user;
    });

    const newUser = await prisma.users.findUnique({
      where: { id: result.id },
      include: { roles: true, user_profiles: true },
    });

    res.status(201).json({
      message: 'Пользователь создан',
      user: newUser,
    });
  } catch (error) {
    console.error('CreateUser error:', error);
    res.status(500).json({ error: 'Ошибка при создании пользователя' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { email, phone, role_id, is_active, password, organization_id } =
      req.body;

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    if (req.user.id !== userId && req.user.roles.name !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const updateData = {};

    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Некорректный email' });
      }

      if (email !== user.email) {
        const existingUser = await prisma.users.findUnique({
          where: { email },
        });
        if (existingUser) {
          return res.status(400).json({ error: 'Email уже используется' });
        }
      }
      updateData.email = email;
    }

    if (phone !== undefined) {
      if (phone && !validatePhone(phone)) {
        return res.status(400).json({ error: 'Некорректный телефон' });
      }
      updateData.phone = phone;
    }

    if (role_id !== undefined && req.user.roles.name === 'admin') {
      updateData.role_id = parseInt(role_id);
    }

    if (req.user.roles.name !== 'admin' && organization_id !== undefined) {
      return res.status(403).json({
        error: 'Только администратор может изменять организацию пользователя',
      });
    }

    if (organization_id !== undefined) {
      if (organization_id === null) {
        updateData.organization_id = null;
      } else {
        const org = await prisma.organizations.findUnique({
          where: { id: parseInt(organization_id) },
        });
        if (!org) {
          return res.status(400).json({ error: 'Организация не найдена' });
        }
        updateData.organization_id = parseInt(organization_id);
      }
    }

    if (is_active !== undefined && req.user.roles.name === 'admin') {
      updateData.is_active = is_active;
    }

    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ error: 'Пароль должен быть минимум 6 символов' });
      }
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData,
      include: { roles: true, user_profiles: true },
    });

    res.json({
      message: 'Пользователь обновлен',
      user: updatedUser,
    });
  } catch (error) {
    console.error('UpdateUser error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении пользователя' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Нельзя удалить самого себя' });
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    await prisma.users.update({
      where: { id: userId },
      data: {
        is_active: false,
        email: `${user.email}_deleted_${Date.now()}`,
        phone: user.phone ? `${user.phone}_deleted` : null,
      },
    });

    res.json({ message: 'Пользователь деактивирован' });
  } catch (error) {
    console.error('DeleteUser error:', error);
    res.status(500).json({ error: 'Ошибка при удалении пользователя' });
  }
};

const changeRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role_id } = req.body;
    const userId = parseInt(id);

    if (!role_id) {
      return res.status(400).json({ error: 'role_id обязателен' });
    }

    const role = await prisma.roles.findUnique({
      where: { id: parseInt(role_id) },
    });

    if (!role) {
      return res.status(404).json({ error: 'Роль не найдена' });
    }

    const user = await prisma.users.update({
      where: { id: userId },
      data: { role_id: parseInt(role_id) },
      include: { roles: true },
    });

    res.json({
      message: 'Роль изменена',
      user,
    });
  } catch (error) {
    console.error('ChangeRole error:', error);
    res.status(500).json({ error: 'Ошибка при изменении роли' });
  }
};

const changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, reason } = req.body;
    const userId = parseInt(id);

    if (is_active === undefined) {
      return res.status(400).json({ error: 'is_active обязателен' });
    }

    if (is_active === false && (!reason || reason.trim() === '')) {
      return res
        .status(400)
        .json({ error: 'Необходимо указать причину блокировки' });
    }

    if (req.user.id === userId && !is_active) {
      return res
        .status(400)
        .json({ error: 'Нельзя деактивировать самого себя' });
    }

    const currentUser = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: { is_active },
      include: { roles: true },
    });

    await prisma.audit_logs.create({
      data: {
        user_id: req.user.id,
        action: is_active ? 'USER_ACTIVATED' : 'USER_BLOCKED',
        entity_type: 'users',
        entity_id: userId,
        old_values: { is_active: currentUser.is_active },
        new_values: { is_active, reason: reason || null },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent'] || null,
        timestamp: new Date(),
      },
    });

    res.json({
      message: `Пользователь ${is_active ? 'активирован' : 'заблокирован'}`,
      reason: reason || undefined,
      user: updatedUser,
    });
  } catch (error) {
    console.error('ChangeStatus error:', error);
    res.status(500).json({ error: 'Ошибка при изменении статуса' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);

    const profile = await prisma.user_profiles.findUnique({
      where: { user_id: userId },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Профиль не найден' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('GetUserProfile error:', error);
    res.status(500).json({ error: 'Ошибка при получении профиля' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id);
    const { first_name, last_name, middle_name, gender, avatar_url } = req.body;

    if (req.user.id !== userId && req.user.roles.name !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const existingProfile = await prisma.user_profiles.findUnique({
      where: { user_id: userId },
    });

    let profile;
    if (existingProfile) {
      profile = await prisma.user_profiles.update({
        where: { user_id: userId },
        data: {
          first_name: first_name || existingProfile.first_name,
          last_name: last_name || existingProfile.last_name,
          middle_name,
          gender,
          avatar_url,
        },
      });
    } else {
      profile = await prisma.user_profiles.create({
        data: {
          user_id: userId,
          first_name: first_name || '',
          last_name: last_name || '',
          middle_name,
          gender,
          avatar_url,
        },
      });
    }

    res.json({
      message: 'Профиль обновлен',
      profile,
    });
  } catch (error) {
    console.error('UpdateUserProfile error:', error);
    res.status(500).json({ error: 'Ошибка при обновлении профиля' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeRole,
  changeStatus,
  getUserProfile,
  updateUserProfile,
};
