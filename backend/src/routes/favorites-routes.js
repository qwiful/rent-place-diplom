const express = require('express')
const router = express.Router()
const { authenticate } = require('../middleware/auth-middleware')
const {
  getFavorites,
  toggleFavorite,
} = require('../controllers/favorites-controller')

router.use(authenticate)
router.get('/', getFavorites)
router.post('/:propertyId/toggle', toggleFavorite)

module.exports = router
