<script setup>
import { ref, onMounted, computed } from 'vue'
import api from '@/api'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useContractsStore } from '@/stores/contracts'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isAuthenticated)
const contractsStore = useContractsStore()

const activeTab = ref('profile')
const isEditing = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

const occupancy = ref({
  total: 0,
  available: 0,
  occupied: 0,
  reserved: 0,
  under_renovation: 0,
  byBusinessCenter: [],
})
const ticketsReport = ref({ total: 0, byStatus: {}, byPriority: {} })
const reportLoading = ref(false)
const showContractModal = ref(false)
const selectedContract = ref(null)

function viewContractDetails(contract) {
  selectedContract.value = contract
  showContractModal.value = true
}

const editForm = ref({
  first_name: '',
  last_name: '',
  middle_name: '',
  phone: '',
  email: '',
})

const fetchOccupancyReport = async () => {
  reportLoading.value = true
  try {
    const { data } = await api.get('/reports/occupancy')
    occupancy.value = data
  } catch (err) {
    console.error(err)
  } finally {
    reportLoading.value = false
  }
}

const fetchTicketsReport = async () => {
  reportLoading.value = true
  try {
    const { data } = await api.get('/reports/tickets')
    ticketsReport.value = data
  } catch (err) {
    console.error(err)
  } finally {
    reportLoading.value = false
  }
}

const passwordForm = ref({
  current: '',
  newPass: '',
  confirm: '',
})

const avatarColors = ['#DAC090', '#2D8680', '#D18875']
const avatarColor = ref('#DAC090')

const switchTab = async (tab) => {
  activeTab.value = tab
  if (tab === 'contracts') await contractsStore.fetchContracts()
  if (tab === 'tickets') await ticketsStore.fetchTickets()
  if (tab === 'favorites') await fetchFavorites()
  if (tab === 'reports') {
    await fetchOccupancyReport()
    await fetchTicketsReport()
  }
}

function startEditing() {
  editForm.value = {
    first_name: auth.profile?.first_name || '',
    last_name: auth.profile?.last_name || '',
    middle_name: auth.profile?.middle_name || '',
    phone: auth.user?.phone || '',
    email: auth.user?.email || '',
  }
  isEditing.value = true
}

async function saveProfile() {
  errorMsg.value = ''
  try {
    await auth.updateProfile(editForm.value)
    isEditing.value = false
    showSuccess('Данные сохранены')
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Ошибка при сохранении'
  }
}

function cancelEditing() {
  isEditing.value = false
  errorMsg.value = ''
}

async function changePassword() {
  errorMsg.value = ''
  if (!passwordForm.value.current) {
    errorMsg.value = 'Введите текущий пароль'
    return
  }
  if (passwordForm.value.newPass !== passwordForm.value.confirm) {
    errorMsg.value = 'Новый пароль и подтверждение не совпадают'
    return
  }
  if (passwordForm.value.newPass.length < 6) {
    errorMsg.value = 'Пароль слишком короткий (минимум 6 символов)'
    return
  }
  try {
    await api.post('/users/change-password', {
      currentPassword: passwordForm.value.current,
      newPassword: passwordForm.value.newPass,
    })
    showSuccess('Пароль успешно изменён')
    passwordForm.value = { current: '', newPass: '', confirm: '' }
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Ошибка при смене пароля'
  }
}

function getTicketTypeLabel(type) {
  const map = {
    cleaning: 'Уборка',
    repair: 'Ремонт',
    technical: 'Техобслуживание',
    other: 'Другое',
  }
  return map[type] || type
}

function setAvatarColor(color) {
  avatarColor.value = color
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

function showSuccess(msg) {
  successMsg.value = msg
  setTimeout(() => {
    successMsg.value = ''
  }, 3000)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ru-RU')
}

function getStatusLabel(status) {
  const map = {
    draft: 'Черновик',
    pending: 'На рассмотрении',
    active: 'Активен',
    terminated: 'Расторгнут',
    completed: 'Завершён',
  }
  return map[status] || status
}

function getStatusClass(status) {
  const map = {
    draft: 'status-draft',
    pending: 'status-pending',
    active: 'status-active',
    terminated: 'status-terminated',
    completed: 'status-completed',
  }
  return map[status] || ''
}

function downloadContract(contract) {
  if (contract.contract_file_url) {
    window.open(contract.contract_file_url, '_blank')
  } else {
    alert('Файл договора не загружен')
  }
}

onMounted(async () => {
  if (route.query.tab === 'tickets') {
    activeTab.value = 'tickets'
  }
  if (!auth.isAuthenticated) {
    await auth.init()
  }
  await contractsStore.fetchContracts()
  await ticketsStore.fetchTickets()
})

import { useTicketsStore } from '@/stores/tickets'

const ticketsStore = useTicketsStore()

const newTicket = ref({
  contract_id: '',
  title: '',
  description: '',
  type: 'other',
  priority: 'medium',
})

const showCreateTicketModal = ref(false)
const showTicketDetailModal = ref(false)
const selectedTicket = ref(null)

const userContracts = ref([])

const loadUserContracts = async () => {
  if (contractsStore.contracts.length) {
    userContracts.value = contractsStore.contracts
  } else {
    await contractsStore.fetchContracts()
    userContracts.value = contractsStore.contracts
  }
}

function openCreateTicketModal() {
  loadUserContracts()
  newTicket.value = {
    contract_id: '',
    title: '',
    description: '',
    type: 'other',
    priority: 'medium',
  }
  showCreateTicketModal.value = true
}

async function submitTicket() {
  if (!newTicket.value.contract_id || !newTicket.value.title) {
    alert('Заполните обязательные поля')
    return
  }
  try {
    await ticketsStore.createTicket(newTicket.value)
    showCreateTicketModal.value = false
    showSuccess('Заявка создана')
  } catch (err) {
    alert(err.response?.data?.error || 'Ошибка при создании заявки')
  }
}

function viewTicketDetails(ticket) {
  selectedTicket.value = ticket
  showTicketDetailModal.value = true
}

function getTicketStatusLabel(status) {
  const map = {
    new: 'Новая',
    in_progress: 'В работе',
    on_hold: 'Приостановлена',
    completed: 'Выполнена',
    cancelled: 'Отменена',
  }
  return map[status] || status
}
function getTicketPriorityLabel(priority) {
  const map = {
    low: 'Низкий',
    medium: 'Средний',
    high: 'Высокий',
    critical: 'Критический',
  }
  return map[priority] || priority
}
function getTicketStatusClass(status) {
  const map = {
    new: 'status-new',
    in_progress: 'status-progress',
    on_hold: 'status-hold',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
  }
  return map[status] || ''
}

const favorites = ref([])
const favLoading = ref(false)

const fetchFavorites = async () => {
  favLoading.value = true
  try {
    const { data } = await api.get('/favorites')
    favorites.value = data.favorites
  } catch (err) {
    console.error('Ошибка загрузки избранного', err)
  } finally {
    favLoading.value = false
  }
}

const removeFavorite = async (propertyId) => {
  try {
    await api.post(`/favorites/${propertyId}/toggle`)
    await fetchFavorites()
  } catch (err) {
    console.error('Ошибка удаления из избранного', err)
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

const viewProperty = (id) => router.push(`/properties/${id}`)

const showCreateContractModal = ref(false)
const createContractForm = ref({
  rental_object_id: '',
  tenant_type: 'individual',
  tenant_user_id: '',
  tenant_organization_id: '',
  start_date: '',
  end_date: '',
  monthly_rent: '',
  deposit: '',
  payment_day: '',
})

const availableProperties = ref([])
const tenantsList = ref([])

const fetchManagerProperties = async () => {
  try {
    const { data } = await api.get('/properties/by-manager/' + auth.user.id)
    availableProperties.value = data.properties || []
  } catch (err) {
    console.error('Ошибка загрузки помещений менеджера', err)
  }
}

const fetchTenants = async () => {
  try {
    const { data } = await api.get('/users')
    tenantsList.value =
      data.users.filter((user) => user.roles?.name === 'tenant') || []
    console.log('Загружено арендаторов:', tenantsList.value.length)
  } catch (err) {
    console.error('Ошибка загрузки арендаторов', err)
    tenantsList.value = []
  }
}

const openCreateContractModal = () => {
  createContractForm.value = {
    rental_object_id: '',
    tenant_type: 'individual',
    tenant_user_id: '',
    tenant_organization_id: '',
    start_date: '',
    end_date: '',
    monthly_rent: '',
    deposit: '',
    payment_day: '',
  }
  fetchManagerProperties()
  fetchTenants()
  showCreateContractModal.value = true
}

const submitCreateContract = async () => {
  console.log('Отправка данных:', createContractForm.value)

  if (
    !createContractForm.value.rental_object_id ||
    !createContractForm.value.start_date ||
    !createContractForm.value.end_date ||
    !createContractForm.value.monthly_rent
  ) {
    alert('Заполните обязательные поля')
    return
  }

  const payload = {
    rental_object_id: parseInt(createContractForm.value.rental_object_id),
    start_date: createContractForm.value.start_date,
    end_date: createContractForm.value.end_date,
    monthly_rent: parseFloat(createContractForm.value.monthly_rent),
    deposit: parseFloat(createContractForm.value.deposit) || 0,
    payment_day: createContractForm.value.payment_day
      ? parseInt(createContractForm.value.payment_day)
      : null,
    status: 'draft',
    landlord_organization_id: auth.user?.organization_id,
  }
  console.log('Выбран ID помещения:', createContractForm.value.rental_object_id)

  if (createContractForm.value.tenant_type === 'individual') {
    payload.tenant_user_id = parseInt(createContractForm.value.tenant_user_id)
  } else {
    payload.tenant_organization_id = parseInt(
      createContractForm.value.tenant_organization_id,
    )
  }

  try {
    const response = await api.post('/contracts', payload)
    console.log('Ответ сервера:', response)
    showCreateContractModal.value = false
    showSuccess('Договор создан')
    await contractsStore.fetchContracts()
  } catch (err) {
    console.error('Ошибка создания договора:', err.response?.data)
    alert(err.response?.data?.error || 'Ошибка создания договора')
  }
}

const activateContract = async (id) => {
  try {
    await api.patch(`/contracts/${id}/status`, {
      status: 'active',
      reason: 'Активация менеджером',
    })
    await contractsStore.fetchContracts()
    showSuccess('Договор активирован')
  } catch (err) {
    alert('Ошибка активации')
  }
}

const terminateContract = async (id) => {
  if (
    confirm(
      'Вы уверены, что хотите расторгнуть договор? Помещение снова станет доступным.',
    )
  ) {
    try {
      await api.patch(`/contracts/${id}/status`, {
        status: 'terminated',
        reason: 'Расторжение по соглашению сторон',
      })
      await contractsStore.fetchContracts()
      showSuccess('Договор расторгнут')
    } catch (err) {
      alert('Ошибка расторжения: ' + (err.response?.data?.error || err.message))
    }
  }
}
</script>

<template>
  <div class="profile-page">
    <Transition name="fade">
      <div v-if="successMsg" class="toast toast-success">{{ successMsg }}</div>
    </Transition>

    <header class="header">
      <div class="container">
        <div class="header-content">
          <router-link to="/" class="logo">
            <span>Аренда+</span>
          </router-link>
          <nav class="nav">
            <template v-if="isLoggedIn && auth.userRole === 'admin'">
              <router-link to="/admin" class="nav-link"
                >Админ-панель</router-link
              >
            </template>
            <template
              v-if="
                isLoggedIn &&
                (auth.userRole === 'manager' || auth.userRole === 'admin')
              "
            >
              <router-link to="/dashboard/rental-objects" class="nav-link"
                >Управление объектами</router-link
              >
            </template>
            <template
              v-if="
                isLoggedIn &&
                (auth.userRole === 'manager' || auth.userRole === 'admin')
              "
            >
              <router-link to="/dashboard/viewing-requests" class="nav-link"
                >Заявки на просмотр</router-link
              >
            </template>
            <button
              class="btn btn-primary btn-sm logout-btn"
              @click="handleLogout"
            >
              Выйти
            </button>
          </nav>
        </div>
      </div>
    </header>

    <main class="profile-main">
      <div class="container">
        <div class="profile-grid">
          <aside class="profile-sidebar">
            <ul class="sidebar-menu">
              <li
                :class="{ active: activeTab === 'profile' }"
                @click="switchTab('profile')"
              >
                <span>Профиль</span>
              </li>
              <li
                :class="{ active: activeTab === 'contracts' }"
                @click="switchTab('contracts')"
              >
                <span>Мои договоры</span>
              </li>
              <li
                :class="{ active: activeTab === 'tickets' }"
                @click="switchTab('tickets')"
              >
                <span>Сервисные заявки</span>
              </li>
              <li
                v-if="auth.userRole === 'manager' || auth.userRole === 'admin'"
                :class="{ active: activeTab === 'reports' }"
                @click="switchTab('reports')"
              >
                <span>Отчёты</span>
              </li>
              <li
                :class="{ active: activeTab === 'favorites' }"
                @click="switchTab('favorites')"
              >
                <span>Избранное</span>
              </li>
            </ul>
          </aside>

          <div class="profile-content">
            <div v-show="activeTab === 'profile'">
              <div class="card">
                <div class="card-header">
                  <h2>Личные данные</h2>
                  <button
                    v-if="!isEditing"
                    class="edit-btn"
                    @click="startEditing"
                  >
                    Редактировать
                  </button>
                  <div v-else class="edit-actions">
                    <button
                      class="btn btn-sm btn-outline"
                      @click="cancelEditing"
                    >
                      Отмена
                    </button>
                    <button class="btn btn-sm btn-primary" @click="saveProfile">
                      Сохранить
                    </button>
                  </div>
                </div>

                <div v-if="errorMsg" class="error-message">{{ errorMsg }}</div>

                <div class="avatar-section">
                  <div
                    class="avatar-preview"
                    :style="{ background: avatarColor }"
                  >
                    {{ auth.initials }}
                  </div>
                  <div class="avatar-actions">
                    <button
                      v-for="c in avatarColors"
                      :key="c"
                      class="avatar-color-btn"
                      :style="{ background: c }"
                      :class="{ active: avatarColor === c }"
                      @click="setAvatarColor(c)"
                    ></button>
                  </div>
                </div>

                <div v-if="!isEditing" class="profile-info">
                  <div class="info-row">
                    <div class="info-item">
                      <label>Фамилия</label>
                      <p>{{ auth.profile?.last_name || '—' }}</p>
                    </div>
                    <div class="info-item">
                      <label>Имя</label>
                      <p>{{ auth.profile?.first_name || '—' }}</p>
                    </div>
                    <div class="info-item">
                      <label>Отчество</label>
                      <p>{{ auth.profile?.middle_name || '—' }}</p>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <label>Телефон</label>
                      <p>{{ auth.user?.phone || '—' }}</p>
                    </div>
                    <div class="info-item">
                      <label>Email</label>
                      <p>{{ auth.user?.email || '—' }}</p>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <label>Роль</label>
                      <span class="badge badge-success">{{
                        auth.userRole || '—'
                      }}</span>
                    </div>
                  </div>
                </div>

                <div v-else class="profile-edit">
                  <div class="form-row-3">
                    <div class="form-group">
                      <label for="edit-lastname">Фамилия</label>
                      <div class="input-wrapper">
                        <input
                          id="edit-lastname"
                          v-model="editForm.last_name"
                          type="text"
                          class="input-no-icon"
                        />
                      </div>
                    </div>
                    <div class="form-group">
                      <label for="edit-firstname">Имя</label>
                      <div class="input-wrapper">
                        <input
                          id="edit-firstname"
                          v-model="editForm.first_name"
                          type="text"
                          class="input-no-icon"
                        />
                      </div>
                    </div>
                    <div class="form-group">
                      <label for="edit-middlename">Отчество</label>
                      <div class="input-wrapper">
                        <input
                          id="edit-middlename"
                          v-model="editForm.middle_name"
                          type="text"
                          class="input-no-icon"
                        />
                      </div>
                    </div>
                  </div>
                  <div class="form-row-2">
                    <div class="form-group">
                      <label for="edit-phone">Телефон</label>
                      <div class="input-wrapper">
                        <input
                          id="edit-phone"
                          v-model="editForm.phone"
                          type="tel"
                          class="input-no-icon"
                        />
                      </div>
                    </div>
                    <div class="form-group">
                      <label for="edit-email">Email</label>
                      <div class="input-wrapper">
                        <input
                          id="edit-email"
                          v-model="editForm.email"
                          type="email"
                          class="input-no-icon"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="card">
                <div class="card-header">
                  <h2>Смена пароля</h2>
                </div>
                <div class="form-row-1">
                  <div class="form-group">
                    <label for="current-pass">Текущий пароль</label>
                    <div class="input-wrapper">
                      <input
                        id="current-pass"
                        v-model="passwordForm.current"
                        type="password"
                        class="input-no-icon"
                        placeholder="••••••"
                      />
                    </div>
                  </div>
                </div>
                <div class="form-row-2">
                  <div class="form-group">
                    <label for="new-pass">Новый пароль</label>
                    <div class="input-wrapper">
                      <input
                        id="new-pass"
                        v-model="passwordForm.newPass"
                        type="password"
                        class="input-no-icon"
                        placeholder="••••••"
                      />
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="confirm-pass">Подтверждение</label>
                    <div class="input-wrapper">
                      <input
                        id="confirm-pass"
                        v-model="passwordForm.confirm"
                        type="password"
                        class="input-no-icon"
                        placeholder="••••••"
                      />
                    </div>
                  </div>
                </div>
                <button class="btn btn-primary" @click="changePassword">
                  Сменить пароль
                </button>
              </div>
            </div>

            <div v-show="activeTab === 'contracts'">
              <div class="card">
                <div class="card-header">
                  <h2>Мои договоры</h2>
                  <button
                    v-if="
                      auth.userRole === 'manager' || auth.userRole === 'admin'
                    "
                    class="btn btn-primary btn-sm"
                    @click="openCreateContractModal"
                  >
                    + Новый договор
                  </button>
                </div>
                <div v-if="contractsStore.loading" class="loading-state">
                  <div class="spinner-sm"></div>
                  <p>Загрузка договоров...</p>
                </div>
                <div v-else-if="contractsStore.error" class="error-state">
                  <span class="error-icon">⚠️</span>
                  <p>{{ contractsStore.error }}</p>
                  <button
                    class="btn btn-sm btn-outline"
                    @click="contractsStore.fetchContracts()"
                  >
                    Повторить
                  </button>
                </div>
                <div
                  v-else-if="contractsStore.contracts.length === 0"
                  class="empty-state"
                >
                  <p>У вас пока нет договоров</p>
                  <small>Когда договор будет заключён, он появится здесь</small>
                </div>
                <div v-else class="items-list">
                  <div
                    v-for="contract in contractsStore.contracts"
                    :key="contract.id"
                    class="list-item"
                  >
                    <div class="list-item-header">
                      <strong>{{ contract.contract_number }}</strong>
                      <span
                        :class="[
                          'status-badge',
                          getStatusClass(contract.status),
                        ]"
                      >
                        {{ getStatusLabel(contract.status) }}
                      </span>
                    </div>
                    <div class="list-item-details">
                      <div>
                        {{
                          contract.rental_objects?.business_centers?.name || '—'
                        }}
                      </div>
                      <div>{{ contract.rental_objects?.title || '—' }}</div>
                      <div>
                        {{ formatDate(contract.start_date) }} –
                        {{ formatDate(contract.end_date) }}
                      </div>
                      <div>
                        {{ formatPrice(contract.monthly_rent) }} ₽ / мес
                      </div>
                      <div v-if="contract.deposit && contract.deposit > 0">
                        Депозит: {{ formatPrice(contract.deposit) }} ₽
                      </div>
                      <div v-if="contract.payment_day">
                        День платежа: {{ contract.payment_day }}-е число
                      </div>
                    </div>
                    <div class="list-item-actions">
                      <button
                        v-if="contract.contract_file_url"
                        class="btn-outline-sm"
                        @click="downloadContract(contract)"
                      >
                        Скачать договор
                      </button>
                      <button
                        class="btn-outline-sm"
                        @click="viewContractDetails(contract)"
                      >
                        Подробнее
                      </button>
                      <button
                        v-if="
                          contract.status === 'draft' &&
                          (auth.userRole === 'manager' ||
                            auth.userRole === 'admin')
                        "
                        class="btn-outline-sm btn-activate"
                        @click="activateContract(contract.id)"
                      >
                        Активировать
                      </button>
                      <button
                        v-if="
                          contract.status === 'active' &&
                          (auth.userRole === 'manager' ||
                            auth.userRole === 'admin')
                        "
                        class="btn-outline-sm btn-terminate"
                        @click="terminateContract(contract.id)"
                      >
                        Расторгнуть
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-show="activeTab === 'tickets'">
              <div class="card">
                <div class="card-header">
                  <h2>Мои заявки на обслуживание</h2>
                  <button
                    v-if="auth.userRole === 'tenant'"
                    class="btn btn-sm btn-primary"
                    @click="openCreateTicketModal"
                  >
                    + Новая заявка
                  </button>
                </div>

                <div v-if="ticketsStore.loading" class="loading-state">
                  <div class="spinner-sm"></div>
                  <p>Загрузка заявок...</p>
                </div>
                <div v-else-if="ticketsStore.error" class="error-state">
                  <span class="error-icon">⚠️</span>
                  <p>{{ ticketsStore.error }}</p>
                  <button
                    class="btn btn-sm btn-outline"
                    @click="ticketsStore.fetchTickets"
                  >
                    Повторить
                  </button>
                </div>
                <div
                  v-else-if="ticketsStore.tickets.length === 0"
                  class="empty-state"
                >
                  <p>У вас пока нет заявок</p>
                  <small
                    >Нажмите «Новая заявка», чтобы сообщить о проблеме</small
                  >
                </div>
                <div v-else class="items-list">
                  <div
                    v-for="ticket in ticketsStore.tickets"
                    :key="ticket.id"
                    class="list-item"
                  >
                    <div class="list-item-header">
                      <strong>{{ ticket.title }}</strong>
                      <div
                        v-if="
                          auth.userRole === 'manager' ||
                          auth.userRole === 'admin'
                        "
                      >
                        <select
                          v-model="ticket.status"
                          @change="
                            ticketsStore.updateTicketStatus(
                              ticket.id,
                              ticket.status,
                            )
                          "
                          class="status-select"
                        >
                          <option value="new">Новая</option>
                          <option value="in_progress">В работе</option>
                          <option value="on_hold">Приостановлена</option>
                          <option value="completed">Выполнена</option>
                          <option value="cancelled">Отменена</option>
                        </select>
                      </div>
                      <span
                        v-else
                        :class="[
                          'status-badge',
                          getTicketStatusClass(ticket.status),
                        ]"
                      >
                        {{ getTicketStatusLabel(ticket.status) }}
                      </span>
                    </div>
                    <div class="list-item-details">
                      <div>Тип: {{ getTicketTypeLabel(ticket.type) }}</div>
                      <div>
                        Приоритет:
                        {{ getTicketPriorityLabel(ticket.priority) }}
                      </div>
                      <div>Создана: {{ formatDate(ticket.created_at) }}</div>
                      <div v-if="ticket.completion_date">
                        Завершена: {{ formatDate(ticket.completion_date) }}
                      </div>
                    </div>
                    <div class="list-item-actions">
                      <button
                        class="btn-outline-sm"
                        @click="viewTicketDetails(ticket)"
                      >
                        Подробнее
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-show="activeTab === 'reports'">
              <div class="card">
                <div class="card-header">
                  <h2>Аналитические отчёты</h2>
                </div>
                <div v-if="reportLoading" class="loading-state">
                  Загрузка...
                </div>
                <div v-else>
                  <div class="report-section">
                    <h3>Заполняемость помещений</h3>
                    <div class="stats-grid">
                      <div class="stat-card">
                        <span class="stat-value">{{ occupancy.total }}</span
                        ><span class="stat-label">Всего помещений</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-value" style="color: #2d8680">{{
                          occupancy.available
                        }}</span
                        ><span class="stat-label">Свободно</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-value" style="color: #c62828">{{
                          occupancy.occupied
                        }}</span
                        ><span class="stat-label">Занято</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-value" style="color: #f57f17">{{
                          occupancy.reserved
                        }}</span
                        ><span class="stat-label">Забронировано</span>
                      </div>
                    </div>
                    <div
                      v-if="occupancy.byBusinessCenter?.length"
                      class="bc-table"
                    >
                      <h4>По бизнес-центрам</h4>
                      <table class="data-table">
                        <thead>
                          <tr>
                            <th>БЦ</th>
                            <th>Свободно</th>
                            <th>Занято</th>
                            <th>Забронировано</th>
                            <th>Всего</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="bc in occupancy.byBusinessCenter"
                            :key="bc.name"
                          >
                            <td>{{ bc.name }}</td>
                            <td>{{ bc.available }}</td>
                            <td>{{ bc.occupied }}</td>
                            <td>{{ bc.reserved }}</td>
                            <td>{{ bc.total }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div class="report-section">
                    <h3>Статусы сервисных заявок</h3>
                    <div class="stats-grid">
                      <div class="stat-card">
                        <span class="stat-value">{{ ticketsReport.total }}</span
                        ><span class="stat-label">Всего заявок</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-value" style="color: #1976d2">{{
                          ticketsReport.byStatus?.new || 0
                        }}</span
                        ><span class="stat-label">Новые</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-value" style="color: #f57c00">{{
                          ticketsReport.byStatus?.in_progress || 0
                        }}</span
                        ><span class="stat-label">В работе</span>
                      </div>
                      <div class="stat-card">
                        <span class="stat-value" style="color: #2d8680">{{
                          ticketsReport.byStatus?.completed || 0
                        }}</span
                        ><span class="stat-label">Выполнены</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-show="activeTab === 'favorites'">
              <div class="card">
                <div class="card-header">
                  <h2>Избранные помещения</h2>
                </div>
                <div v-if="favLoading" class="loading-state">Загрузка...</div>
                <div v-else-if="favorites.length === 0" class="empty-state">
                  <p>Нет избранных помещений</p>
                  <small
                    >Добавьте помещения в избранное на главной странице</small
                  >
                </div>
                <div v-else class="favorites-grid">
                  <div
                    v-for="fav in favorites"
                    :key="fav.id"
                    class="favorite-card"
                  >
                    <div
                      class="fav-img"
                      v-if="fav.rental_objects?.photos?.length"
                    >
                      <img :src="fav.rental_objects.photos[0]" alt="Фото" />
                    </div>
                    <div class="fav-img-placeholder" v-else>🏢</div>
                    <div class="fav-body">
                      <div class="fav-title">
                        {{ fav.rental_objects?.title || '—' }}
                      </div>
                      <div class="fav-address">
                        {{
                          fav.rental_objects?.business_centers?.address ||
                          'Адрес не указан'
                        }}
                      </div>
                      <div class="fav-price">
                        {{ formatPrice(fav.rental_objects?.price_per_month) }}
                        ₽/мес
                      </div>
                      <div class="fav-actions">
                        <router-link
                          :to="`/properties/${fav.rental_object_id}?from=favorites`"
                          class="btn-outline-sm"
                        >
                          Посмотреть
                        </router-link>
                        <button
                          class="btn-outline-sm btn-remove"
                          @click="removeFavorite(fav.rental_object_id)"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showCreateTicketModal"
        class="modal-overlay"
        @click.self="showCreateTicketModal = false"
      >
        <div class="modal-content">
          <h3>Новая заявка на обслуживание</h3>
          <div class="modal-form-group">
            <label>Договор *</label>
            <select v-model="newTicket.contract_id">
              <option value="">Выберите договор</option>
              <option v-for="c in userContracts" :key="c.id" :value="c.id">
                {{ c.contract_number }} ({{ c.rental_objects?.title || '—' }})
              </option>
            </select>
          </div>
          <div class="modal-form-group">
            <label>Тема *</label>
            <input
              v-model="newTicket.title"
              type="text"
              placeholder="Краткое описание проблемы"
            />
          </div>
          <div class="modal-form-group">
            <label>Описание</label>
            <textarea
              v-model="newTicket.description"
              rows="3"
              placeholder="Подробно опишите проблему"
            ></textarea>
          </div>
          <div class="modal-form-group">
            <label>Тип</label>
            <select v-model="newTicket.type">
              <option value="cleaning">Уборка</option>
              <option value="repair">Ремонт</option>
              <option value="technical">Техническое обслуживание</option>
              <option value="other">Другое</option>
            </select>
          </div>
          <div class="modal-form-group">
            <label>Приоритет</label>
            <select v-model="newTicket.priority">
              <option value="low">Низкий</option>
              <option value="medium">Средний</option>
              <option value="high">Высокий</option>
              <option value="critical">Критический</option>
            </select>
          </div>
          <div class="modal-actions">
            <button
              class="btn btn-outline"
              @click="showCreateTicketModal = false"
            >
              Отмена
            </button>
            <button class="btn btn-primary" @click="submitTicket">
              Отправить
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="showTicketDetailModal"
        class="modal-overlay"
        @click.self="showTicketDetailModal = false"
      >
        <div class="modal-content ticket-modal">
          <div class="modal-header">
            <h3>Заявка на обслуживание</h3>
            <button class="modal-close" @click="showTicketDetailModal = false">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <div class="info-group">
              <div class="info-row">
                <span class="info-label">Тема:</span>
                <span class="info-value">{{ selectedTicket?.title }}</span>
              </div>
            </div>
            <div class="info-group">
              <div class="info-row">
                <span class="info-label">Статус:</span>
                <span
                  :class="[
                    'status-badge',
                    getTicketStatusClass(selectedTicket?.status),
                  ]"
                >
                  {{ getTicketStatusLabel(selectedTicket?.status) }}
                </span>
              </div>
              <div class="info-row">
                <span class="info-label">Приоритет:</span>
                <span class="info-value">{{
                  getTicketPriorityLabel(selectedTicket?.priority)
                }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Тип:</span>
                <span class="info-value">{{
                  getTicketTypeLabel(selectedTicket?.type)
                }}</span>
              </div>
            </div>
            <div class="info-group">
              <div class="info-row">
                <span class="info-label">Описание:</span>
                <span class="info-value">{{
                  selectedTicket?.description || '—'
                }}</span>
              </div>
            </div>
            <div class="info-group">
              <div class="info-row">
                <span class="info-label">Создана:</span>
                <span class="info-value">{{
                  formatDate(selectedTicket?.created_at)
                }}</span>
              </div>
              <div class="info-row" v-if="selectedTicket?.completion_date">
                <span class="info-label">Завершена:</span>
                <span class="info-value">{{
                  formatDate(selectedTicket.completion_date)
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showContractModal"
        class="modal-overlay"
        @click.self="showContractModal = false"
      >
        <div class="modal-content contract-modal">
          <div class="modal-header">
            <h3>Договор аренды</h3>
            <button class="modal-close" @click="showContractModal = false">
              &times;
            </button>
          </div>
          <div class="modal-body">
            <div class="info-group">
              <div class="info-row">
                <span class="info-label">Номер:</span>
                <span class="info-value">{{
                  selectedContract?.contract_number
                }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Объект:</span>
                <span class="info-value"
                  >{{ selectedContract?.rental_objects?.title }} ({{
                    selectedContract?.rental_objects?.area
                  }}
                  м²)</span
                >
              </div>
            </div>

            <div class="info-group">
              <h4>Стороны</h4>
              <div class="info-row">
                <span class="info-label">Арендодатель:</span>
                <span class="info-value">{{
                  selectedContract
                    ?.organizations_contracts_landlord_organization_idToorganizations
                    ?.full_name || '—'
                }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Арендатор:</span>
                <span class="info-value">
                  {{
                    selectedContract?.users?.user_profiles?.first_name ||
                    selectedContract
                      ?.organizations_contracts_tenant_organization_idToorganizations
                      ?.full_name ||
                    '—'
                  }}
                </span>
              </div>
            </div>

            <div class="info-group">
              <h4>Сроки и оплата</h4>
              <div class="info-row">
                <span class="info-label">Период:</span>
                <span class="info-value"
                  >{{ formatDate(selectedContract?.start_date) }} –
                  {{ formatDate(selectedContract?.end_date) }}</span
                >
              </div>
              <div class="info-row">
                <span class="info-label">Арендная плата:</span>
                <span class="info-value"
                  >{{ formatPrice(selectedContract?.monthly_rent) }} ₽/мес</span
                >
              </div>
              <div class="info-row">
                <span class="info-label">Депозит:</span>
                <span class="info-value"
                  >{{ formatPrice(selectedContract?.deposit) }} ₽</span
                >
              </div>
              <div class="info-row">
                <span class="info-label">День платежа:</span>
                <span class="info-value">{{
                  selectedContract?.payment_day
                    ? selectedContract.payment_day + '-е число'
                    : '—'
                }}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Статус:</span>
                <span
                  :class="[
                    'status-badge',
                    getStatusClass(selectedContract?.status),
                  ]"
                  >{{ getStatusLabel(selectedContract?.status) }}</span
                >
              </div>
            </div>

            <div class="info-group" v-if="selectedContract?.contract_file_url">
              <h4>Документ</h4>
              <a
                :href="selectedContract.contract_file_url"
                target="_blank"
                class="download-link"
                >Скачать договор (PDF)</a
              >
            </div>
            <div v-else class="info-group">
              <p class="no-file">Файл договора не загружен</p>
            </div>
          </div>
        </div>
      </div>
      <div
        v-if="showCreateContractModal"
        class="modal-overlay"
        @click.self="showCreateContractModal = false"
      >
        <div class="modal-content contract-modal" style="max-width: 650px">
          <div class="modal-header">
            <h3>Новый договор аренды</h3>
            <button
              class="modal-close"
              @click="showCreateContractModal = false"
            >
              &times;
            </button>
          </div>
          <div class="modal-body">
            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px"
            >
              <div class="form-group">
                <label>Помещение *</label>
                <div class="input-wrapper">
                  <select
                    v-model="createContractForm.rental_object_id"
                    required
                  >
                    <option value="">Выберите помещение</option>
                    <option
                      v-for="prop in availableProperties"
                      :key="prop.id"
                      :value="prop.id"
                    >
                      {{ prop.title }} ({{
                        prop.business_centers?.name || '—'
                      }}) — {{ prop.area }} м²,
                      {{ formatPrice(prop.price_per_month) }} ₽/мес
                    </option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label>Тип арендатора</label>
                <div class="input-wrapper">
                  <select v-model="createContractForm.tenant_type">
                    <option value="individual">Физическое лицо</option>
                    <option value="legal">Юридическое лицо</option>
                  </select>
                </div>
              </div>
            </div>

            <div
              v-if="createContractForm.tenant_type === 'individual'"
              class="form-group"
            >
              <label>Арендатор (физлицо) *</label>
              <div class="input-wrapper">
                <select v-model="createContractForm.tenant_user_id" required>
                  <option value="">Выберите пользователя</option>
                  <option
                    v-for="user in tenantsList"
                    :key="user.id"
                    :value="user.id"
                  >
                    {{ user.user_profiles?.last_name }}
                    {{ user.user_profiles?.first_name }} ({{ user.email }})
                  </option>
                </select>
              </div>
            </div>
            <div
              v-if="createContractForm.tenant_type === 'legal'"
              class="form-group"
            >
              <label>Арендатор (юрлицо) *</label>
              <div class="input-wrapper">
                <select
                  v-model="createContractForm.tenant_organization_id"
                  required
                >
                  <option value="">Выберите организацию</option>
                  <option
                    v-for="org in tenantsList.filter((u) => u.organization_id)"
                    :key="org.organization_id"
                    :value="org.organization_id"
                  >
                    {{ org.organization?.full_name || org.organization_id }}
                  </option>
                </select>
              </div>
            </div>

            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px"
            >
              <div class="form-group">
                <label>Дата начала *</label>
                <div class="input-wrapper">
                  <input
                    type="date"
                    v-model="createContractForm.start_date"
                    required
                  />
                </div>
              </div>
              <div class="form-group">
                <label>Дата окончания *</label>
                <div class="input-wrapper">
                  <input
                    type="date"
                    v-model="createContractForm.end_date"
                    required
                  />
                </div>
              </div>
            </div>

            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px"
            >
              <div class="form-group">
                <label>Арендная плата (₽/мес) *</label>
                <div class="input-wrapper">
                  <input
                    type="number"
                    v-model="createContractForm.monthly_rent"
                    required
                  />
                </div>
              </div>
              <div class="form-group">
                <label>Депозит (₽)</label>
                <div class="input-wrapper">
                  <input type="number" v-model="createContractForm.deposit" />
                </div>
              </div>
            </div>

            <div
              style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px"
            >
              <div class="form-group">
                <label>День платежа (число месяца)</label>
                <div class="input-wrapper">
                  <input
                    type="number"
                    v-model="createContractForm.payment_day"
                    min="1"
                    max="31"
                    placeholder="например, 5"
                  />
                </div>
              </div>
              <div></div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" @click="submitCreateContract">
              Создать договор
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.status-select {
  padding: 4px 8px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  background: var(--color-white);
  font-size: 12px;
}

.contract-modal {
  max-width: 550px;
  width: 90%;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12px;
  margin-bottom: 16px;
}
.modal-header h3 {
  margin: 0;
  color: var(--color-primary);
}
.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
}
.modal-body {
  max-height: 60vh;
  overflow-y: auto;
}
.info-group {
  margin-bottom: 20px;
}
.info-group h4 {
  font-size: 16px;
  color: var(--color-primary);
  margin-bottom: 8px;
  border-left: 3px solid var(--color-primary);
  padding-left: 8px;
}
.info-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 14px;
}
.info-label {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.info-value {
  color: var(--color-text);
  font-weight: 500;
}
.download-link {
  display: inline-block;
  background: var(--color-primary-light);
  color: var(--color-primary);
  padding: 6px 12px;
  border-radius: 20px;
  text-decoration: none;
  font-size: 13px;
}
.no-file {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-style: italic;
}
.modal-footer {
  margin-top: 20px;
  text-align: right;
  border-top: 1px solid var(--color-border);
  padding-top: 12px;
}
.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}
.favorite-card {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: var(--color-white);
  transition: 0.2s;
}
.favorite-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.fav-img,
.fav-img-placeholder {
  width: 100px;
  height: 100px;
  object-fit: cover;
  background: var(--color-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: white;
  flex-shrink: 0;
}
.fav-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.fav-body {
  padding: 12px;
  flex: 1;
}
.fav-title {
  font-weight: 700;
  margin-bottom: 4px;
}
.fav-address {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.fav-price {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 8px;
}
.fav-actions {
  display: flex;
  gap: 8px;
}
.btn-outline-sm {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  border: 1px solid var(--color-primary);
  background: none;
  color: var(--color-primary);
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
}
.btn-remove {
  border-color: var(--color-secondary);
  color: var(--color-secondary);
}

.reports-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}
.report-section {
  margin-bottom: 32px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin: 20px 0;
}
.stat-card {
  background: var(--color-bg-warm);
  border-radius: var(--radius-lg);
  padding: 16px;
  text-align: center;
}
.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
}
.stat-label {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.bc-table {
  overflow-x: auto;
  margin-top: 16px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  padding: 8px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: var(--color-white);
  max-width: 500px;
  width: 90%;
  border-radius: var(--radius-lg);
  padding: 24px;
}
.modal-form-group {
  margin-bottom: 16px;
}
.modal-form-group label {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
  color: var(--color-text-secondary);
}
.modal-form-group select,
.modal-form-group input,
.modal-form-group textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: inherit;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.detail-item {
  margin-bottom: 12px;
  line-height: 1.4;
}
.status-new {
  background: #e3f2fd;
  color: #1976d2;
}
.status-progress {
  background: #fff3e0;
  color: #f57c00;
}
.status-hold {
  background: #fef0ec;
  color: #d18875;
}
.status-completed {
  background: #eaf7f5;
  color: #2d8680;
}
.status-cancelled {
  background: #f5f5f5;
  color: #9e9e9e;
}
.items-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.list-item {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 16px;
  background: var(--color-bg-warm);
}
.list-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.list-item-details {
  font-size: 14px;
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.list-item-actions {
  margin-top: 12px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.btn-outline-sm {
  background: none;
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  transition: var(--transition);
}
.btn-outline-sm:hover {
  background: var(--color-primary-light);
}
.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 500;
}
.status-draft {
  background: #e3b7ab;
  color: #1e1e1e;
}
.status-pending {
  background: #dac090;
  color: #1e1e1e;
}
.status-active {
  background: #eaf7f5;
  color: #2d8680;
}
.status-terminated {
  background: #fef0ec;
  color: #d18875;
}
.status-completed {
  background: #e0e0e0;
  color: #666;
}
.loading-state,
.error-state {
  text-align: center;
  padding: 48px 24px;
}
.spinner-sm {
  width: 32px;
  height: 32px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.error-icon {
  font-size: 32px;
  display: block;
  margin-bottom: 12px;
}

.profile-page {
  min-height: 100vh;
  background: var(--color-bg);
}
.header {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  flex-wrap: wrap;
  gap: 16px;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}
.logo-icon-sm {
  font-size: 32px;
}
.nav {
  display: flex;
  align-items: center;
  gap: 24px;
}
.nav a {
  font-weight: 500;
  color: var(--color-text);
  transition: var(--transition);
}
.nav a:hover {
  color: var(--color-primary);
}
.logout-btn {
  border-radius: var(--radius-pill);
}
.profile-main {
  padding: 32px 0 48px;
}
.profile-grid {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}
.profile-sidebar {
  flex: 0 0 260px;
  min-width: 240px;
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 24px 0;
  align-self: start;
  position: sticky;
  top: 90px;
}
.sidebar-menu li {
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: var(--transition);
  border-left: 3px solid transparent;
  font-weight: 500;
}
.sidebar-menu li.active {
  background: var(--color-bg);
  border-left-color: var(--color-primary);
  color: var(--color-primary);
}
.sidebar-menu li:hover:not(.active) {
  background: var(--color-bg-warm);
}
.profile-content {
  flex: 1;
  min-width: 280px;
}
.card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 24px;
  margin-bottom: 24px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 12px;
}
.card-header h2 {
  font-size: 20px;
  color: var(--color-primary);
}
.avatar-section {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}
.avatar-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  font-weight: 700;
  color: white;
  transition: var(--transition);
}
.avatar-actions {
  display: flex;
  gap: 12px;
}
.avatar-color-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: var(--transition);
}
.avatar-color-btn.active {
  border-color: var(--color-text);
  transform: scale(1.1);
}
.profile-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.info-item {
  flex: 1;
  min-width: 160px;
}
.info-item label {
  display: block;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.info-item p {
  font-size: 16px;
  font-weight: 500;
}
.form-row-3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-row-1 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--color-text);
}
.input-wrapper input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  transition: var(--transition);
}
.input-wrapper input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(45, 134, 128, 0.1);
}
.edit-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  font-family: inherit;
}
.edit-actions {
  display: flex;
  gap: 8px;
}
.error-message {
  background: #fff0f0;
  border: 1px solid #ffcdd2;
  color: #c62828;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  font-size: 14px;
}
.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: var(--color-text-secondary);
}
.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}
.toast {
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 10000;
  padding: 14px 24px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  box-shadow: var(--shadow-card);
  max-width: 400px;
}
.toast-success {
  background: var(--color-primary);
  color: white;
}
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}
.fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
.btn-primary {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: var(--radius-pill);
  cursor: pointer;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
}
.btn-outline {
  background: none;
  border: 1px solid var(--color-border);
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  cursor: pointer;
}

.btn-activate {
  background: #2d8680;
  color: white;
  border-color: #2d8680;
}
.btn-activate:hover {
  background: #236b66;
}
.btn-terminate {
  background: #d18875;
  color: white;
  border-color: #d18875;
}
.btn-terminate:hover {
  background: #c06850;
}
@media (max-width: 800px) {
  .profile-grid {
    flex-direction: column;
  }
  .profile-sidebar {
    position: static;
    flex: auto;
  }
  .form-row-3 {
    grid-template-columns: 1fr;
  }
  .form-row-2 {
    grid-template-columns: 1fr;
  }
}
</style>
