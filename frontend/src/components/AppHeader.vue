<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationsStore } from '@/stores/notifications'

const auth = useAuthStore()
const notifStore = useNotificationsStore()
const isLoggedIn = computed(() => auth.isAuthenticated)
const isOpen = ref(false)

let interval = null

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
  if (isOpen.value && auth.isAuthenticated && !notifStore.items.length) {
    notifStore.fetch()
  }
}

const closeDropdown = () => {
  isOpen.value = false
}

const handleClickOutside = (event) => {
  const dropdown = document.querySelector('.notification-dropdown')
  if (dropdown && !dropdown.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  if (auth.isAuthenticated) {
    notifStore.fetch()
  }
  document.addEventListener('click', handleClickOutside)
  if (auth.isAuthenticated) {
    interval = setInterval(() => {
      if (auth.isAuthenticated && !isOpen.value) {
        notifStore.fetch()
      }
    }, 30000)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  if (interval) {
    clearInterval(interval)
  }
})
</script>

<template>
  <header class="app-header">
    <div class="container">
      <div class="header-content">
        <router-link to="/" class="logo">
          <span class="logo-text">Аренда+</span>
        </router-link>

        <nav class="nav">
          <template v-if="isLoggedIn && auth.userRole === 'admin'">
            <router-link to="/admin" class="nav-link">Админ-панель</router-link>
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

          <template v-if="isLoggedIn">
            <router-link to="/profile" class="nav-link btn-auth"
              >Профиль</router-link
            >
          </template>
          <template v-else>
            <router-link to="/login" class="nav-link btn-auth"
              >Вход</router-link
            >
          </template>

          <div v-if="isLoggedIn" class="notification-dropdown">
            <button class="notif-btn" @click.stop="toggleDropdown">
              🔔
              <span v-if="notifStore.unreadCount" class="notif-badge">{{
                notifStore.unreadCount
              }}</span>
            </button>

            <div v-if="isOpen" class="dropdown">
              <div class="dropdown-header">Уведомления</div>
              <div class="dropdown-list">
                <div
                  v-for="n in notifStore.items"
                  :key="n.id"
                  :class="['notif-item', { unread: n.status === 'unread' }]"
                >
                  <div class="notif-title">{{ n.title }}</div>
                  <div class="notif-message">{{ n.message }}</div>
                  <div class="notif-time">
                    {{ new Date(n.created_at).toLocaleString() }}
                  </div>
                </div>
                <div v-if="!notifStore.items.length" class="empty">
                  Нет уведомлений
                </div>
              </div>
              <div v-if="notifStore.unreadCount" class="dropdown-footer">
                <button @click="notifStore.markAllRead">Прочитать все</button>
              </div>
            </div>
          </div>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background: var(--color-white);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
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

.logo-icon {
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

.nav-link {
  text-decoration: none;
  color: var(--color-text);
  font-weight: 500;
  transition: var(--transition);
}
.nav-link:hover {
  color: var(--color-primary);
}

.btn-auth {
  background: var(--color-primary);
  color: var(--color-white) !important;
  padding: 8px 20px;
  border-radius: var(--radius-pill);
  transition: var(--transition);
}
.btn-auth:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

/* ===== Уведомления ===== */
.notification-dropdown {
  position: relative;
  display: inline-block;
}
.notif-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  position: relative;
}
.notif-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #d18875;
  color: white;
  border-radius: 10px;
  padding: 0 5px;
  font-size: 11px;
}
.dropdown {
  position: absolute;
  right: 0;
  top: 35px;
  width: 300px;
  background: white;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}
.dropdown-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  font-weight: bold;
}
.dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}
.notif-item {
  padding: 8px 12px;
  border-bottom: 1px solid #eee;
}
.notif-item.unread {
  background: #f0f7f5;
}
.notif-title {
  font-weight: 500;
  font-size: 14px;
}
.notif-message {
  font-size: 12px;
  color: #666;
}
.notif-time {
  font-size: 10px;
  color: #999;
  margin-top: 4px;
}
.empty {
  padding: 12px;
  text-align: center;
  color: #999;
}
.dropdown-footer {
  padding: 8px;
  border-top: 1px solid var(--color-border);
  text-align: center;
}
.dropdown-footer button {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
}
</style>
