const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  validateEmail,
  validatePassword,
  validatePhone,
} = require('../utils/validation');

const prisma = require('../utils/prisma');

const register = async (req, res) => {
  try {
    const { email, password, phone, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ error: 'Пароль должен быть минимум 6 символов' });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ error: 'Некорректный телефон' });
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

    const tenantRole = await prisma.roles.findFirst({
      where: { name: 'tenant' },
    });

    if (!tenantRole) {
      return res.status(500).json({ error: 'Роль арендатора не найдена' });
    }

    const result = await prisma.$transaction(async (prisma) => {
      const user = await prisma.users.create({
        data: {
          email,
          password_hash: hashedPassword,
          phone: phone || null,
          role_id: tenantRole.id,
          is_active: true,
        },
      });

      if (firstName || lastName) {
        await prisma.user_profiles.create({
          data: {
            user_id: user.id,
            first_name: firstName || '',
            last_name: lastName || '',
          },
        });
      }

      return user;
    });

    const token = jwt.sign(
      { userId: result.id, email: result.email, role: tenantRole.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    const refreshToken = jwt.sign({ userId: result.id }, refreshSecret, {
      expiresIn: '30d',
    });

    const userWithProfile = await prisma.users.findUnique({
      where: { id: result.id },
      include: { user_profiles: true, roles: true },
    });

    res.status(201).json({
      message: 'Пользователь успешно зарегистрирован',
      user: userWithProfile,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Ошибка при регистрации' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }

    const user = await prisma.users.findUnique({
      where: { email },
      include: { roles: true, user_profiles: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Пользователь деактивирован' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    await prisma.users.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.roles.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    const refreshToken = jwt.sign({ userId: user.id }, refreshSecret, {
      expiresIn: '30d',
    });

    res.json({
      message: 'Вход выполнен успешно',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.roles.name,
        profile: user.user_profiles,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Ошибка при входе' });
  }
};

const logout = (req, res) => {
  res.json({ message: 'Выход выполнен успешно' });
};

const getMe = async (req, res) => {
  try {
    const roleName = req.user.roles?.name;

    const include = {
      roles: true,
      user_profiles: true,
    };

    if (roleName === 'manager') {
      include.rental_objects = true;
    }

    if (roleName === 'tenant') {
      include.service_tickets_service_tickets_creator_idTousers = true;
    }

    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      include,
    });

    res.json({ user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ error: 'Ошибка при получении данных' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token обязателен' });
    }

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '_refresh';
    const decoded = jwt.verify(refreshToken, refreshSecret);

    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: { roles: true },
    });

    if (!user || !user.is_active) {
      return res
        .status(401)
        .json({ error: 'Пользователь не найден или деактивирован' });
    }

    const newToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.roles.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    res.json({ token: newToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Refresh token истёк' });
    }
    res.status(500).json({ error: 'Ошибка при обновлении токена' });
  }
};

module.exports = {
  register,
  login,
  logout,
  getMe,
  refreshToken,
};
