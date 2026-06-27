import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi, usersApi } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const profile = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const isAuthenticated = computed(() => !!user.value)
  const userRole = computed(() => user.value?.roles?.name || null)
  const fullName = computed(() => {
    if (!profile.value) return ''
    return [
      profile.value.last_name,
      profile.value.first_name,
      profile.value.middle_name,
    ]
      .filter(Boolean)
      .join(' ')
  })
  const initials = computed(() => {
    if (!profile.value) return '?'
    const f = profile.value.first_name?.[0] || ''
    const l = profile.value.last_name?.[0] || ''
    return (l + f).toUpperCase() || '?'
  })

  async function login(email, password) {
    loading.value = true
    error.value = null
    try {
      const { data } = await authApi.login(email, password)
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
      user.value = data.user
      profile.value = data.user.user_profiles || null
      return data
    } catch (err) {
      error.value = err.response?.data?.error || 'Ошибка при входе'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function register(formData) {
    loading.value = true
    error.value = null
    try {
      const { data } = await authApi.register(formData)
      localStorage.setItem('accessToken', data.accessToken)
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken)
      }
      user.value = data.user
      profile.value = data.user.user_profiles || null
      return data
    } catch (err) {
      error.value = err.response?.data?.error || 'Ошибка при регистрации'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    try {
      const { data } = await authApi.getMe()
      user.value = data.user
      profile.value = data.user.user_profiles || null
    } catch {
      user.value = null
      profile.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  async function updateProfile(profileData) {
    loading.value = true
    error.value = null
    try {
      const { data } = await usersApi.updateUserProfile(profileData)
      if (data.profile) {
        profile.value = data.profile
      }
      if (data.user) {
        user.value = { ...user.value, ...data.user }
      }
      return data
    } catch (err) {
      error.value = err.response?.data?.error || 'Ошибка при обновлении профиля'
      throw err
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    profile.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  async function init() {
    const token = localStorage.getItem('accessToken')
    if (token) {
      await fetchUser()
    }
  }

  return {
    user,
    profile,
    loading,
    error,
    isAuthenticated,
    userRole,
    fullName,
    initials,
    login,
    register,
    fetchUser,
    updateProfile,
    logout,
    init,
  }
})
