import api from './index'

export const viewingRequestsApi = {
  create(data) {
    return api.post('/viewing-requests', data)
  },
  getAllRequests(params) {
    return api.get('/viewing-requests', { params })
  },
  getRequestById(id) {
    return api.get(`/viewing-requests/${id}`)
  },
  updateRequestStatus(id, status, scheduledDate, scheduledTime, notes) {
    return api.patch(`/viewing-requests/${id}/status`, {
      status,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      manager_notes: notes,
    })
  },
}
