<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { propertiesApi } from '@/api/properties'
import { viewingRequestsApi } from '@/api/viewingRequests'
import api from '@/api'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import { useAuthStore } from '@/stores/auth'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const mapContainer = ref(null)
let map = null
let marker = null

function getBusinessCenterCoordinates(bc) {
  const coordsMap = {
    'БЦ "Альфа Плаза"': [57.628, 39.893],
    'БЦ "Бета Тауэр"': [57.63, 39.88],
    'БЦ Центральный': [55.751, 37.618],
    'БЦ Северный': [59.939, 30.315],
    'БЦ "Москва-Сити"': [55.747, 37.538],
    'БЦ "Омега Плаза"': [55.792, 37.556],
  }
  return coordsMap[bc.name] || [57.626, 39.891]
}

function initMap() {
  if (!mapContainer.value || !property.value) return
  const bc = property.value.business_centers
  if (!bc) return

  const coords = getBusinessCenterCoordinates(bc)
  map = L.map(mapContainer.value).setView(coords, 15)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map)
  marker = L.marker(coords).addTo(map)
  marker.bindPopup(`<b>${bc.name}</b><br>${bc.address}`).openPopup()
}

const route = useRoute()
const auth = useAuthStore()

const property = ref(null)
const loading = ref(true)
const error = ref('')
const showRequestModal = ref(false)
const successMsg = ref('')

const galleryIcons = ['🏢', '🏗️', '🏬']
const activeThumb = ref(0)

const isFavorite = ref(false)

function formatPhone(value) {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 0) return ''
  let formatted = ''
  if (digits.startsWith('7') || digits.startsWith('8')) {
    if (digits.startsWith('8')) digits = '7' + digits.slice(1)
    formatted = '+7'
    digits = digits.slice(1)
  } else {
    formatted = '+7'
  }
  if (digits.length > 0) {
    formatted += ' ('
    formatted += digits.slice(0, 3)
    if (digits.length >= 4) formatted += ') '
    if (digits.length > 3) {
      formatted += digits.slice(3, 6)
      if (digits.length >= 7) formatted += '-'
      if (digits.length > 6) formatted += digits.slice(6, 8)
      if (digits.length >= 9) formatted += '-'
      if (digits.length > 8) formatted += digits.slice(8, 10)
    }
  }
  return formatted.slice(0, 18)
}

function onPhoneInput(event) {
  requestForm.value.phone = formatPhone(event.target.value)
}

const requestForm = ref({
  date: '',
  time: '12:00',
  notes: '',
})

function statusLabel(status) {
  const map = {
    available: 'Свободно',
    occupied: 'Занято',
    reserved: 'Забронировано',
    under_renovation: 'На ремонте',
  }
  return map[status] || status
}

function statusClass(status) {
  const map = {
    available: 'status-available',
    occupied: 'status-occupied',
    reserved: 'status-reserved',
    under_renovation: 'status-renovation',
  }
  return map[status] || ''
}

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

async function toggleFavorite() {
  if (!auth.isAuthenticated) {
    alert('Для добавления в избранное необходимо войти в аккаунт')
    return
  }
  try {
    const { data } = await api.post(`/favorites/${route.params.id}/toggle`)
    isFavorite.value = data.favorite
  } catch (err) {
    console.error('Ошибка при переключении избранного', err)
  }
}

async function checkFavoriteStatus() {
  if (!auth.isAuthenticated) return
  try {
    const { data } = await api.get('/favorites')
    isFavorite.value = data.favorites.some(
      (f) => f.rental_object_id === parseInt(route.params.id),
    )
  } catch (err) {
    console.error('Ошибка проверки избранного', err)
  }
}

function openRequestModal() {
  requestForm.value = { date: '', time: '12:00', notes: '' }
  showRequestModal.value = true
}

function closeRequestModal() {
  showRequestModal.value = false
}

async function submitRequest() {
  if (!requestForm.value.date || !requestForm.value.time) {
    alert('Укажите предпочтительную дату и время')
    return
  }
  if (!auth.isAuthenticated) {
    alert('Для отправки заявки необходимо войти в аккаунт')
    return
  }
  try {
    await viewingRequestsApi.create({
      rental_object_id: parseInt(route.params.id),
      preferred_date: requestForm.value.date,
      preferred_time: requestForm.value.time,
      user_notes: requestForm.value.notes,
    })
    showRequestModal.value = false
    successMsg.value = 'Запрос на просмотр отправлен! Менеджер свяжется с вами.'
    requestForm.value = { date: '', time: '12:00', notes: '' }
    setTimeout(() => {
      successMsg.value = ''
    }, 3000)
  } catch (err) {
    console.error(err)
    alert('Ошибка при отправке запроса. Попробуйте позже.')
  }
}

const bcName = computed(() => property.value?.business_centers?.name || '—')
const bcAddress = computed(
  () => property.value?.business_centers?.address || '—',
)
const managerName = computed(() => {
  const p = property.value?.users?.user_profiles
  if (!p) return '—'
  return [p.last_name, p.first_name].filter(Boolean).join(' ') || '—'
})

async function fetchProperty() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await propertiesApi.getPropertyById(route.params.id)
    property.value = data.property
  } catch (err) {
    error.value = 'Помещение не найдено'
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProperty()
  checkFavoriteStatus()
})

watch(property, (newVal) => {
  if (newVal && newVal.business_centers) {
    nextTick(() => {
      initMap()
    })
  }
})
</script>

<template>
  <div class="detail-page">
    <Transition name="fade">
      <div v-if="successMsg" class="toast toast-success">{{ successMsg }}</div>
    </Transition>

    <AppHeader />

    <main class="detail-main">
      <div class="container">
        <router-link
          :to="
            route.query.from === 'favorites' ? '/profile?tab=favorites' : '/'
          "
          class="back-link"
        >
          ←
          {{
            route.query.from === 'favorites'
              ? 'Назад к профилю'
              : 'Назад к каталогу'
          }}
        </router-link>
        <div v-if="loading" class="loading-state">
          <div class="spinner-lg"></div>
          <p>Загрузка...</p>
        </div>

        <div v-else-if="error" class="error-state">
          <span class="error-icon">⚠️</span>
          <p>{{ error }}</p>
          <router-link to="/" class="btn btn-primary"
            >Вернуться к каталогу</router-link
          >
        </div>

        <template v-else-if="property">
          <div class="detail-grid">
            <div class="gallery-section">
              <div class="main-photo">
                <img
                  v-if="property.photos && property.photos.length > 0"
                  :src="property.photos[activeThumb]"
                  alt="Фото помещения"
                  class="main-photo-img"
                />
                <div v-else class="main-photo-placeholder">
                  {{ galleryIcons[activeThumb] }}
                </div>
              </div>
              <div
                class="thumb-list"
                v-if="property.photos && property.photos.length > 1"
              >
                <div
                  v-for="(photo, i) in property.photos"
                  :key="i"
                  class="thumb"
                  :class="{ active: activeThumb === i }"
                  @click="activeThumb = i"
                >
                  <img :src="photo" alt="Миниатюра" class="thumb-img" />
                </div>
              </div>
            </div>

            <div class="info-section">
              <div class="info-card">
                <div class="price">
                  {{ formatPrice(property.price_per_month) }} ₽ / месяц
                </div>
                <div class="address">{{ bcAddress }}, {{ bcName }}</div>

                <div class="specs">
                  <div class="spec-item">
                    <span class="spec-label">Площадь:</span>
                    <span class="spec-value">{{ property.area }} м²</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Статус:</span>
                    <span
                      :class="[
                        'spec-value',
                        'spec-status',
                        statusClass(property.status),
                      ]"
                    >
                      {{ statusLabel(property.status) }}
                    </span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Бизнес-центр:</span>
                    <span class="spec-value">{{ bcName }}</span>
                  </div>
                  <div class="spec-item">
                    <span class="spec-label">Менеджер:</span>
                    <span class="spec-value">{{ managerName }}</span>
                  </div>
                </div>

                <div class="action-buttons">
                  <button
                    class="btn btn-primary action-btn"
                    @click="openRequestModal"
                  >
                    Запрос на просмотр
                  </button>
                  <button
                    class="action-btn"
                    :class="
                      isFavorite ? 'btn-favorite-active' : 'btn-secondary'
                    "
                    @click="toggleFavorite"
                  >
                    {{ isFavorite ? '❤️ В избранном' : '🤍 В избранное' }}
                  </button>
                </div>
              </div>

              <div class="map-card">
                <div ref="mapContainer" class="map-container-detail"></div>
              </div>
            </div>
          </div>

          <div class="description-card">
            <h3>Описание</h3>
            <p>
              {{ property.title }} — помещение площадью {{ property.area }} м² в
              бизнес-центре «{{ bcName }}». Адрес: {{ bcAddress }}.
            </p>
            <p class="desc-features">
              Коммуникации: интернет, центральное кондиционирование, охрана,
              видеонаблюдение.
            </p>
          </div>
        </template>
      </div>
    </main>

    <AppFooter />

    <Transition name="fade">
      <div
        v-if="showRequestModal"
        class="modal-overlay"
        @click.self="closeRequestModal"
      >
        <div class="modal-content">
          <h3>Запрос на просмотр</h3>
          <div class="modal-form-group">
            <label>Предпочтительная дата</label>
            <input v-model="requestForm.date" type="date" required />
          </div>
          <div class="modal-form-group">
            <label>Предпочтительное время</label>
            <input
              v-model="requestForm.time"
              type="time"
              step="1200"
              required
            />
          </div>
          <div class="modal-form-group">
            <label>Заметки (необязательно)</label>
            <textarea
              v-model="requestForm.notes"
              rows="3"
              placeholder="Например: Буду со своим риелтором"
            ></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-outline" @click="closeRequestModal">
              Отмена
            </button>
            <button class="btn btn-primary" @click="submitRequest">
              Отправить
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background: var(--color-bg);
}
.detail-main {
  padding: 32px 0 0;
}
.back-link {
  display: inline-block;
  margin-bottom: 24px;
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
  transition: var(--transition);
}
.back-link:hover {
  text-decoration: underline;
}
.detail-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 32px;
}
.gallery-section {
  flex: 2;
  min-width: 280px;
}
.info-section {
  flex: 1.2;
  min-width: 280px;
}
.main-photo {
  width: 100%;
  height: 400px;
  background: var(--color-tertiary);
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  color: white;
  margin-bottom: 16px;
  transition: var(--transition);
  overflow: hidden;
}
.main-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.main-photo-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  background: var(--color-tertiary);
  color: white;
}
.thumb-list {
  display: flex;
  gap: 12px;
}
.thumb {
  width: 80px;
  height: 80px;
  background: var(--color-tertiary);
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: var(--transition);
  border: 3px solid transparent;
  overflow: hidden;
}
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb.active {
  border-color: var(--color-primary);
  background: #c8b897;
}
.thumb:hover:not(.active) {
  transform: scale(1.05);
}
.info-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 24px;
  margin-bottom: 24px;
}
.price {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 12px;
}
.address {
  color: var(--color-text-secondary);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 20px 0;
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
.spec-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.spec-label {
  color: var(--color-text-secondary);
  font-size: 14px;
}
.spec-value {
  font-weight: 500;
  font-size: 14px;
  text-align: right;
}
.spec-status {
  padding: 2px 10px;
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
.action-buttons {
  display: flex;
  gap: 16px;
  margin: 24px 0 0;
}
.action-btn {
  flex: 1;
  padding: 14px 20px;
  font-size: 15px;
  border-radius: 15px;
}
.btn-favorite-active {
  background: var(--color-primary-light);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
}
.map-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
}
.map-placeholder-detail {
  height: 220px;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.map-placeholder-detail span {
  font-size: 40px;
}
.map-placeholder-detail p {
  color: var(--color-text-secondary);
  font-size: 14px;
  font-weight: 500;
  text-align: center;
  padding: 0 16px;
}
.description-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  padding: 24px;
  margin-top: 32px;
}
.description-card h3 {
  color: var(--color-primary);
  margin-bottom: 16px;
  font-size: 20px;
}
.description-card p {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 8px;
}
.desc-features {
  margin-top: 12px;
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
  max-width: 450px;
  width: 90%;
  border-radius: var(--radius-xl);
  padding: 28px;
}
.modal-content h3 {
  color: var(--color-primary);
  margin-bottom: 20px;
  font-size: 20px;
}
.modal-form-group {
  margin-bottom: 16px;
}
.modal-form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--color-text);
}
.modal-form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  transition: var(--transition);
}
.modal-form-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(45, 134, 128, 0.1);
}

.modal-form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  transition: var(--transition);
}
.modal-form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(45, 134, 128, 0.1);
}
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
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
.loading-state,
.error-state {
  text-align: center;
  padding: 80px 24px;
  color: var(--color-text-secondary);
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
.error-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.map-container-detail {
  height: 220px;
  width: 100%;
  border-radius: 12px;
  z-index: 1;
}

@media (max-width: 900px) {
  .detail-grid {
    flex-direction: column;
  }
  .action-buttons {
    flex-direction: column;
  }
  .main-photo {
    height: 280px;
  }
  .specs {
    grid-template-columns: 1fr;
  }
}
</style>
