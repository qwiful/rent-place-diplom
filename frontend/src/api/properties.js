import api from './index'

export const propertiesApi = {
  getProperties(params = {}) {
    return api.get('/properties', { params })
  },

  getPropertyById(id) {
    return api.get(`/properties/${id}`)
  },

  getAvailableProperties(params = {}) {
    return api.get('/properties', { params: { ...params, status: 'available' } })
  },
}
