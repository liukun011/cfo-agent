import { fetchAiTaskStatus, fetchInvestorListByCreateUser } from '../../../api'
import { USER_ROLES } from '../../../config/appConfig'
import { buildInvestorFieldDrafts } from '../../../data/investorFields'
import { getCurrentUserId } from '../../../services/authSession'

export async function waitForProfileImportResult(uploadResult, knownIds, setMessage) {
  const taskId = typeof uploadResult === 'string'
    ? uploadResult
    : uploadResult?.taskId || uploadResult?.id || uploadResult?.task_id
  if (!taskId) throw new Error('资料导入未启动，请重试')

  for (let i = 0; i < 45; i += 1) {
    if (i > 0) await delay(8000)
    setMessage?.('正在整理机构资料...')
    const task = await fetchAiTaskStatus(taskId)
    const status = String(task?.taskStatus || task?.status || '').toUpperCase()
    if (status === 'SUCCESS') {
      setMessage?.('资料已整理，正在读取机构资料...')
      const userId = getCurrentUserId()
      if (!userId) throw new Error('登录信息已失效，请重新登录')
      const investors = normalizeRecords(await fetchInvestorListByCreateUser(userId, USER_ROLES.INVESTOR))
      const imported = findImportedInvestor(investors || [], knownIds)
      if (!imported) throw new Error('未找到当前账号下的机构资料')
      return imported
    }
    if (status === 'FAILED') throw new Error(task?.errorMsg || task?.message || '机构资料导入失败')
  }
  throw new Error('机构资料仍在处理中，请稍后刷新或重新上传')
}

export async function waitForProfileSupplementResult(uploadResult, investorId, setMessage) {
  const direct = Array.isArray(uploadResult)
    ? { investmentField: uploadResult }
    : uploadResult?.investmentField
      ? uploadResult
      : null
  if (direct) return direct
  const taskId = typeof uploadResult === 'string'
    ? uploadResult
    : uploadResult?.taskId || uploadResult?.id || uploadResult?.task_id
  if (!taskId) throw new Error('资料补充未启动，请重试')

  for (let i = 0; i < 45; i += 1) {
    if (i > 0) await delay(8000)
    setMessage?.('正在整理补充资料...')
    const task = await fetchAiTaskStatus(taskId)
    const status = String(task?.taskStatus || task?.status || '').toUpperCase()
    if (status === 'SUCCESS') {
      setMessage?.('资料已整理，正在读取机构资料...')
      const userId = getCurrentUserId()
      if (!userId) throw new Error('登录信息已失效，请重新登录')
      const investors = normalizeRecords(await fetchInvestorListByCreateUser(userId, USER_ROLES.INVESTOR))
      const updated = investors.find(item => String(item.id || '') === String(investorId))
      if (!updated) throw new Error('未找到当前机构资料')
      return updated
    }
    if (status === 'FAILED') throw new Error(task?.errorMsg || task?.message || '机构资料补充失败')
  }
  throw new Error('补充资料仍在处理中，请稍后刷新')
}

export function normalizeRecords(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.records)) return value.records
  if (Array.isArray(value?.data)) return value.data
  return []
}

export function getInvestorIdSet(investors) {
  return new Set((investors || []).map(item => String(item.raw?.id || item.id || '')).filter(Boolean))
}

export function findImportedInvestor(investors, knownIds) {
  const fresh = (investors || []).filter(item => !knownIds.has(String(item.id || '')))
  if (fresh.length > 0) return sortInvestorsByTime(fresh)[0]
  return sortInvestorsByTime(investors || [])[0] || null
}

export function sortInvestorsByTime(investors) {
  return [...investors].sort((a, b) => {
    const bt = Date.parse(b.createdAt || b.updatedAt || '') || 0
    const at = Date.parse(a.createdAt || a.updatedAt || '') || 0
    return bt - at
  })
}

export function normalizeInvestorFields(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getFriendlyError(error, fallback) {
  const message = String(error?.message || error || '').trim()
  if (!message) return fallback
  if (/API Error|NetworkError|Failed to fetch|接口|任务|task/i.test(message)) return fallback
  return message.replace(/^Error:\s*/, '')
}

export function hasInvestorFieldChanges(drafts = [], originalFields = []) {
  const originalById = new Map(buildInvestorFieldDrafts(originalFields).map(field => [field.id, String(field.value || '')]))
  return drafts.some(field => String(field.value || '') !== (originalById.get(field.id) || ''))
}

export function sortInvestorFieldsForDisplay(a, b) {
  if (Boolean(a.required) !== Boolean(b.required)) return a.required ? -1 : 1
  return Number(a.sort || 0) - Number(b.sort || 0)
}

export function sortCapitalRequests(a, b) {
  const statusWeight = { 待确认: 0, 已确认: 1 }
  const weightDiff = (statusWeight[a.status] ?? 9) - (statusWeight[b.status] ?? 9)
  if (weightDiff !== 0) return weightDiff
  const bTime = Date.parse(b.pushTime || '') || 0
  const aTime = Date.parse(a.pushTime || '') || 0
  return bTime - aTime
}

export function getPartnerFieldValue(partner, fieldId) {
  const field = (partner?.fields || []).find(item => item.id === fieldId)
  return String(field?.value || '').trim()
}

export function getCurrentInstitution(currentInvestor, partners = []) {
  const primaryPartner = (partners || []).find(isPrimaryInstitutionRecord)
  if (isPrimaryInstitutionRecord(currentInvestor)) return currentInvestor
  if (currentInvestor) return currentInvestor
  if (primaryPartner) return primaryPartner
  return (partners || [])[0] || null
}

export function buildInstitutionSummaryItems(institution) {
  if (!institution) return []
  return [
    {
      label: '资金类型',
      value: institution.products || institution.type || '',
    },
    {
      label: '额度范围',
      value: institution.amountRange || formatAmountRange(institution.amountMin, institution.amountMax),
    },
    {
      label: '关注领域',
      value: institution.industries || getPartnerFieldValue(institution, 'investment_field'),
    },
    {
      label: '准入偏好',
      value: institution.conditions || getPartnerFieldValue(institution, 'risk_control_criteria'),
    },
  ]
}

export function getAssociatedSourceText(institution) {
  if (!institution?.associatedId) return null
  const name = String(institution.associatedName || '').trim()
  if (name) return `来源机构：${name}`
  return null
}

export function isSupportedProfileFile(file) {
  const name = String(file?.name || '').toLowerCase()
  return name.endsWith('.txt') || name.endsWith('.md')
}

export function isPrimaryInstitutionRecord(record) {
  if (!record) return false
  if (record.invitationCode || record.raw?.invitationCode || record.raw?.invitation_code || record.raw?.inviteCode || record.raw?.invite_code) return true
  const mainFlag = record.mainFlag
  return mainFlag === true || mainFlag === 1 || mainFlag === '1' || String(mainFlag).toLowerCase() === 'true'
}

export function isPendingInvestorConfirm(req) {
  const contactViewStatus = String(req?.contactViewStatus || '').toUpperCase()
  return contactViewStatus === 'PENDING_INVESTOR_CONFIRM'
    || contactViewStatus === 'PENDING_PLATFORM_REVIEW'
    || req?.status === '待确认'
}

export function normalizeCapitalOpportunityRequest(req) {
  const raw = req?.raw || {}
  const contactViewStatus = String(raw.contactViewStatus || raw.contact_view_status || req?.contactViewStatus || '').toUpperCase()
  const requiredMaterials = normalizeMaterialList(raw.requiredMaterials ?? raw.required_materials ?? req?.requiredMaterials ?? req?.missingMaterials)
  const normalized = {
    ...req,
    id: String(raw.id || req?.id || ''),
    matchId: raw.id || req?.matchId || req?.id || '',
    enterpriseId: raw.enterpriseId || req?.enterpriseId || '',
    companyName: raw.companyName || req?.companyName || '',
    endpointName: raw.endpointName || req?.endpointName || '',
    productName: raw.productName || req?.productName || req?.routeName || '',
    allocatedAmountWan: raw.allocatedAmountWan ?? req?.allocatedAmountWan,
    allocatedRatio: raw.allocatedRatio ?? req?.allocatedRatio,
    fundingPurposeCovered: raw.fundingPurposeCovered || req?.fundingPurposeCovered || '',
    routeMatchScore: raw.routeMatchScore ?? req?.routeMatchScore,
    routeMatchReason: raw.routeMatchReason || req?.routeMatchReason || '',
    suggestedAmountWan: raw.suggestedAmountWan ?? req?.suggestedAmountWan,
    amountFitConclusion: raw.amountFitConclusion || req?.amountFitConclusion || '',
    estimatedCostRange: raw.estimatedCostRange || req?.estimatedCostRange || '',
    estimatedTerm: raw.estimatedTerm || req?.estimatedTerm || '',
    estimatedArrivalDays: raw.estimatedArrivalDays ?? req?.estimatedArrivalDays,
    matchReason: raw.matchReason || req?.matchReason || '',
    riskAdvice: raw.riskAdvice || req?.riskAdvice || '',
    requiredMaterials,
    missingMaterials: requiredMaterials,
    matchRisk: raw.matchRisk || req?.matchRisk || '',
    matchRate: raw.matchScore ?? req?.matchRate,
    contactViewStatus: contactViewStatus || req?.contactViewStatus || '',
    raw,
  }

  return {
    ...normalized,
    status: getCapitalOpportunityStatus(normalized.contactViewStatus, req?.status),
  }
}

export function isRequestOwnedByCurrentInstitution(req, currentInstitution, accessibleCodes = []) {
  if (!currentInstitution) return false
  const currentCodes = new Set(accessibleCodes.map(value => String(value || '').trim()).filter(Boolean))
  const requestCodes = [
    req?.investorIdCode,
    req?.ownerInvestorIdCode,
    req?.raw?.investorIdCode,
    req?.raw?.ownerInvestorIdCode,
    req?.raw?.investorId,
    req?.raw?.investor_id,
  ].map(value => String(value || '').trim()).filter(Boolean)
  // New investor opportunity rows are already scoped by the investor endpoint and
  // no longer repeat an investor code on each row.
  if (requestCodes.length === 0) return Boolean(req?.raw?.id && req?.raw?.enterpriseId)
  if (currentCodes.size === 0) return false
  return requestCodes.some(code => currentCodes.has(code))
}

export function collectAccessibleInstitutionCodes(currentInstitution, partners = []) {
  const codes = new Set()
  const addCode = value => {
    const text = String(value || '').trim()
    if (text) codes.add(text)
  }
  const addFieldCodes = fields => {
    ;(fields || []).forEach(field => {
      if (field?.id === 'investor_id' || field?.id === 'enterprise_id') addCode(field.value)
    })
  }
  const visit = item => {
    if (!item) return
    addCode(item.id)
    addCode(item.investorIdCode)
    addCode(item.raw?.id)
    addCode(item.raw?.investorIdCode)
    addFieldCodes(item.fields)
    ;(item.subInstitutions || []).forEach(visit)
  }
  visit(currentInstitution)
  ;(partners || []).forEach(visit)
  return [...codes]
}

export function formatAmountRange(min, max) {
  const minText = formatAmountValue(min)
  const maxText = formatAmountValue(max)
  if (!minText && !maxText) return ''
  if (!minText) return `${maxText} 万`
  if (!maxText) return `${minText} 万`
  if (minText === maxText) return `${minText} 万`
  return `${minText}-${maxText} 万`
}

export function formatAmountValue(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value)
  return Number.isInteger(num) ? String(num) : String(num).replace(/\.0+$/, '')
}

export function formatWan(value) {
  const text = formatAmountValue(value)
  return text ? `${text} 万` : ''
}

export function formatMaybePercent(value) {
  if (value === null || value === undefined || value === '') return ''
  const text = String(value).trim()
  if (!text) return ''
  if (text.includes('%')) return text
  const num = Number(text)
  if (!Number.isFinite(num)) return text
  return `${Number.isInteger(num) ? num : num.toFixed(1).replace(/\.0$/, '')}%`
}

function getCapitalOpportunityStatus(contactViewStatus, fallbackStatus) {
  switch (String(contactViewStatus || '').toUpperCase()) {
    case 'PENDING_INVESTOR_CONFIRM':
    case 'PENDING_PLATFORM_REVIEW':
      return '待确认'
    case 'APPROVED':
      return '已确认'
    case 'INVESTOR_REJECTED':
      return '暂不接收'
    default:
      return fallbackStatus || ''
  }
}

function normalizeMaterialList(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
  const text = String(value || '').trim()
  if (!text) return []
  return text.split(/[、,，;；\n]/).map(item => item.trim()).filter(Boolean)
}

function delay(ms) {
  return new Promise(resolve => window.setTimeout(resolve, ms))
}
