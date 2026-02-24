const prisma = require('../utils/prisma');

const getPropertiesReport = async (req, res) => {
  try {
    const total = await prisma.rental_objects.count();
    const byStatus = await prisma.rental_objects.groupBy({
      by: ['status'],
      _count: true,
    });
    const avgPrice = await prisma.rental_objects.aggregate({
      _avg: { price_per_month: true },
      _sum: { area: true },
    });

    res.json({
      report: {
        total,
        byStatus,
        avgPricePerMonth: avgPrice._avg.price_per_month,
        totalArea: avgPrice._sum.area,
      },
    });
  } catch (error) {
    console.error('PropertiesReport error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при формировании отчёта по помещениям' });
  }
};

const getContractsReport = async (req, res) => {
  try {
    const total = await prisma.contracts.count();
    const byStatus = await prisma.contracts.groupBy({
      by: ['status'],
      _count: true,
    });
    const activeCount = await prisma.contracts.count({
      where: { status: 'active' },
    });
    const expiringSoon = await prisma.contracts.count({
      where: {
        status: 'active',
        end_date: {
          lte: new Date(new Date().setDate(new Date().getDate() + 30)),
        },
      },
    });

    res.json({
      report: {
        total,
        byStatus,
        activeContracts: activeCount,
        expiringIn30Days: expiringSoon,
      },
    });
  } catch (error) {
    console.error('ContractsReport error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при формировании отчёта по договорам' });
  }
};

const getTicketsReport = async (req, res) => {
  try {
    const total = await prisma.service_tickets.count();
    const byStatus = await prisma.service_tickets.groupBy({
      by: ['status'],
      _count: true,
    });
    const byPriority = await prisma.service_tickets.groupBy({
      by: ['priority'],
      _count: true,
    });

    const avgResolutionTime = await prisma.$queryRaw`
      SELECT AVG(EXTRACT(EPOCH FROM (completion_date - created_at)) / 3600) as avg_hours
      FROM service_tickets
      WHERE status = 'completed' AND completion_date IS NOT NULL AND created_at IS NOT NULL
    `;

    const avgHours = avgResolutionTime[0]?.avg_hours
      ? parseFloat(Number(avgResolutionTime[0].avg_hours).toFixed(2))
      : null;

    res.json({
      report: {
        total,
        byStatus,
        byPriority,
        avgResolutionTimeHours: avgHours,
      },
    });
  } catch (error) {
    console.error('TicketsReport error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при формировании отчёта по заявкам' });
  }
};

const getFinancialReport = async (req, res) => {
  try {
    const activeContracts = await prisma.contracts.findMany({
      where: { status: 'active' },
      select: { monthly_rent: true },
    });
    const totalMonthlyIncome = activeContracts.reduce(
      (sum, c) => sum + Number(c.monthly_rent),
      0,
    );

    const contractsByMonth = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', start_date) as month,
        COUNT(*) as count,
        SUM(monthly_rent) as total_rent
      FROM contracts
      WHERE status = 'active'
      GROUP BY DATE_TRUNC('month', start_date)
      ORDER BY month DESC
    `;

    res.json({
      report: {
        totalMonthlyIncome,
        monthlyBreakdown: contractsByMonth,
      },
    });
  } catch (error) {
    console.error('FinancialReport error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при формировании финансового отчёта' });
  }
};

const getOccupancyReport = async (req, res) => {
  try {
    const centers = await prisma.business_centers.findMany({
      include: {
        rental_objects: {
          select: { status: true },
        },
      },
    });

    const report = centers.map((center) => {
      const total = center.rental_objects.length;
      const occupied = center.rental_objects.filter(
        (obj) => obj.status === 'occupied',
      ).length;
      const available = center.rental_objects.filter(
        (obj) => obj.status === 'available',
      ).length;
      const occupancyRate = total ? ((occupied / total) * 100).toFixed(2) : 0;
      return {
        centerId: center.id,
        centerName: center.name,
        totalRooms: total,
        occupied,
        available,
        occupancyRate: `${occupancyRate}%`,
      };
    });

    res.json({ report });
  } catch (error) {
    console.error('OccupancyReport error:', error);
    res
      .status(500)
      .json({ error: 'Ошибка при формировании отчёта по заполняемости' });
  }
};

module.exports = {
  getPropertiesReport,
  getContractsReport,
  getTicketsReport,
  getFinancialReport,
  getOccupancyReport,
};
