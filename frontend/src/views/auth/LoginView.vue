<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const errorMsg = ref('')
const isLoading = ref(false)

const showGosuslugiModal = ref(false)

async function handleLogin() {
  errorMsg.value = ''
  if (!email.value || !password.value) {
    errorMsg.value = 'Введите email и пароль'
    return
  }

  isLoading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/profile')
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Неверный email или пароль'
  } finally {
    isLoading.value = false
  }
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

function openGosuslugiModal() {
  showGosuslugiModal.value = true
}

function closeGosuslugiModal() {
  showGosuslugiModal.value = false
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-container">
      <div class="auth-illustration">
        <router-link to="/" class="logo">
          <span class="logo-icon">🏢</span>
          <span class="logo-text">Аренда+</span>
        </router-link>
        <div class="illustration-text">
          <h2>Добро пожаловать!</h2>
          <p>
            Удобный сервис для аренды помещений в бизнес-центрах вашего города
          </p>
        </div>
        <div class="features">
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>Проверенные бизнес-центры</span>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>Полный контроль аренды</span>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>Бесплатные заявки на просмотр</span>
          </div>
        </div>
      </div>

      <div class="auth-form-wrapper">
        <div class="form-header">
          <h1>Вход в аккаунт</h1>
          <p>Введите email и пароль</p>
        </div>

        <form class="auth-form" @submit.prevent="handleLogin">
          <div v-if="errorMsg" class="error-message">
            {{ errorMsg }}
          </div>

          <div class="form-group">
            <label for="login-email">Email</label>
            <div class="input-wrapper">
              <input
                id="login-email"
                v-model="email"
                type="email"
                placeholder="email@example.com"
                required
                autocomplete="email"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="login-password">Пароль</label>
            <div class="input-wrapper">
              <input
                id="login-password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                required
                autocomplete="current-password"
              />
              <button
                type="button"
                class="toggle-password"
                @click="togglePassword"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <button
            type="submit"
            class="btn btn-primary btn-full btn-login"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner"></span>
            {{ isLoading ? 'Вход...' : 'Войти' }}
          </button>

          <div class="divider"><span>или</span></div>

          <button
            type="button"
            class="btn btn-secondary btn-full"
            @click="openGosuslugiModal"
          >
            Продолжить через Госуслуги
          </button>
        </form>

        <div class="auth-switch">
          <p>
            Нет аккаунта?
            <router-link to="/register" class="link"
              >Зарегистрироваться</router-link
            >
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="showGosuslugiModal"
      class="modal-overlay"
      @click.self="closeGosuslugiModal"
    >
      <div class="modal-content">
        <h3>Вход через Госуслуги</h3>
        <p class="modal-message">Функция будет добавлена в будущем</p>
        <div class="modal-actions">
          <button class="btn btn-primary" @click="closeGosuslugiModal">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--color-bg);
}

.auth-container {
  max-width: 1200px;
  width: 100%;
  background: var(--color-white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  display: flex;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.auth-illustration {
  flex: 1;
  background: var(--color-bg-warm);
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-right: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 48px;
  font-size: 26px;
  font-weight: 700;
  color: var(--color-primary);
}

.logo-icon {
  font-size: 40px;
}

.illustration-text h2 {
  font-size: 32px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
}

.illustration-text p {
  font-size: 16px;
  line-height: 1.5;
  color: var(--color-text-secondary);
  margin-bottom: 40px;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 20px;
}

.feature {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 16px;
  color: var(--color-text);
}

.feature-icon {
  width: 32px;
  height: 32px;
  background: var(--color-primary-light);
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.auth-form-wrapper {
  flex: 1;
  padding: 48px;
  background: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-header {
  text-align: center;
  margin-bottom: 32px;
}

.form-header h1 {
  font-size: 28px;
  color: var(--color-primary);
  margin-bottom: 8px;
}

.form-header p {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.auth-form {
  max-width: 400px;
  margin: 0 auto;
  width: 100%;
}

.error-message {
  background: #fff0f0;
  border: 1px solid #ffcdd2;
  color: #c62828;
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  font-size: 14px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
}

.checkbox-label input[type='checkbox'] {
  accent-color: var(--color-primary);
  width: 16px;
  height: 16px;
}

.forgot-link {
  color: var(--color-primary);
  font-weight: 500;
  transition: var(--transition);
  text-decoration: none;
}

.forgot-link:hover {
  text-decoration: underline;
}

.btn-login {
  padding: 14px;
  font-size: 16px;
  margin-bottom: 24px;
}

.auth-switch {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--color-border);
}

.link {
  color: var(--color-primary);
  font-weight: 600;
  transition: var(--transition);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
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
  max-width: 400px;
  width: 90%;
  border-radius: var(--radius-lg);
  padding: 28px;
  text-align: center;
}

.modal-content h3 {
  color: var(--color-primary);
  margin-bottom: 16px;
  font-size: 20px;
}

.modal-message {
  color: var(--color-text-secondary);
  font-size: 16px;
  margin-bottom: 24px;
}

.modal-actions {
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .auth-container {
    flex-direction: column;
  }
  .auth-illustration {
    display: none;
  }
  .auth-form-wrapper {
    padding: 32px 24px;
  }
}
</style>
