<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const form = ref({
  last_name: '',
  first_name: '',
  middle_name: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  accountType: 'tenant',
})

const showPassword = ref(false)
const errorMsg = ref('')
const isLoading = ref(false)
const agreeTerms = ref(false)

const showGosuslugiModal = ref(false)

function formatPhone(value) {
  let digits = value.replace(/\D/g, '')
  if (digits.length === 0) return ''

  if (digits.startsWith('8')) {
    digits = '7' + digits.slice(1)
  }
  if (!digits.startsWith('7')) {
    digits = '7' + digits
  }
  digits = digits.slice(0, 11)

  let formatted = '+7'
  if (digits.length > 1) {
    const rest = digits.slice(1)
    if (rest.length > 0) {
      formatted += ' (' + rest.slice(0, 3)
      if (rest.length >= 4) formatted += ') ' + rest.slice(3, 6)
      if (rest.length >= 7) formatted += '-' + rest.slice(6, 8)
      if (rest.length >= 9) formatted += '-' + rest.slice(8, 10)
    }
  }
  return formatted
}

function onPhoneInput(event) {
  const digits = event.target.value.replace(/\D/g, '')
  form.value.phone = formatPhone(digits)
}

async function handleRegister() {
  errorMsg.value = ''

  if (!form.value.last_name || !form.value.first_name) {
    errorMsg.value = 'Фамилия и имя обязательны'
    return
  }
  if (!form.value.email) {
    errorMsg.value = 'Email обязателен'
    return
  }
  const rawDigits = form.value.phone.replace(/\D/g, '')
  if (rawDigits.length !== 11) {
    errorMsg.value = 'Введите корректный номер телефона (10 цифр после +7)'
    return
  }
  if (form.value.password.length < 6) {
    errorMsg.value = 'Пароль должен быть не менее 6 символов'
    return
  }
  if (form.value.password !== form.value.passwordConfirm) {
    errorMsg.value = 'Пароли не совпадают'
    return
  }
  if (!agreeTerms.value) {
    errorMsg.value = 'Необходимо принять условия'
    return
  }

  let normalizedPhone = rawDigits
  if (normalizedPhone.startsWith('8')) {
    normalizedPhone = '+7' + normalizedPhone.slice(1)
  } else if (normalizedPhone.startsWith('7')) {
    normalizedPhone = '+7' + normalizedPhone.slice(1)
  } else {
    normalizedPhone = '+7' + normalizedPhone
  }

  isLoading.value = true
  try {
    await auth.register({
      email: form.value.email,
      password: form.value.password,
      phone: normalizedPhone,
      first_name: form.value.first_name,
      last_name: form.value.last_name,
      middle_name: form.value.middle_name || undefined,
      role: form.value.accountType,
    })
    router.push('/profile')
  } catch (err) {
    errorMsg.value = err.response?.data?.error || 'Ошибка при регистрации'
  } finally {
    isLoading.value = false
  }
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
          <h2>Присоединяйтесь!</h2>
          <p>Создайте аккаунт и получите доступ к лучшим предложениям аренды</p>
        </div>
        <div class="features">
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>Онлайн-заявки на просмотр</span>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>История договоров и заявок</span>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>Отчёты для менеджеров</span>
          </div>
        </div>
      </div>

      <div class="auth-form-wrapper register-wrapper">
        <div class="form-header">
          <h1>Регистрация</h1>
          <p>Заполните форму для создания аккаунта</p>
        </div>

        <form class="auth-form register-form" @submit.prevent="handleRegister">
          <div v-if="errorMsg" class="error-message">
            {{ errorMsg }}
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="reg-lastname">Фамилия</label>
              <div class="input-wrapper">
                <input
                  id="reg-lastname"
                  v-model="form.last_name"
                  type="text"
                  class="input-no-icon"
                  placeholder="Иванов"
                  required
                />
              </div>
            </div>
            <div class="form-group">
              <label for="reg-firstname">Имя</label>
              <div class="input-wrapper">
                <input
                  id="reg-firstname"
                  v-model="form.first_name"
                  type="text"
                  class="input-no-icon"
                  placeholder="Иван"
                  required
                />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label for="reg-middlename">Отчество</label>
            <div class="input-wrapper">
              <input
                id="reg-middlename"
                v-model="form.middle_name"
                type="text"
                class="input-no-icon"
                placeholder="Иванович"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="reg-email">Email</label>
            <div class="input-wrapper">
              <input
                id="reg-email"
                v-model="form.email"
                type="email"
                placeholder="email@example.com"
                required
                autocomplete="email"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="reg-phone">Телефон</label>
            <div class="input-wrapper">
              <input
                id="reg-phone"
                :value="form.phone"
                @input="onPhoneInput"
                type="tel"
                placeholder="+7 (999) 123-45-67"
                maxlength="18"
                required
              />
            </div>
          </div>

          <div class="form-group">
            <label>Тип аккаунта</label>
            <div class="account-type">
              <label class="account-option">
                <input type="radio" value="tenant" v-model="form.accountType" />
                <div class="option-card">
                  <strong>Арендатор</strong>
                  <small>Ищу помещение для аренды</small>
                </div>
              </label>
              <label class="account-option">
                <input
                  type="radio"
                  value="landlord"
                  v-model="form.accountType"
                />
                <div class="option-card">
                  <strong>Арендодатель</strong>
                  <small>Сдаю помещения в аренду</small>
                </div>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="reg-password">Пароль</label>
            <div class="input-wrapper">
              <input
                id="reg-password"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="Придумайте пароль"
                required
                autocomplete="new-password"
              />
              <button
                type="button"
                class="toggle-password"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="reg-password2">Подтверждение пароля</label>
            <div class="input-wrapper">
              <input
                id="reg-password2"
                v-model="form.passwordConfirm"
                type="password"
                placeholder="Повторите пароль"
                required
                autocomplete="new-password"
              />
            </div>
          </div>

          <label class="checkbox-label terms-checkbox">
            <input v-model="agreeTerms" type="checkbox" />
            <span
              >Я согласен с <a href="#" class="link">условиями</a> и
              <a href="#" class="link">политикой</a></span
            >
          </label>

          <button
            type="submit"
            class="btn btn-primary btn-full btn-register"
            :disabled="isLoading"
          >
            <span v-if="isLoading" class="spinner"></span>
            {{ isLoading ? 'Регистрация...' : 'Зарегистрироваться' }}
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
            Уже есть аккаунт?
            <router-link to="/login" class="link">Войти</router-link>
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
.account-type {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 8px;
}
.account-option {
  cursor: pointer;
}
.account-option input[type='radio'] {
  display: none;
}
.account-option input[type='radio']:checked + .option-card {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
.option-card {
  padding: 16px;
  border: 2px solid var(--color-border);
  border-radius: 16px;
  text-align: center;
  transition: all 0.2s;
}
.option-card span:first-child {
  font-size: 16px;
  display: block;
  margin-bottom: 8px;
}
.option-card strong {
  display: block;
  margin-bottom: 4px;
  color: var(--color-text);
}
.option-card small {
  font-size: 12px;
  color: var(--color-text-secondary);
}

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
  color: var(--color-text-secondary);
  margin-bottom: 40px;
  line-height: 1.4;
}
.features {
  display: flex;
  flex-direction: column;
  gap: 18px;
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
.register-wrapper {
  max-height: 95vh;
  overflow-y: auto;
}
.auth-form-wrapper {
  flex: 1;
  padding: 48px;
  background: white;
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
.register-form {
  max-width: 500px;
  margin: 0 auto;
  width: 100%;
}
.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.checkbox-label input[type='checkbox'] {
  accent-color: var(--color-primary);
  width: 16px;
  height: 16px;
}
.terms-checkbox {
  margin: 20px 0 24px;
}
.terms-checkbox .link {
  color: var(--color-primary);
  font-weight: 500;
}
.btn-register {
  padding: 14px;
  font-size: 16px;
  margin-bottom: 20px;
}
.auth-switch {
  text-align: center;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}
.link {
  color: var(--color-primary);
  font-weight: 600;
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
    padding: 32px 20px;
  }
  .form-row {
    grid-template-columns: 1fr;
  }
  .account-type {
    grid-template-columns: 1fr;
  }
}
</style>
