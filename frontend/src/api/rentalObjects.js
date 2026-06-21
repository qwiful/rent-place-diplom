import api from './index'

export const rentalObjectsApi = {
  getRentalObjects(params) {
    return api.get('/rental-objects', { params })
  },
  getRentalObjectById(id) {
    return api.get(`/rental-objects/${id}`)
  },
  createRentalObject(data) {
    return api.post('/rental-objects', data)
  },
  updateRentalObject(id, data) {
    return api.put(`/rental-objects/${id}`, data)
  },
  deleteRentalObject(id) {
    return api.delete(`/rental-objects/${id}`)
  },
  getBusinessCenters() {
    return api.get('/business-centers')
  },
}
