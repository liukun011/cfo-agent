const CORE_ENTERPRISE_FIELD_IDS = ['companyName', 'industry', 'financing', 'financingPurpose']

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

export function getExtraEnterpriseFields(fields = []) {
  const coreIds = new Set(CORE_ENTERPRISE_FIELD_IDS)
  return fields.filter(field => !coreIds.has(field.id) && hasValue(field.value))
}

export function buildEnterpriseFields(enterprise) {
  const sourceDynamicFields = (enterprise.extendedInfo || [])
    .slice()
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
    .filter(field => field.label && hasValue(field.value))
    .filter(field => Number(field.sort || 0) < 100)
    .filter(field => !shouldHideEnterpriseField(field))
  const withDynamicFallback = field => {
    if (hasValue(field.value)) return field
    const fallback = findDynamicFallbackField(sourceDynamicFields, field.id, field.group)
    if (!fallback) return field
    return {
      ...field,
      value: fallback.value,
      long: field.long || String(fallback.value).length > 28,
    }
  }

  const fields = [
    { id: 'companyName', label: '企业名称', value: enterprise.companyName, group: 'company' },
    { id: 'industry', label: '所属行业', value: enterprise.industry, group: 'industry' },
    { id: 'contactPerson', label: '联系人', value: enterprise.contactPerson, group: 'contact' },
    { id: 'contactPhone', label: '联系方式', value: enterprise.contactPhone, group: 'contact_phone' },
    { id: 'revenue', label: '年营收', value: formatRange(enterprise.revenueMin, enterprise.revenueMax, '万元'), group: 'finance' },
    { id: 'financing', label: '融资金额', value: formatRange(enterprise.financingMin, enterprise.financingMax, '万元'), group: 'funding' },
    { id: 'financingPurpose', label: '资金用途', value: enterprise.financingPurpose, long: true, group: 'funding' },
    { id: 'assetStatus', label: '资产/抵押现状', value: enterprise.assetStatus, long: true, group: 'asset' },
  ].map(withDynamicFallback)
    .filter(field => CORE_ENTERPRISE_FIELD_IDS.includes(field.id) || hasValue(field.value))

  const seenGroups = new Set(fields.map(field => field.group))
  const seenLabels = new Set(fields.map(field => field.label))
  const seenValues = new Set(fields.map(field => normalizeValue(field.value)))
  const dynamicFields = sourceDynamicFields
    .filter(field => {
      const group = getFieldGroup(field)
      const valueKey = normalizeValue(field.value)
      if (!field.label || !hasValue(field.value) || seenGroups.has(group) || seenLabels.has(field.label) || seenValues.has(valueKey)) return false
      seenLabels.add(field.label)
      seenValues.add(valueKey)
      return true
    })
    .map(field => ({
      id: field.id || field.label,
      label: field.label,
      value: field.value,
      long: String(field.value).length > 28,
    }))

  return [...fields, ...dynamicFields]
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

function findDynamicFallbackField(fields, fieldId, group) {
  const matcherMap = {
    companyName: /company|企业名称|公司名称/,
    industry: /industry|所属行业|行业领域/,
    contactPerson: /contactperson|联系人/,
    contactPhone: /contactphone|联系方式|联系电话|手机号/,
    revenue: /revenue|营收|收入|利润|财务/,
    financing: /financing.*amount|融资金额|融资额度|融资规模|金额|额度|规模/,
    financingPurpose: /financingpurpose|资金用途|融资诉求|本次融资诉求|用途/,
    assetStatus: /asset|debt|资产|负债|抵押|担保/,
  }
  const matcher = matcherMap[fieldId]
  const matched = matcher
    ? fields.find(field => matcher.test(`${field.id || ''}${field.label || ''}`.toLowerCase()))
    : null
  if (matched) return matched
  return fields.find(field => getFieldGroup(field) === group)
}

function shouldHideEnterpriseField(field) {
  const text = `${field.id || ''}${field.label || ''}`.toLowerCase()
  return /region|address|coreproblems|地区|地址|所在地|核心问题|经营压力|痛点/.test(text)
}

function formatRange(min, max, unit) {
  if (hasValue(min) && hasValue(max) && Number(min) !== Number(max)) return `${min} - ${max} ${unit}`
  if (hasValue(max)) return `${max} ${unit}`
  if (hasValue(min)) return `${min} ${unit}`
  return ''
}

function getFieldGroup(field) {
  const text = `${field.id || ''}${field.label || ''}`.toLowerCase()
  if (/company|企业名称|公司名称/.test(text)) return 'company'
  if (/industry|所属行业|行业领域/.test(text)) return 'industry'
  if (/contactperson|联系人/.test(text)) return 'contact'
  if (/contactphone|联系方式|联系电话|手机号/.test(text)) return 'contact_phone'
  if (/address|region|地区|地址/.test(text)) return 'address'
  if (/revenue|profit|tax|财务|营收|收入|利润|纳税|盈利/.test(text)) return 'finance'
  if (/financing|funding|融资|资金用途/.test(text)) return 'funding'
  if (/asset|debt|order|client|抵押|担保|资产|负债|订单|客户/.test(text)) return 'asset'
  if (/problem|pressure|risk|痛点|压力|问题|风险/.test(text)) return 'problems'
  if (/qualification|资质|证书/.test(text)) return 'qualification'
  return text || field.label
}

function normalizeValue(value) {
  return String(value ?? '').replace(/\s+/g, '').trim()
}
