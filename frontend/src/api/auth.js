import api from './index'

export const authApi = {
  login(email, password) {
    return api.post('/auth/login', { email, password })
  },

  register(data) {
    return api.post('/auth/register', data)
  },

  getMe() {
    return api.get('/auth/me')
  },

  logout() {
    return api.post('/auth/logout')
  },

  refreshToken(refreshToken) {
    return api.post('/auth/refresh', { refreshToken })
  },
}

export const usersApi = {
  getUserProfile() {
    return api.get('/users/profile')
  },

  updateUserProfile(data) {
    return api.put('/users/profile', data)
  },
}
