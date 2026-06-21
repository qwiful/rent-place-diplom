import api from './index'

export const contractsApi = {
  getContracts(params) {
    return api.get('/contracts', { params })
  },
  getContractsByTenant(tenantId, type) {
    return api.get(`/contracts/by-tenant/${tenantId}`, { params: { type } })
  },
  getContractById(id) {
    return api.get(`/contracts/${id}`)
  },
  downloadContract(contractFileUrl) {
    window.open(contractFileUrl, '_blank')
  },
  updateContractStatus(id, status, reason) {
    return api.patch(`/contracts/${id}/status`, { status, reason })
  },
}
