import { defineStore } from 'pinia'
import { ref } from 'vue'
import { contractsApi } from '@/api/contracts'
import { useAuthStore } from './auth'

export const useContractsStore = defineStore('contracts', () => {
  const auth = useAuthStore()
  const contracts = ref([])
  const loading = ref(false)
  const error = ref(null)

  const fetchContracts = async () => {
    loading.value = true
    error.value = null
    try {
      const user = auth.user
      const userRole = user?.roles?.name || user?.role?.name || user?.role
      console.log('User role detected:', userRole)
      let response

      if (userRole === 'tenant') {
        const type = user.organization_id ? 'legal' : 'individual'
        const tenantId = type === 'legal' ? user.organization_id : user.id
        response = await contractsApi.getContractsByTenant(tenantId, type)
        contracts.value = response.data.contracts
      } else if (userRole === 'manager' || userRole === 'admin') {
        response = await contractsApi.getContracts()
        contracts.value = response.data.contracts
      } else {
        contracts.value = []
      }
    } catch (err) {
      console.error(err)
      error.value = err.response?.data?.error || 'Не удалось загрузить договоры'
      contracts.value = []
    } finally {
      loading.value = false
    }
  }

  const clearContracts = () => {
    contracts.value = []
    error.value = null
  }

  return {
    contracts,
    loading,
    error,
    fetchContracts,
    clearContracts,
  }
})
