const express = require('express')
const { PrismaClient } = require('@prisma/client')

const app = express()
const prisma = new PrismaClient()
const PORT = process.env.PORT || 3000

// Middleware для парсинга JSON
app.use(express.json())

// Пример маршрута для получения пользователей
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.users.findMany()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении пользователей' })
  }
})

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`)
  console.log(`Проверка: http://localhost:${PORT}/api/users`)
})

// Корректное завершение приложения
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  console.log('Приложение завершило работу')
  process.exit()
})
