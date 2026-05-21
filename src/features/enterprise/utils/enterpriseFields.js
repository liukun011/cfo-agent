const CORE_ENTERPRISE_FIELD_IDS = ['companyName', 'industry', 'contactPerson', 'contactPhone', 'financing', 'financingPurpose']

export function getInitialSupplementValues(enterprise, fallbackValues = {}) {
  const extendedValues = getExtendedInfoValueMap(enterprise?.extendedInfo || [])
  return Object.fromEntries((enterprise?.missingFields || []).map(field => {
    const key = field.id || field.label
    return [key, getBackendSupplementValue(field) || fallbackValues[key] || extendedValues[key] || '']
  }))
}

export function getCompletedSupplementFields(enterprise, missingFields = []) {
  const missingIds = new Set(missingFields.map(field => field.id || field.label).filter(Boolean))
  return (enterprise?.extendedInfo || [])
    .filter(field => {
      const key = field.id || field.label
      return key && !missingIds.has(key) && hasValue(field.value) && Number(field.sort || 0) >= 100
    })
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
    .map(field => ({
      id: field.id || field.label,
      label: field.label || field.id,
      value: field.value,
    }))
}

export function getEnterpriseProducts(productMap, enterpriseId) {
  if (!enterpriseId) return []
  const direct = productMap[enterpriseId]
  const numeric = productMap[Number(enterpriseId)]
  const text = productMap[String(enterpriseId)]
  const value = direct || numeric || text || []
  return Array.isArray(value) ? value : []
}

export function getCoreEnterpriseFields(fields = []) {
  return CORE_ENTERPRISE_FIELD_IDS
    .map(id => fields.find(field => field.id === id))
    .filter(Boolean)
}

export function buildEnterpriseFields(enterprise) {
  return [
    { id: 'companyName', label: '企业名称', value: enterprise.companyName, group: 'company' },
    { id: 'industry', label: '所属行业', value: enterprise.industry, group: 'industry' },
    { id: 'contactPerson', label: '联系人', value: enterprise.contactPerson, group: 'contact' },
    { id: 'contactPhone', label: '联系方式', value: enterprise.contactPhone, group: 'contact_phone' },
    { id: 'financing', label: '本次融资额度', value: formatRange(enterprise.financingMin, enterprise.financingMax, '万元'), group: 'funding' },
    { id: 'financingPurpose', label: '资金用途', value: enterprise.financingPurpose, long: true, group: 'funding' },
  ]
}

export function hasValue(value) {
  return value !== undefined && value !== null && value !== '' && value !== '0 - 0 万元' && value !== '0 万元'
}

function getBackendSupplementValue(field) {
  return String(field.value || field.content || field.answer || field.currentValue || field.filledValue || '')
}

function getExtendedInfoValueMap(fields = []) {
  const map = {}
  fields.forEach(field => {
    const key = field.id || field.label
    if (key && hasValue(field.value)) map[key] = String(field.value)
  })
  return map
}

function formatRange(min, max, unit) {
  if (hasValue(min) && hasValue(max) && Number(min) !== Number(max)) return `${min} - ${max} ${unit}`
  if (hasValue(max)) return `${max} ${unit}`
  if (hasValue(min)) return `${min} ${unit}`
  return ''
}
