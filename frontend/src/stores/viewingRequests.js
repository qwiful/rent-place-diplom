import { defineStore } from 'pinia'
import { ref } from 'vue'
import { viewingRequestsApi } from '@/api/viewingRequests'

export const useViewingRequestsStore = defineStore('viewingRequests', () => {
  const requests = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchRequests = async () => {
    loading.value = true
    error.value = null
    try {
      const response = await viewingRequestsApi.getAllRequests()
      requests.value = response.data.requests || []
    } catch (err) {
      error.value = err.response?.data?.error || 'Ошибка загрузки заявок'
      console.error(err)
    } finally {
      loading.value = false
    }
  }

  const updateRequest = async (
    id,
    status,
    scheduledDate,
    scheduledTime,
    notes,
  ) => {
    try {
      const response = await viewingRequestsApi.updateRequestStatus(
        id,
        status,
        scheduledDate,
        scheduledTime,
        notes,
      )
      const index = requests.value.findIndex((r) => r.id === id)
      if (index !== -1) {
        requests.value[index] = response.data.request
      }
      return response.data
    } catch (err) {
      error.value = err.response?.data?.error || 'Ошибка обновления заявки'
      throw err
    }
  }

  return {
    requests,
    loading,
    error,
    fetchRequests,
    updateRequest,
  }
})
