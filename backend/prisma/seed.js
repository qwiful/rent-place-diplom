const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Начало заполнения базы данных...')

  const adminRole = await prisma.roles.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Администратор системы' },
  })

  const managerRole = await prisma.roles.upsert({
    where: { name: 'manager' },
    update: {},
    create: { name: 'manager', description: 'Менеджер по аренде' },
  })

  const tenantRole = await prisma.roles.upsert({
    where: { name: 'tenant' },
    update: {},
    create: { name: 'tenant', description: 'Арендатор' },
  })

  console.log(
    'Роли созданы:',
    adminRole.name,
    managerRole.name,
    tenantRole.name,
  )

  const landlordOrg = await prisma.organizations.upsert({
    where: { inn: '7701234567' },
    update: {},
    create: {
      full_name: 'ООО "РентПлейс Менеджмент"',
      short_name: 'РентПлейс',
      inn: '7701234567',
      kpp: '770101001',
      ogrn: '1027700123456',
      legal_address: 'г. Ярославль, ул. Свободы, д. 1',
      actual_address: 'г. Ярославль, ул. Свободы, д. 1, офис 100',
      phone: '+7 (495) 123-45-67',
      email: 'info@rentplace.ru',
    },
  })

  console.log('Организация-арендодатель создана:', landlordOrg.short_name)

  const tenantOrg = await prisma.organizations.upsert({
    where: { inn: '7709876543' },
    update: {},
    create: {
      full_name: 'ООО "ТехСтарт"',
      short_name: 'ТехСтарт',
      inn: '7709876543',
      kpp: '770901001',
      ogrn: '1027700654321',
      legal_address: 'г. Ярославль, ул. Победы, д. 5',
      actual_address: 'г. Ярославль, ул. Победы, д. 5',
      phone: '+7 (495) 987-65-43',
      email: 'info@techstart.ru',
    },
  })

  console.log('Организация-арендатор создана:', tenantOrg.short_name)

  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@rentplace.ru' },
    update: {},
    create: {
      email: 'admin@rentplace.ru',
      password_hash: adminPasswordHash,
      phone: '+79001000001',
      role_id: adminRole.id,
      organization_id: landlordOrg.id,
      is_active: true,
    },
  })

  await prisma.user_profiles.upsert({
    where: { user_id: adminUser.id },
    update: {},
    create: {
      user_id: adminUser.id,
      first_name: 'Администратор',
      last_name: 'Системный',
      middle_name: 'Главный',
      gender: 'male',
    },
  })

  console.log('Администратор создан: admin@rentplace.ru / admin123')

  const managerPasswordHash = await bcrypt.hash('manager123', 10)
  const managerUser = await prisma.users.upsert({
    where: { email: 'manager@rentplace.ru' },
    update: {},
    create: {
      email: 'manager@rentplace.ru',
      password_hash: managerPasswordHash,
      phone: '+79001000002',
      role_id: managerRole.id,
      organization_id: landlordOrg.id,
      is_active: true,
    },
  })

  await prisma.user_profiles.upsert({
    where: { user_id: managerUser.id },
    update: {},
    create: {
      user_id: managerUser.id,
      first_name: 'Иван',
      last_name: 'Петров',
      middle_name: 'Сергеевич',
      gender: 'male',
    },
  })

  console.log('Менеджер создан: manager@rentplace.ru / manager123')

  const tenantPasswordHash = await bcrypt.hash('tenant123', 10)
  const tenantUser = await prisma.users.upsert({
    where: { email: 'tenant@techstart.ru' },
    update: {},
    create: {
      email: 'tenant@techstart.ru',
      password_hash: tenantPasswordHash,
      phone: '+79001000003',
      role_id: tenantRole.id,
      organization_id: tenantOrg.id,
      is_active: true,
    },
  })

  await prisma.user_profiles.upsert({
    where: { user_id: tenantUser.id },
    update: {},
    create: {
      user_id: tenantUser.id,
      first_name: 'Мария',
      last_name: 'Сидорова',
      middle_name: 'Александровна',
      gender: 'female',
    },
  })

  console.log('Арендатор создан: tenant@techstart.ru / tenant123')

  const bc1 = await prisma.business_centers.create({
    data: {
      organization_id: landlordOrg.id,
      name: 'БЦ "Альфа Плаза"',
      address: 'г. Ярославль, ул. Советская, д. 10',
    },
  })

  const bc2 = await prisma.business_centers.create({
    data: {
      organization_id: landlordOrg.id,
      name: 'БЦ "Бета Тауэр"',
      address: 'г. Ярославль, пр-т Октября, д. 45',
    },
  })

  console.log('Бизнес-центры созданы:', bc1.name, ',', bc2.name)

  const properties = await Promise.all([
    prisma.rental_objects.create({
      data: {
        business_center_id: bc1.id,
        manager_id: managerUser.id,
        title: 'Офис 101',
        area: 45.5,
        price_per_month: 75000,
        status: 'available',
        photos: ['/uploads/office1.jpeg'],
      },
    }),
    prisma.rental_objects.create({
      data: {
        business_center_id: bc1.id,
        manager_id: managerUser.id,
        title: 'Офис 102',
        area: 30.0,
        price_per_month: 50000,
        status: 'available',
        photos: ['/uploads/office2.jpeg'],
      },
    }),
    prisma.rental_objects.create({
      data: {
        business_center_id: bc1.id,
        manager_id: managerUser.id,
        title: 'Офис 201 (Open Space)',
        area: 120.0,
        price_per_month: 180000,
        status: 'available',
        photos: ['/uploads/office3.jpeg'],
      },
    }),
    prisma.rental_objects.create({
      data: {
        business_center_id: bc2.id,
        manager_id: managerUser.id,
        title: 'Офис A1',
        area: 55.0,
        price_per_month: 90000,
        status: 'occupied',
        photos: ['/uploads/office4.jpg'],
      },
    }),
    prisma.rental_objects.create({
      data: {
        business_center_id: bc2.id,
        manager_id: managerUser.id,
        title: 'Офис A2',
        area: 40.0,
        price_per_month: 65000,
        status: 'reserved',
        photos: ['/uploads/office5.jpg'],
      },
    }),
  ])

  console.log(`Помещений создано: ${properties.length}`)

  const contract = await prisma.contracts.create({
    data: {
      contract_number: 'CNT-' + Date.now(),
      rental_object_id: properties[3].id,
      tenant_user_id: tenantUser.id,
      landlord_organization_id: landlordOrg.id,
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-12-31'),
      monthly_rent: 90000,
      deposit: 180000,
      payment_day: 5,
      status: 'active',
    },
  })

  await prisma.contract_status_history.create({
    data: {
      contract_id: contract.id,
      old_status: null,
      new_status: 'active',
      changed_by_user_id: adminUser.id,
      change_reason: 'Договор подписан',
    },
  })

  console.log('Тестовый договор создан:', contract.contract_number)

  const ticket = await prisma.service_tickets.create({
    data: {
      creator_id: tenantUser.id,
      contract_id: contract.id,
      assigned_manager_id: managerUser.id,
      title: 'Не работает кондиционер',
      description:
        'В офисе A1 не включается кондиционер, температура выше 28°C',
      type: 'repair',
      priority: 'high',
      status: 'in_progress',
    },
  })

  await prisma.ticket_status_history.create({
    data: {
      ticket_id: ticket.id,
      old_status: null,
      new_status: 'new',
      changed_by_user_id: tenantUser.id,
      change_reason: 'Заявка создана',
    },
  })

  await prisma.ticket_status_history.create({
    data: {
      ticket_id: ticket.id,
      old_status: 'new',
      new_status: 'in_progress',
      changed_by_user_id: managerUser.id,
      change_reason: 'Взята в работу',
    },
  })

  console.log('Тестовая заявка создана:', ticket.title)

  await prisma.interactions.create({
    data: {
      contract_id: contract.id,
      type: 'phone',
      content: 'Звонок арендатору: подтверждение условий договора на 2026 год',
      created_by: managerUser.id,
    },
  })

  await prisma.viewing_requests.create({
    data: {
      rental_object_id: 1,
      user_id: 3,
      preferred_date: new Date(),
      preferred_time: '14:00',
      status: 'pending',
      user_notes: 'Хотел бы посмотреть офис в первой половине дня',
    },
  })

  console.log('Тестовое взаимодействие создано')

  console.log('\n База данных успешно заполнена!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Учётные записи для входа:')
  console.log('  Admin:   admin@rentplace.ru   / admin123')
  console.log('  Manager: manager@rentplace.ru / manager123')
  console.log('  Tenant:  tenant@techstart.ru  / tenant123')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Ошибка при заполнении:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
