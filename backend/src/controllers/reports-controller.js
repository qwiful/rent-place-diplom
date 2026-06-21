const prisma = require('../utils/prisma')

const getOccupancyReport = async (req, res) => {
  try {
    let where = {}
    if (req.user.roles.name === 'manager') {
      const managedProperties = await prisma.rental_objects.findMany({
        where: { manager_id: req.user.id },
        select: { id: true },
      })
      const propertyIds = managedProperties.map((p) => p.id)
      if (propertyIds.length === 0) {
        return res.json({
          total: 0,
          available: 0,
          occupied: 0,
          reserved: 0,
          under_renovation: 0,
          byBusinessCenter: [],
        })
      }
      where.id = { in: propertyIds }
    }

    const properties = await prisma.rental_objects.findMany({
      where,
      include: { business_centers: true },
    })

    const total = properties.length
    const available = properties.filter((p) => p.status === 'available').length
    const occupied = properties.filter((p) => p.status === 'occupied').length
    const reserved = properties.filter((p) => p.status === 'reserved').length
    const under_renovation = properties.filter(
      (p) => p.status === 'under_renovation',
    ).length

    const bcMap = new Map()
    properties.forEach((p) => {
      const bcName = p.business_centers?.name || 'Без БЦ'
      if (!bcMap.has(bcName)) {
        bcMap.set(bcName, { available: 0, occupied: 0, reserved: 0, total: 0 })
      }
      const stats = bcMap.get(bcName)
      stats.total++
      if (p.status === 'available') stats.available++
      if (p.status === 'occupied') stats.occupied++
      if (p.status === 'reserved') stats.reserved++
    })
    const byBusinessCenter = Array.from(bcMap, ([name, stats]) => ({
      name,
      ...stats,
    }))

    res.json({
      total,
      available,
      occupied,
      reserved,
      under_renovation,
      byBusinessCenter,
    })
  } catch (error) {
    console.error('GetOccupancyReport error:', error)
    res.status(500).json({ error: 'Ошибка получения отчёта по заполняемости' })
  }
}

const getTicketsReport = async (req, res) => {
  try {
    let where = {}
    if (req.user.roles.name === 'manager') {
      const managedContracts = await prisma.contracts.findMany({
        where: {
          rental_objects: { manager_id: req.user.id },
        },
        select: { id: true },
      })
      const contractIds = managedContracts.map((c) => c.id)
      where.contract_id = { in: contractIds }
    } else if (req.user.roles.name !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' })
    }

    const tickets = await prisma.service_tickets.findMany({
      where,
      select: { status: true, priority: true },
    })

    const byStatus = {
      new: 0,
      in_progress: 0,
      on_hold: 0,
      completed: 0,
      cancelled: 0,
    }
    const byPriority = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }
    tickets.forEach((t) => {
      if (t.status) byStatus[t.status]++
      if (t.priority) byPriority[t.priority]++
    })

    res.json({ byStatus, byPriority, total: tickets.length })
  } catch (error) {
    console.error('GetTicketsReport error:', error)
    res.status(500).json({ error: 'Ошибка получения отчёта по заявкам' })
  }
}

module.exports = {
  getOccupancyReport,
  getTicketsReport,
}
