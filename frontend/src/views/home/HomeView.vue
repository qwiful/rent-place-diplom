<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { propertiesApi } from '@/api/properties'
import { businessCentersApi } from '@/api/businessCenters'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import api from '@/api'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const router = useRouter()
const auth = useAuthStore()

const properties = ref([])
const loading = ref(true)
const error = ref('')

const filters = ref({
  minArea: '',
  maxPrice: '',
  status: '',
  business_center_id: '',
})

const allBusinessCenters = ref([])
const selectedBusinessCenterId = ref('')
const isAuth = computed(() => auth.isAuthenticated)
const isManagerOrAdmin = computed(() => {
  const role = auth.userRole
  return role === 'manager' || role === 'admin'
})

const mapContainer = ref(null)
let map = null
let markersLayer = null

function getBusinessCenterCoordinates(bc) {
  const coordsMap = {
    'БЦ "Альфа Плаза"': [57.626, 39.891],
    'БЦ "Бета Тауэр"': [57.63, 39.88],
    'БЦ Центральный': [55.751, 37.618],
    'БЦ Северный': [59.939, 30.315],
    'БЦ "Москва-Сити"': [55.747, 37.538],
    'БЦ "Омега Плаза"': [55.792, 37.556],
  }
  return coordsMap[bc.name] || [57.626, 39.891]
}

function formatPrice(price) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

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

function getCardIcon(index) {
  const icons = ['🏢', '🏗️', '🏬', '🏛️']
  return icons[index % icons.length]
}

async function loadAllBusinessCenters() {
  try {
    const { data } = await businessCentersApi.getAll()
    allBusinessCenters.value = data.businessCenters || []
  } catch (err) {
    console.error('Ошибка загрузки БЦ', err)
  }
}

async function fetchProperties() {
  loading.value = true
  error.value = ''
  try {
    const params = {}
    if (filters.value.minArea)
      params.minArea = parseFloat(filters.value.minArea)
    if (filters.value.maxPrice)
      params.maxPrice = parseFloat(filters.value.maxPrice)
    if (selectedBusinessCenterId.value) {
      params.business_center_id = selectedBusinessCenterId.value
    }

    if (isManagerOrAdmin.value) {
      if (filters.value.status) params.status = filters.value.status
    } else {
      params.status = 'available'
    }

    const { data } = await propertiesApi.getProperties(params)
    properties.value = data.properties || []
  } catch (err) {
    error.value = 'Не удалось загрузить список помещений'
    console.error(err)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  fetchProperties()
}

function resetFilters() {
  filters.value = {
    minArea: '',
    maxPrice: '',
    status: '',
    business_center_id: '',
  }
  selectedBusinessCenterId.value = ''
  fetchProperties()
}

const bcStats = computed(() => {
  const map = new Map()
  properties.value.forEach((p) => {
    if (p.business_centers) {
      const bc = p.business_centers
      if (!map.has(bc.id)) {
        map.set(bc.id, { name: bc.name, address: bc.address, count: 0 })
      }
      map.get(bc.id).count++
    }
  })
  return Array.from(map.values())
})

function initMap() {
  if (!mapContainer.value) return
  map = L.map(mapContainer.value).setView([57.626, 39.891], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '',
    maxZoom: 19,
  }).addTo(map)
  markersLayer = L.layerGroup().addTo(map)
}

function updateMarkers() {
  if (!markersLayer) return
  markersLayer.clearLayers()
  const bcMap = new Map()
  properties.value.forEach((prop) => {
    if (prop.business_centers) {
      const bc = prop.business_centers
      if (!bcMap.has(bc.id)) {
        bcMap.set(bc.id, { ...bc, count: 0 })
      }
      bcMap.get(bc.id).count++
    }
  })
  bcMap.forEach((bc) => {
    const coords = getBusinessCenterCoordinates(bc)
    const marker = L.marker(coords).addTo(markersLayer)
    marker.bindPopup(`
      <b>${bc.name}</b><br>
      ${bc.address}<br>
      Свободно помещений: ${bc.count}
    `)
  })
}

watch(properties, () => {
  updateMarkers()
})

onMounted(async () => {
  await loadAllBusinessCenters()
  await fetchProperties()
  nextTick(() => {
    initMap()
    updateMarkers()
  })
})
</script>

<template>
  <div class="home-page">
    <AppHeader />

    <main class="main">
      <div class="container">
        <div class="hero">
          <h1>Аренда помещений в бизнес-центрах</h1>
          <p>Найдите идеальное пространство для вашего бизнеса</p>
        </div>

        <div class="filters">
          <div class="filter-row">
            <div class="filter-group">
              <label>Бизнес-центр</label>
              <select v-model="selectedBusinessCenterId">
                <option value="">Все БЦ</option>
                <option
                  v-for="bc in allBusinessCenters"
                  :key="bc.id"
                  :value="bc.id"
                >
                  {{ bc.name }}
                </option>
              </select>
            </div>
            <div v-if="isManagerOrAdmin" class="filter-group">
              <label>Статус</label>
              <select v-model="filters.status">
                <option value="">Любой</option>
                <option value="available">Свободно</option>
                <option value="reserved">Забронировано</option>
                <option value="occupied">Занято</option>
                <option value="under_renovation">На ремонте</option>
              </select>
            </div>
            <div class="filter-group">
              <label>Площадь, м² (от)</label>
              <input
                v-model.number="filters.minArea"
                type="number"
                placeholder="от"
              />
            </div>
            <div class="filter-group">
              <label>Цена, ₽/мес (до)</label>
              <input
                v-model.number="filters.maxPrice"
                type="number"
                placeholder="до"
              />
            </div>
            <div class="filter-buttons">
              <button class="search-btn" @click="applyFilters">Найти</button>
              <button class="reset-btn" @click="resetFilters">Сбросить</button>
            </div>
          </div>
        </div>

        <div class="content-grid">
          <!-- Каталог карточек -->
          <div class="catalog">
            <div v-if="loading" class="loading-state">
              <div class="spinner-lg"></div>
              <p>Загрузка помещений...</p>
            </div>
            <div v-else-if="error" class="error-state">
              <span class="error-icon">⚠️</span>
              <p>{{ error }}</p>
              <button class="btn btn-primary" @click="fetchProperties">
                Повторить
              </button>
            </div>
            <div v-else-if="properties.length === 0" class="empty-state">
              <span class="empty-icon">🏢</span>
              <p>Помещений не найдено</p>
              <small>Попробуйте изменить параметры поиска</small>
            </div>
            <div v-else class="cards-grid">
              <router-link
                v-for="(prop, index) in properties"
                :key="prop.id"
                :to="`/properties/${prop.id}`"
                class="rental-card"
              >
                <div class="card-img">
                  <img
                    v-if="prop.photos && prop.photos.length > 0"
                    :src="prop.photos[0]"
                    class="card-image"
                  />
                  <div v-else class="no-image-placeholder">
                    {{ getCardIcon(index) }}
                  </div>
                </div>
                <div class="card-body">
                  <div class="card-title">{{ prop.title }}</div>
                  <div class="card-address">
                    {{ prop.business_centers?.address || 'Адрес не указан' }}
                  </div>
                  <div class="card-bc" v-if="prop.business_centers">
                    {{ prop.business_centers.name }}
                  </div>
                  <div class="card-price">
                    {{ formatPrice(prop.price_per_month) }} ₽ / мес
                  </div>
                  <div class="card-meta">
                    <span :class="['card-status', statusClass(prop.status)]">{{
                      statusLabel(prop.status)
                    }}</span>
                    <span class="card-area">{{ prop.area }} м²</span>
                  </div>
                  <div class="card-footer">
                    <span class="details-link">Подробнее →</span>
                  </div>
                </div>
              </router-link>
            </div>
          </div>

          <div class="map-sidebar">
            <div ref="mapContainer" class="map-container"></div>
            <div class="map-info">
              <div v-for="bc in bcStats" :key="bc.name" class="bc-item">
                <p>
                  <strong>{{ bc.name }}</strong> — {{ bc.count }}
                  {{ bc.count === 1 ? 'помещение' : 'помещений' }}
                </p>
                <small>{{ bc.address }}</small>
              </div>
              <p v-if="bcStats.length === 0" class="no-bc">
                Нет данных о бизнес-центрах
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <AppFooter />
  </div>
</template>

<style scoped>
.map-container {
  height: 250px;
  width: 100%;
  border-radius: 12px;
  margin-bottom: 12px;
  z-index: 1;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-end;
}
.filter-group {
  flex: 1 1 180px;
  min-width: 140px;
}
.filter-group select,
.filter-group input {
  width: 100%;
  box-sizing: border-box;
}

.map-container {
  height: 250px;
  width: 100%;
}
.favorite-icon {
  cursor: pointer;
  color: #ccc;
  transition: 0.1s;
}
.favorite-icon.favorite-active {
  color: #ff4d4d;
}

.home-page {
  min-height: 100vh;
  background: var(--color-bg);
}

.hero {
  text-align: center;
  margin-bottom: 32px;
  padding-top: 8px;
}

.hero h1 {
  font-size: 36px;
  color: var(--color-primary);
  margin-bottom: 12px;
}

.hero p {
  color: var(--color-text-secondary);
  font-size: 18px;
}

.filters {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 32px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.filter-group {
  flex: 1;
  min-width: 160px;
}

.filter-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 6px;
}

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-white);
  font-size: 14px;
  font-family: inherit;
  transition: var(--transition);
  color: var(--color-text);
}

.filter-group select:focus,
.filter-group input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(45, 134, 128, 0.1);
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.search-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 12px 28px;
  border-radius: var(--radius-pill);
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: var(--transition);
  font-family: inherit;
}

.search-btn:hover {
  background: var(--color-primary-hover);
}

.reset-btn {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: 12px 20px;
  border-radius: var(--radius-pill);
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  transition: var(--transition);
}

.reset-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.content-grid {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.catalog {
  flex: 2;
  min-width: 280px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.rental-card {
  background: var(--color-white);
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  text-decoration: none;
  color: inherit;
  display: block;
}

.rental-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
}

.card-img {
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  color: white;
}

.card-img-0 {
  background: var(--color-tertiary);
}
.card-img-1 {
  background: #c4a882;
}
.card-img-2 {
  background: #b8c9a0;
}
.card-img-3 {
  background: #a8b8c8;
}

.card-body {
  padding: 20px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.no-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  background: var(--color-tertiary);
  color: white;
}

.favorite-icon {
  font-size: 20px;
  cursor: pointer;
  color: var(--color-secondary);
  transition: 0.1s;
  flex-shrink: 0;
}

.favorite-icon:hover {
  transform: scale(1.15);
}

.card-address {
  color: var(--color-text-secondary);
  font-size: 13px;
  margin-bottom: 4px;
}

.card-bc {
  color: var(--color-text-secondary);
  font-size: 13px;
  margin-bottom: 12px;
}

.card-price {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-primary);
  margin: 8px 0;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.card-status {
  display: inline-block;
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 600;
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

.card-area {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.card-footer {
  margin-top: 12px;
}

.details-link {
  color: var(--color-primary);
  font-weight: 500;
  font-size: 14px;
}

.map-sidebar {
  flex: 1;
  min-width: 300px;
  background: var(--color-white);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  overflow: hidden;
  align-self: start;
  position: sticky;
  top: 100px;
}

.map-placeholder {
  height: 250px;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.map-placeholder span {
  font-size: 48px;
}

.map-placeholder p {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.map-info {
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-bg-warm);
}

.bc-item {
  margin-bottom: 12px;
}

.bc-item p {
  font-size: 14px;
  color: var(--color-text-secondary);
  margin-bottom: 2px;
}

.bc-item strong {
  color: var(--color-primary);
}

.bc-item small {
  font-size: 12px;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.no-bc {
  font-size: 14px;
  color: var(--color-text-secondary);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 60px 24px;
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

.error-icon,
.empty-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 16px;
}

.error-state p,
.empty-state p {
  font-size: 16px;
  margin-bottom: 8px;
}

.error-state .btn {
  margin-top: 12px;
}

.empty-state small {
  font-size: 13px;
  opacity: 0.7;
}

.main {
  padding: 32px 0 0;
}

@media (max-width: 900px) {
  .content-grid {
    flex-direction: column;
  }
  .map-sidebar {
    position: static;
  }
  .filter-row {
    flex-direction: column;
  }
  .search-btn {
    width: 100%;
  }
  .hero h1 {
    font-size: 28px;
  }
  .cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
