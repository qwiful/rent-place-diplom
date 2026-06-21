const CONTRACT_STATUSES = [
  'draft',
  'pending',
  'active',
  'terminated',
  'completed',
]
const TICKET_STATUSES = [
  'new',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled',
]
const PRIORITIES = ['low', 'medium', 'high', 'critical']
const INTERACTION_TYPES = ['phone', 'email', 'meeting', 'note']
const SERVICE_TYPES = ['cleaning', 'repair', 'technical', 'other']
const RENTAL_STATUSES = [
  'available',
  'occupied',
  'reserved',
  'under_renovation',
]
const GENDERS = ['male', 'female']

/**
 * @param {string} value
 * @param {string[]} allowedValues
 * @param {string} fieldName
 * @returns {{ valid: boolean, error?: string }}
 */

const validateEnum = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `Недопустимое значение "${value}" для поля ${fieldName}. Допустимые: ${allowedValues.join(', ')}`,
    }
  }
  return { valid: true }
}

module.exports = {
  CONTRACT_STATUSES,
  TICKET_STATUSES,
  PRIORITIES,
  INTERACTION_TYPES,
  SERVICE_TYPES,
  RENTAL_STATUSES,
  GENDERS,
  validateEnum,
}
