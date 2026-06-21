<template>
  <div class="admin-page">
    <AppHeader />
    <main class="main">
      <div class="container">
        <h1 class="page-title">Панель администратора</h1>

        <div class="admin-tabs">
          <button
            :class="['tab-btn', { active: activeTab === 'users' }]"
            @click="activeTab = 'users'"
          >
            Пользователи
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'businessCenters' }]"
            @click="activeTab = 'businessCenters'"
          >
            Бизнес-центры
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'orgs' }]"
            @click="activeTab = 'orgs'"
          >
            Организации
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'audit' }]"
            @click="activeTab = 'audit'"
          >
            Аудит-логи
          </button>
        </div>

        <div v-if="activeTab === 'users'" class="tab-content">
          <div class="card">
            <div class="card-header"><h2>Управление пользователями</h2></div>
            <div v-if="usersLoading" class="loading">Загрузка...</div>
            <div v-else-if="usersError" class="error">{{ usersError }}</div>
            <div v-else class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Фамилия Имя</th>
                    <th>Email</th>
                    <th>Телефон</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="user in users" :key="user.id">
                    <td>{{ user.id }}</td>
                    <td>
                      {{ user.user_profiles?.last_name }}
                      {{ user.user_profiles?.first_name }}
                    </td>
                    <td>{{ user.email }}</td>
                    <td>{{ user.phone || '—' }}</td>
                    <td>
                      <select
                        :value="user.role_id"
                        @change="changeRole(user.id, $event.target.value)"
                        class="role-select"
                      >
                        <option
                          v-for="role in rolesList"
                          :key="role.id"
                          :value="role.id"
                        >
                          {{ role.name }}
                        </option>
                      </select>
                    </td>
                    <td>
                      <span
                        :class="[
                          'badge',
                          user.is_active ? 'badge-active' : 'badge-blocked',
                        ]"
                      >
                        {{ user.is_active ? 'Активен' : 'Заблокирован' }}
                      </span>
                    </td>
                    <td>
                      <button
                        v-if="user.id !== auth.user?.id"
                        class="btn-block"
                        :class="
                          user.is_active
                            ? 'btn-block-active'
                            : 'btn-block-inactive'
                        "
                        @click="toggleBlock(user.id, !user.is_active)"
                      >
                        {{
                          user.is_active ? 'Заблокировать' : 'Разблокировать'
                        }}
                      </button>
                      <span v-else class="self-action">Это вы</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'orgs'" class="tab-content">
          <div class="card">
            <div class="card-header">
              <h2>Управление организациями</h2>
              <button
                class="btn btn-primary btn-sm"
                @click="openCreateOrgModal"
              >
                + Создать организацию
              </button>
            </div>
            <div v-if="orgsLoading" class="loading">Загрузка...</div>
            <div v-else-if="orgsError" class="error">{{ orgsError }}</div>
            <div v-else class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>ИНН</th>
                    <th>Адрес</th>
                    <th>Телефон</th>
                    <th>Email</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="org in organizations" :key="org.id">
                    <td>{{ org.id }}</td>
                    <td>{{ org.full_name }}</td>
                    <td>{{ org.inn }}</td>
                    <td>
                      {{ org.actual_address || org.legal_address || '—' }}
                    </td>
                    <td>{{ org.phone || '—' }}</td>
                    <td>{{ org.email || '—' }}</td>
                    <td>
                      <button class="btn-danger" @click="deleteOrg(org.id)">
                        Удалить
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'audit'" class="tab-content">
          <div class="card">
            <div class="card-header"><h2>Журнал аудита</h2></div>
            <div v-if="auditLoading" class="loading">Загрузка...</div>
            <div v-else-if="auditError" class="error">{{ auditError }}</div>
            <div v-else class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Время</th>
                    <th>Пользователь</th>
                    <th>Действие</th>
                    <th>Сущность</th>
                    <th>Детали</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="log in auditLogs" :key="log.id">
                    <td>{{ formatDate(log.timestamp) }}</td>
                    <td>
                      {{
                        log.users?.user_profiles?.email ||
                        log.users?.email ||
                        '—'
                      }}
                    </td>
                    <td>{{ log.action }}</td>
                    <td>{{ log.entity_type }} #{{ log.entity_id }}</td>
                    <td class="log-details">
                      {{
                        log.old_values || log.new_values
                          ? 'Изменены данные'
                          : '—'
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div v-if="activeTab === 'businessCenters'" class="tab-content">
          <div class="card">
            <div class="card-header">
              <h2>Управление бизнес-центрами</h2>
              <button class="btn btn-primary btn-sm" @click="openCreateBcModal">
                + Создать БЦ
              </button>
            </div>
            <div v-if="bcLoading" class="loading">Загрузка...</div>
            <div v-else-if="bcError" class="error">{{ bcError }}</div>
            <div v-else class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Название</th>
                    <th>Адрес</th>
                    <th>Организация (владелец)</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bc in businessCenters" :key="bc.id">
                    <td>{{ bc.id }}</td>
                    <td>{{ bc.name }}</td>
                    <td>{{ bc.address }}</td>
                    <td>{{ bc.organizations?.full_name || '—' }}</td>
                    <td>
                      <button class="btn-edit" @click="openEditBcModal(bc)">
                        Редактировать
                      </button>
                      <button class="btn-danger" @click="deleteBc(bc.id)">
                        Удалить
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div
          v-if="showBcModal"
          class="modal-overlay"
          @click.self="showBcModal = false"
        >
          <div class="modal-content" style="max-width: 500px">
            <div class="modal-header">
              <h3>
                {{ editingBcId ? 'Редактирование БЦ' : 'Новый бизнес-центр' }}
              </h3>
              <button class="modal-close" @click="showBcModal = false">
                &times;
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Название *</label>
                <input v-model="bcForm.name" type="text" />
              </div>
              <div class="form-group">
                <label>Адрес *</label>
                <input v-model="bcForm.address" type="text" />
              </div>
              <div class="form-group">
                <label>Организация-владелец</label>
                <select v-model="bcForm.organization_id">
                  <option :value="null">-- Не выбрано --</option>
                  <option
                    v-for="org in organizations"
                    :key="org.id"
                    :value="org.id"
                  >
                    {{ org.full_name }}
                  </option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" @click="showBcModal = false">
                Отмена
              </button>
              <button class="btn btn-primary" @click="submitBcForm">
                Сохранить
              </button>
            </div>
          </div>
        </div>
        <div
          v-if="showCreateOrgModal"
          class="modal-overlay"
          @click.self="showCreateOrgModal = false"
        >
          <div class="modal-content" style="max-width: 550px">
            <div class="modal-header">
              <h3>Новая организация</h3>
              <button class="modal-close" @click="showCreateOrgModal = false">
                &times;
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Полное название *</label>
                <input v-model="newOrg.full_name" type="text" />
              </div>
              <div class="form-group">
                <label>Краткое название</label>
                <input v-model="newOrg.short_name" type="text" />
              </div>
              <div class="form-group">
                <label>ИНН *</label>
                <input v-model="newOrg.inn" type="text" />
              </div>
              <div class="form-group">
                <label>КПП</label>
                <input v-model="newOrg.kpp" type="text" />
              </div>
              <div class="form-group">
                <label>ОГРН</label>
                <input v-model="newOrg.ogrn" type="text" />
              </div>
              <div class="form-group">
                <label>Юридический адрес</label>
                <input v-model="newOrg.legal_address" type="text" />
              </div>
              <div class="form-group">
                <label>Фактический адрес</label>
                <input v-model="newOrg.actual_address" type="text" />
              </div>
              <div class="form-group">
                <label>Телефон</label>
                <input v-model="newOrg.phone" type="text" />
              </div>
              <div class="form-group">
                <label>Email</label>
                <input v-model="newOrg.email" type="email" />
              </div>
            </div>
            <div class="modal-footer">
              <button
                class="btn btn-outline"
                @click="showCreateOrgModal = false"
              >
                Отмена
              </button>
              <button class="btn btn-primary" @click="submitCreateOrg">
                Создать
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    <AppFooter />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useAuthStore } from '@/stores/auth'

const activeTab = ref('users')
const auth = useAuthStore()

const users = ref([])
const usersLoading = ref(false)
const usersError = ref('')
const rolesList = ref([])

const organizations = ref([])
const orgsLoading = ref(false)
const orgsError = ref('')

const showCreateOrgModal = ref(false)
const newOrg = ref({
  full_name: '',
  short_name: '',
  inn: '',
  kpp: '',
  ogrn: '',
  legal_address: '',
  actual_address: '',
  phone: '',
  email: '',
})

const businessCenters = ref([])
const bcLoading = ref(false)
const bcError = ref('')
const showBcModal = ref(false)
const editingBcId = ref(null)
const bcForm = ref({
  name: '',
  address: '',
  organization_id: null,
})

async function fetchBusinessCenters() {
  bcLoading.value = true
  try {
    const { data } = await api.get('/business-centers')
    businessCenters.value = data.businessCenters || []
  } catch (err) {
    bcError.value = 'Ошибка загрузки БЦ'
  } finally {
    bcLoading.value = false
  }
}

function openCreateBcModal() {
  editingBcId.value = null
  bcForm.value = { name: '', address: '', organization_id: null }
  showBcModal.value = true
}

function openEditBcModal(bc) {
  editingBcId.value = bc.id
  bcForm.value = {
    name: bc.name,
    address: bc.address,
    organization_id: bc.organization_id,
  }
  showBcModal.value = true
}

async function submitBcForm() {
  if (!bcForm.value.name || !bcForm.value.address) {
    alert('Заполните название и адрес')
    return
  }
  try {
    if (editingBcId.value) {
      await api.put(`/business-centers/${editingBcId.value}`, bcForm.value)
    } else {
      await api.post('/business-centers', bcForm.value)
    }
    showBcModal.value = false
    await fetchBusinessCenters()
    alert(editingBcId.value ? 'БЦ обновлён' : 'БЦ создан')
  } catch (err) {
    alert('Ошибка: ' + (err.response?.data?.error || 'Неизвестная ошибка'))
  }
}

async function deleteBc(id) {
  if (
    !confirm(
      'Удалить бизнес-центр? Все помещения внутри него также будут удалены (если нет договоров).',
    )
  )
    return
  try {
    await api.delete(`/business-centers/${id}`)
    await fetchBusinessCenters()
    alert('БЦ удалён')
  } catch (err) {
    alert('Ошибка удаления: ' + (err.response?.data?.error || err.message))
  }
}
async function deleteOrg(orgId) {
  if (
    !confirm(
      'Вы уверены, что хотите удалить организацию? Все связанные бизнес-центры должны быть удалены заранее.',
    )
  )
    return
  try {
    await api.delete(`/admin/organizations/${orgId}`)
    await fetchOrganizations()
    alert('Организация удалена')
  } catch (err) {
    alert(
      'Ошибка при удалении: ' +
        (err.response?.data?.error || 'Неизвестная ошибка'),
    )
  }
}

function openCreateOrgModal() {
  newOrg.value = {
    full_name: '',
    short_name: '',
    inn: '',
    kpp: '',
    ogrn: '',
    legal_address: '',
    actual_address: '',
    phone: '',
    email: '',
  }
  showCreateOrgModal.value = true
}

async function submitCreateOrg() {
  if (!newOrg.value.full_name || !newOrg.value.inn) {
    alert('Заполните полное название и ИНН')
    return
  }
  try {
    await api.post('/admin/organizations', newOrg.value)
    showCreateOrgModal.value = false
    await fetchOrganizations()
    alert('Организация создана')
  } catch (err) {
    alert('Ошибка: ' + (err.response?.data?.error || 'Неизвестная ошибка'))
  }
}

const auditLogs = ref([])
const auditLoading = ref(false)
const auditError = ref('')

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('ru-RU')
}

async function fetchUsers() {
  usersLoading.value = true
  try {
    const { data } = await api.get('/admin/users')
    users.value = data.users
  } catch (err) {
    usersError.value = 'Ошибка загрузки пользователей'
  } finally {
    usersLoading.value = false
  }
}

async function fetchRoles() {
  try {
    const { data } = await api.get('/roles')
    rolesList.value = data.roles
  } catch (err) {
    console.error('Не удалось загрузить роли')
  }
}

async function toggleBlock(userId, isActive) {
  try {
    await api.patch(`/admin/users/${userId}/block`, { is_active: isActive })
    await fetchUsers()
  } catch (err) {
    alert('Ошибка при изменении статуса')
  }
}

async function changeRole(userId, roleId) {
  try {
    await api.patch(`/admin/users/${userId}/role`, {
      role_id: parseInt(roleId),
    })
    await fetchUsers()
  } catch (err) {
    alert('Ошибка при смене роли')
  }
}

async function fetchOrganizations() {
  orgsLoading.value = true
  try {
    const { data } = await api.get('/admin/organizations')
    organizations.value = data.organizations
  } catch (err) {
    orgsError.value = 'Ошибка загрузки организаций'
  } finally {
    orgsLoading.value = false
  }
}

async function fetchAuditLogs() {
  auditLoading.value = true
  try {
    const { data } = await api.get('/admin/audit-logs')
    auditLogs.value = data.logs
  } catch (err) {
    auditError.value = 'Ошибка загрузки аудит-логов'
  } finally {
    auditLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
  fetchRoles()
  fetchOrganizations()
  fetchAuditLogs()
  fetchBusinessCenters()
})
</script>

<style scoped>
.admin-page {
  min-height: 100vh;
  background: var(--color-bg);
}
.main {
  padding: 32px 0;
}
.page-title {
  font-size: 28px;
  color: var(--color-primary);
  margin-bottom: 24px;
}
.admin-tabs {
  display: flex;
  gap: 12px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 24px;
}
.tab-btn {
  background: none;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: 0.2s;
}
.tab-btn.active {
  color: var(--color-primary);
  border-bottom: 3px solid var(--color-primary);
}
.table-responsive {
  overflow-x: auto;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
}
.data-table th,
.data-table td {
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}
.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
}
.badge-active {
  background: #eaf7f5;
  color: #2d8680;
}
.badge-blocked {
  background: #fef0ec;
  color: #d18875;
}
.badge-verified {
  background: #eaf7f5;
  color: #2d8680;
}
.badge-pending {
  background: #fff8e1;
  color: #f57f17;
}
.role-select {
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid var(--color-border);
}

.btn-verify {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 20px;
  cursor: pointer;
}
.log-details {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.loading,
.error {
  text-align: center;
  padding: 40px;
}

.modal-body {
  max-height: 60vh;
  overflow-y: auto;
}
.form-group {
  margin-bottom: 12px;
}
.form-group label {
  display: block;
  font-size: 13px;
  margin-bottom: 4px;
}
.form-group input {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
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
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
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
  padding: 20px;
}
.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn-danger {
  background: #d18875;
  color: white;
  font-size: 16px;
  border: none;
  padding: 4px 12px;
  border-radius: 20px;
  cursor: pointer;
}
.btn-danger:hover {
  background: #c06850;
}
.btn-edit {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  margin-right: 20px;
  color: #2d8680;
}

.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: inherit;
  background: white;
}
.form-group select option {
  padding: 10px;
  background-color: white;
  color: #1e1e1e;
}

.form-group select option:hover {
  background-color: #2d8680;
  color: white;
}

.btn-block {
  border: none;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
  transition: 0.2s;
}
.btn-block-active {
  background: #d18875;
  color: white;
}
.btn-block-active:hover {
  background: #c06850;
}
.btn-block-inactive {
  background: #2d8680;
  color: white;
}
.btn-block-inactive:hover {
  background: #236b66;
}
.self-action {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-style: italic;
}
</style>
