<template>
  <div class="viewing-requests-page">
    <AppHeader />
    <main class="main">
      <div class="container">
        <div class="page-header">
          <h1><i class="fas fa-calendar-check"></i> Заявки на просмотр</h1>
        </div>

        <div v-if="store.loading" class="loading-state">
          <div class="spinner-lg"></div>
          <p>Загрузка заявок...</p>
        </div>

        <div v-else-if="store.error" class="error-state">
          <span class="error-icon">⚠️</span>
          <p>{{ store.error }}</p>
          <button class="btn btn-outline" @click="store.fetchRequests">
            Повторить
          </button>
        </div>

        <div v-else-if="store.requests.length === 0" class="empty-state">
          <p>Нет входящих заявок на просмотр</p>
          <small>Когда арендаторы отправят запросы, они появятся здесь</small>
        </div>

        <div v-else class="requests-list">
          <div v-for="req in store.requests" :key="req.id" class="request-card">
            <div class="request-header">
              <div class="request-info">
                <strong>
                  {{
                    req.users_viewing_requests_user_idTousers?.user_profiles
                      ?.first_name || '—'
                  }}
                  {{
                    req.users_viewing_requests_user_idTousers?.user_profiles
                      ?.last_name || '—'
                  }}
                </strong>
                <span class="request-phone">
                  {{ req.users_viewing_requests_user_idTousers?.phone || '—' }}
                </span>
              </div>
              <div class="request-status" :class="getStatusClass(req.status)">
                {{ getStatusLabel(req.status) }}
              </div>
            </div>
            <div class="request-details">
              <div>Помещение: {{ req.rental_objects?.title || '—' }}</div>
              <div>
                Местоположение:
                {{ req.rental_objects?.business_centers?.address || '—' }}
              </div>
              <div>
                Предпочтительная дата: {{ formatDate(req.preferred_date) }} в
                {{ req.preferred_time }}
              </div>
              <div v-if="req.user_notes">Пожелания: {{ req.user_notes }}</div>
              <div v-if="req.manager_notes">
                Заметки менеджера: {{ req.manager_notes }}
              </div>
            </div>

            <div v-if="req.status === 'pending'" class="request-actions">
              <button
                class="btn btn-success btn-sm"
                @click="openScheduleModal(req)"
              >
                Одобрить
              </button>
              <button
                class="btn btn-danger btn-sm"
                @click="openRejectModal(req)"
              >
                Отклонить
              </button>
            </div>
            <div v-else class="request-meta">
              <small>Обработано: {{ formatDate(req.processed_at) }}</small>
            </div>
          </div>
        </div>
      </div>
    </main>
    <AppFooter />

    <div
      v-if="showScheduleModal"
      class="modal-overlay"
      @click.self="closeScheduleModal"
    >
      <div class="modal-content">
        <h3>Назначить просмотр</h3>
        <div class="form-group">
          <label>Дата *</label>
          <input type="date" v-model="scheduleForm.date" required />
        </div>
        <div class="form-group">
          <label>Время *</label>
          <input type="time" v-model="scheduleForm.time" required />
        </div>
        <div class="form-group">
          <label>Заметки для арендатора (необязательно)</label>
          <textarea
            v-model="scheduleForm.notes"
            rows="2"
            placeholder="Например: вход через центральную стойку ресепшн"
          ></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeScheduleModal">
            Отмена
          </button>
          <button class="btn btn-primary" @click="confirmSchedule">
            Подтвердить
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showRejectModal"
      class="modal-overlay"
      @click.self="closeRejectModal"
    >
      <div class="modal-content">
        <h3>Отклонение заявки</h3>
        <div class="form-group">
          <label>Причина отказа *</label>
          <textarea
            v-model="rejectForm.reason"
            rows="3"
            placeholder="Укажите причину, почему заявка отклонена"
          ></textarea>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="closeRejectModal">
            Отмена
          </button>
          <button class="btn btn-danger" @click="confirmReject">
            Отклонить
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useViewingRequestsStore } from '@/stores/viewingRequests'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'

const store = useViewingRequestsStore()
const showScheduleModal = ref(false)
const currentRequest = ref(null)
const scheduleForm = ref({
  date: '',
  time: '',
  notes: '',
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ru-RU')
}

function getStatusLabel(status) {
  const map = {
    pending: 'Ожидает',
    approved: 'Одобрена',
    rejected: 'Отклонена',
    completed: 'Завершена',
    cancelled: 'Отменена',
  }
  return map[status] || status
}

function getStatusClass(status) {
  const map = {
    pending: 'status-pending',
    approved: 'status-approved',
    rejected: 'status-rejected',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
  }
  return map[status] || ''
}

function openScheduleModal(req) {
  currentRequest.value = req
  scheduleForm.value = { date: '', time: '', notes: '' }
  showScheduleModal.value = true
}

function closeScheduleModal() {
  showScheduleModal.value = false
  currentRequest.value = null
}

async function confirmSchedule() {
  if (!scheduleForm.value.date || !scheduleForm.value.time) {
    alert('Укажите дату и время просмотра')
    return
  }
  try {
    await store.updateRequest(
      currentRequest.value.id,
      'approved',
      scheduleForm.value.date,
      scheduleForm.value.time,
      scheduleForm.value.notes,
    )
    closeScheduleModal()
    await store.fetchRequests()
    alert('Просмотр назначен')
  } catch (err) {
    alert('Ошибка при назначении')
  }
}

async function rejectRequest(req) {
  if (confirm('Отклонить заявку?')) {
    try {
      await store.updateRequest(
        req.id,
        'rejected',
        null,
        null,
        'Отклонено менеджером',
      )
      await store.fetchRequests()
      alert('Заявка отклонена')
    } catch (err) {
      alert('Ошибка')
    }
  }
}

const showRejectModal = ref(false)
const rejectForm = ref({
  reason: '',
})
const currentRejectRequest = ref(null)

function openRejectModal(req) {
  currentRejectRequest.value = req
  rejectForm.value.reason = ''
  showRejectModal.value = true
}

function closeRejectModal() {
  showRejectModal.value = false
  currentRejectRequest.value = null
}

async function confirmReject() {
  if (!rejectForm.value.reason.trim()) {
    alert('Укажите причину отказа')
    return
  }
  try {
    await store.updateRequest(
      currentRejectRequest.value.id,
      'rejected',
      null,
      null,
      rejectForm.value.reason,
    )
    closeRejectModal()
    await store.fetchRequests()
    alert('Заявка отклонена')
  } catch (err) {
    alert('Ошибка')
  }
}

onMounted(() => {
  store.fetchRequests()
})
</script>

<style scoped>
.viewing-requests-page {
  min-height: 100vh;
  background: var(--color-bg);
}
.main {
  padding: 32px 0;
}
.page-header {
  margin-bottom: 32px;
}
.page-header h1 {
  font-size: 28px;
  color: var(--color-primary);
}
.requests-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.request-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 20px;
  transition: 0.2s;
}
.request-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}
.request-info strong {
  font-size: 16px;
}
.request-phone {
  margin-left: 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
}
.request-status {
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 500;
}
.status-pending {
  background: #fff8e1;
  color: #f57f17;
}
.status-approved {
  background: #eaf7f5;
  color: #2d8680;
}
.status-rejected {
  background: #fef0ec;
  color: #d18875;
}
.status-completed {
  background: #e0e0e0;
  color: #666;
}
.request-details {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  line-height: 1.6;
}
.request-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.request-meta {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.btn-sm {
  padding: 6px 16px;
  font-size: 13px;
}
.btn-success {
  background: var(--color-primary);
  color: white;
  border: none;
}
.btn-danger {
  background: #d18875;
  color: white;
  border: none;
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
  max-width: 450px;
  width: 90%;
  border-radius: var(--radius-lg);
  padding: 24px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
}
.form-group input,
.form-group textarea {
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
.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 80px 24px;
}
.spinner-lg {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
