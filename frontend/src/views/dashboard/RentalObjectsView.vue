<template>
  <div class="dashboard-objects">
    <AppHeader />
    <main class="main">
      <div class="container">
        <div class="page-header">
          <h1><i class="fas fa-building"></i> Управление объектами</h1>
          <button class="btn btn-primary" @click="openCreateModal">
            Добавить помещение
          </button>
        </div>

        <div v-if="store.loading" class="loading-state">
          <div class="spinner-lg"></div>
          <p>Загрузка помещений...</p>
        </div>

        <div v-else-if="store.error" class="error-state">
          <span class="error-icon">⚠️</span>
          <p>{{ store.error }}</p>
          <button class="btn btn-outline" @click="store.fetchRentalObjects">
            Повторить
          </button>
        </div>

        <div v-else-if="store.rentalObjects.length === 0" class="empty-state">
          <p>У вас пока нет помещений</p>
          <small>Нажмите «Добавить помещение», чтобы создать первое</small>
        </div>

        <div v-else class="objects-grid">
          <div
            v-for="obj in store.rentalObjects"
            :key="obj.id"
            class="object-card"
            @click="openEditModal(obj)"
          >
            <div class="card-img">
              <img
                v-if="obj.photos?.[0]"
                :src="obj.photos[0]"
                class="object-image"
              />
              <div v-else class="no-image-placeholder">
                {{ getCardIcon(obj.id) }}
              </div>
            </div>
            <div class="card-body">
              <div class="card-title">{{ obj.title }}</div>
              <div class="card-address">
                {{ obj.business_centers?.address || '—' }}
              </div>
              <div class="card-bc">
                {{ obj.business_centers?.name || '—' }}
              </div>
              <div class="card-price">
                {{ formatPrice(obj.price_per_month) }} ₽ / мес
              </div>
              <div class="card-meta">
                <span class="card-area">{{ obj.area }} м²</span>
                <span :class="['card-status', getStatusClass(obj.status)]">
                  {{ getStatusLabel(obj.status) }}
                </span>
              </div>
              <div class="card-actions" @click.stop>
                <button class="btn-icon" @click="openEditModal(obj)">
                  Редактировать
                </button>
                <button
                  class="btn-icon btn-delete"
                  @click.stop="confirmDelete(obj)"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <AppFooter />

    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <h3>
          {{ editingId ? 'Редактирование помещения' : 'Новое помещение' }}
        </h3>
        <form @submit.prevent="saveObject">
          <div class="form-group">
            <label>Бизнес-центр *</label>
            <div class="input-wrapper">
              <select v-model="form.business_center_id" required>
                <option value="">Выберите БЦ</option>
                <option
                  v-for="bc in businessCenters"
                  :key="bc.id"
                  :value="bc.id"
                >
                  {{ bc.name }} ({{ bc.address }})
                </option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Название помещения *</label>
            <div class="input-wrapper">
              <input v-model="form.title" type="text" required />
            </div>
          </div>
          <div class="form-group">
            <label>Площадь (м²) *</label>
            <div class="input-wrapper">
              <input
                v-model.number="form.area"
                type="number"
                step="0.1"
                required
              />
            </div>
          </div>
          <div class="form-group">
            <label>Цена за месяц (₽) *</label>
            <div class="input-wrapper">
              <input
                v-model.number="form.price_per_month"
                type="number"
                step="1000"
                required
              />
            </div>
          </div>
          <div class="form-group">
            <label>Статус</label>
            <div class="input-wrapper">
              <select v-model="form.status">
                <option value="available">Свободно</option>
                <option value="occupied">Занято</option>
                <option value="reserved">Забронировано</option>
                <option value="under_renovation">На ремонте</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Фотографии помещения</label>
            <div class="input-wrapper">
              <input
                type="file"
                multiple
                accept="image/*"
                @change="onFileSelect"
              />
            </div>
            <div class="photo-preview" v-if="previewUrls.length">
              <div
                v-for="(url, idx) in previewUrls"
                :key="idx"
                class="preview-item"
              >
                <img :src="url" />
                <button type="button" @click="removePreview(idx)">✖</button>
              </div>
            </div>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-outline" @click="closeModal">
              Отмена
            </button>
            <button type="submit" class="btn btn-primary">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRentalObjectsStore } from '@/stores/rentalObjects'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import api from '@/api'

const store = useRentalObjectsStore()
const auth = useAuthStore()
const showModal = ref(false)
const editingId = ref(null)
const form = ref({
  business_center_id: '',
  title: '',
  area: '',
  price_per_month: '',
  status: 'available',
})
const businessCenters = ref([])
const selectedFiles = ref([])
const previewUrls = ref([])

async function loadBusinessCenters() {
  try {
    const response = await api.get('/business-centers')
    businessCenters.value = response.data.businessCenters || []
  } catch (err) {
    console.error('Ошибка загрузки БЦ:', err)
  }
}

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

function getStatusLabel(status) {
  const map = {
    available: 'Свободно',
    occupied: 'Занято',
    reserved: 'Забронировано',
    under_renovation: 'На ремонте',
  }
  return map[status] || status
}

function getStatusClass(status) {
  const map = {
    available: 'status-available',
    occupied: 'status-occupied',
    reserved: 'status-reserved',
    under_renovation: 'status-renovation',
  }
  return map[status] || ''
}

function getCardIcon(id) {
  const icons = ['🏢', '🏗️', '🏬', '🏛️']
  return icons[id % icons.length]
}

function onFileSelect(event) {
  selectedFiles.value = Array.from(event.target.files)
  console.log('Выбрано файлов:', selectedFiles.value.length)
  previewUrls.value = selectedFiles.value.map((file) =>
    URL.createObjectURL(file),
  )
}

function removePreview(index) {
  URL.revokeObjectURL(previewUrls.value[index])
  previewUrls.value.splice(index, 1)
  selectedFiles.value.splice(index, 1)
}

function openCreateModal() {
  editingId.value = null
  form.value = {
    business_center_id: '',
    title: '',
    area: '',
    price_per_month: '',
    status: 'available',
  }
  selectedFiles.value = []
  previewUrls.value.forEach((url) => URL.revokeObjectURL(url))
  previewUrls.value = []
  showModal.value = true
}

function openEditModal(obj) {
  editingId.value = obj.id
  form.value = {
    business_center_id: obj.business_center_id,
    title: obj.title,
    area: obj.area,
    price_per_month: obj.price_per_month,
    status: obj.status,
  }
  selectedFiles.value = []
  previewUrls.value = []
  showModal.value = true
}

async function saveObject() {
  try {
    let uploadedPhotoUrls = []
    if (selectedFiles.value.length) {
      const formData = new FormData()
      selectedFiles.value.forEach((file) => formData.append('photos', file))
      const uploadRes = await api.post('/upload/photos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      uploadedPhotoUrls = uploadRes.data.urls
      console.log('Загружено фото:', uploadedPhotoUrls)
    }

    let finalPhotos = uploadedPhotoUrls
    if (editingId.value && finalPhotos.length === 0) {
      const existingObj = store.rentalObjects.find(
        (o) => o.id === editingId.value,
      )
      finalPhotos = existingObj?.photos || []
    }

    const payload = {
      title: form.value.title,
      business_center_id: parseInt(form.value.business_center_id),
      area: parseFloat(form.value.area),
      price_per_month: parseFloat(form.value.price_per_month),
      status: form.value.status,
      photos: finalPhotos,
      manager_id: auth.user.id,
    }

    if (editingId.value) {
      await store.updateRentalObject(editingId.value, payload)
    } else {
      await store.createRentalObject(payload)
    }
    closeModal()
    await store.fetchRentalObjects()
    selectedFiles.value = []
    previewUrls.value.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.value = []
  } catch (err) {
    console.error('Ошибка сохранения:', err)
    alert('Ошибка сохранения: ' + (err.response?.data?.error || err.message))
  }
}

async function confirmDelete(obj) {
  if (confirm(`Удалить помещение "${obj.title}"?`)) {
    try {
      await store.deleteRentalObject(obj.id)
    } catch (err) {
      alert('Ошибка удаления: ' + (err.response?.data?.error || err.message))
    }
  }
}

function closeModal() {
  showModal.value = false
  editingId.value = null
}

onMounted(() => {
  store.fetchRentalObjects()
  loadBusinessCenters()
})
</script>

<style scoped>
.object-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
}
.no-image-placeholder {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: var(--color-tertiary);
  color: white;
}

.object-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
}
.no-image-placeholder {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: var(--color-tertiary);
  color: white;
}

.dashboard-objects {
  min-height: 100vh;
  background: var(--color-bg);
}
.main {
  padding: 32px 0;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 16px;
}
.page-header h1 {
  font-size: 28px;
  color: var(--color-primary);
}
.objects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}
.object-card {
  background: white;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  transition: 0.2s;
  cursor: pointer;
}
.object-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}
.card-img {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--color-tertiary);
}
.card-body {
  padding: 20px;
}
.card-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 8px;
}
.card-address,
.card-bc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 4px;
}
.card-price {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
  margin: 12px 0;
}
.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-area {
  font-size: 13px;
  color: var(--color-text-secondary);
}
.card-status {
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
}
.status-available {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.status-occupied {
  background: #fff0f0;
  color: #c62828;
}
.status-reserved {
  background: #fff8e1;
  color: #f57f17;
}
.status-renovation {
  background: #f3e5f5;
  color: #7b1fa2;
}
.card-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}
.btn-icon {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: 0.2s;
}
.btn-icon:hover {
  color: var(--color-primary);
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
  max-width: 500px;
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
.input-wrapper {
  width: 100%;
}
.input-wrapper select,
.input-wrapper input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: inherit;
  background: white;
}
.photo-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.preview-item {
  position: relative;
  width: 80px;
  height: 80px;
}
.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}
.preview-item button {
  position: absolute;
  top: -8px;
  right: -8px;
  background: red;
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  cursor: pointer;
}

.btn-delete {
  color: #d18875;
}
.btn-delete:hover {
  color: #c62828;
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
