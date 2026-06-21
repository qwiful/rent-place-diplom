import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'
import { useAuthStore } from './auth'

export const useRentalObjectsStore = defineStore('rentalObjects', () => {
  const rentalObjects = ref([])
  const loading = ref(false)
  const error = ref(null)
  const auth = useAuthStore()

  const fetchRentalObjects = async () => {
    loading.value = true
    error.value = null
    try {
      let url
      if (auth.userRole === 'admin') {
        url = '/properties'
      } else if (auth.userRole === 'manager') {
        url = `/properties/by-manager/${auth.user.id}`
      } else {
        return
      }
      const { data } = await api.get(url)
      rentalObjects.value = data.properties || []
    } catch (err) {
      console.error('fetchRentalObjects error:', err)
      error.value = 'Ошибка загрузки помещений'
    } finally {
      loading.value = false
    }
  }

  const createRentalObject = async (payload) => {
    const { data } = await api.post('/properties', payload)
    await fetchRentalObjects()
    return data
  }

  const updateRentalObject = async (id, payload) => {
    const { data } = await api.put(`/properties/${id}`, payload)
    await fetchRentalObjects()
    return data
  }

  const deleteRentalObject = async (id) => {
    await api.delete(`/properties/${id}`)
    await fetchRentalObjects()
  }

  return {
    rentalObjects,
    loading,
    error,
    fetchRentalObjects,
    createRentalObject,
    updateRentalObject,
    deleteRentalObject,
  }
})
