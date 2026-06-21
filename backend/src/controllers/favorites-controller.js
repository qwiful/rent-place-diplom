const prisma = require('../utils/prisma')

const getFavorites = async (req, res) => {
  try {
    const favorites = await prisma.favorites.findMany({
      where: { user_id: req.user.id },
      include: {
        rental_objects: {
          include: { business_centers: true },
        },
      },
      orderBy: { id: 'desc' },
    })
    res.json({ favorites })
  } catch (error) {
    console.error('GetFavorites error:', error)
    res.status(500).json({ error: 'Ошибка при получении избранного' })
  }
}

const toggleFavorite = async (req, res) => {
  try {
    const { propertyId } = req.params
    const userId = req.user.id
    const existing = await prisma.favorites.findFirst({
      where: { user_id: userId, rental_object_id: parseInt(propertyId) },
    })
    if (existing) {
      await prisma.favorites.delete({ where: { id: existing.id } })
      return res.json({ favorite: false })
    } else {
      await prisma.favorites.create({
        data: { user_id: userId, rental_object_id: parseInt(propertyId) },
      })
      return res.json({ favorite: true })
    }
  } catch (error) {
    console.error('ToggleFavorite error:', error)
    res.status(500).json({ error: 'Ошибка при изменении избранного' })
  }
}

module.exports = { getFavorites, toggleFavorite }
