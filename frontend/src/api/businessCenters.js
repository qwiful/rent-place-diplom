import api from './index'

export const businessCentersApi = {
  getAll() {
    return api.get('/business-centers')
  },

  getBusinessCenters(params) {
    return api.get('/business-centers', { params })
  },

  getBusinessCenterById(id) {
    return api.get(`/business-centers/${id}`)
  },

  createBusinessCenter(data) {
    return api.post('/business-centers', data)
  },

  updateBusinessCenter(id, data) {
    return api.put(`/business-centers/${id}`, data)
  },

  deleteBusinessCenter(id) {
    return api.delete(`/business-centers/${id}`)
  },

  getCenterProperties(id) {
    return api.get(`/business-centers/${id}/properties`)
  },
}
