import api from './index'

export const ticketsApi = {
  getMyTickets() {
    return api.get('/tickets/my')
  },
  getAllTickets(params) {
    return api.get('/tickets', { params })
  },
  getTicketById(id) {
    return api.get(`/tickets/${id}`)
  },
  createTicket(data) {
    return api.post('/tickets', data)
  },
  updateTicketStatus(id, status, reason) {
    return api.patch(`/tickets/${id}/status`, { status, reason })
  },
}
