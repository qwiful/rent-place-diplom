import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'
import { useAuthStore } from './auth'

export const useTicketsStore = defineStore('tickets', () => {
  const tickets = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchTickets = async () => {
    loading.value = true
    error.value = null
    try {
      const auth = useAuthStore()
      let url
      if (auth.userRole === 'tenant') {
        url = '/tickets/my'
      } else {
        url = '/tickets'
      }
      const { data } = await api.get(url)
      tickets.value = data.tickets || []
    } catch (err) {
      console.error('fetchTickets error:', err)
      error.value = err.response?.data?.error || 'Ошибка загрузки заявок'
      tickets.value = []
    } finally {
      loading.value = false
    }
  }

  const createTicket = async (ticketData) => {
    try {
      const response = await api.post('/tickets', ticketData)
      await fetchTickets()
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Ошибка при создании заявки'
      throw err
    }
  }

  const updateTicketStatus = async (id, status, reason = '') => {
    try {
      await api.patch(`/tickets/${id}/status`, { status, reason })
      await fetchTickets()
    } catch (err) {
      console.error('updateTicketStatus error:', err)
      throw err
    }
  }

  return {
    tickets,
    loading,
    error,
    fetchTickets,
    createTicket,
    updateTicketStatus,
  }
})
