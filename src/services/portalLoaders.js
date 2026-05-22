import { USER_ROLES } from '../config/appConfig'
import {
  fetchAiTaskPage,
  fetchAllEnterpriseList,
  fetchEnterpriseDetail,
  fetchEnterpriseList,
  fetchEnterprisePathMatchResults,
  fetchInvestorListByCreateUser,
  fetchInvestorOpportunities,
  fetchQuestionPage,
} from '../api'
import { mapEnterpriseVO, mapInvestorVO } from '../data/mappers'
import { getCurrentUserId } from './authSession'

const inflightInvestorOpportunityRequests = new Map()

export async function loadEnterprisePortalData(dispatch, { selectLatestEnterprise } = {}) {
  dispatch({ type: 'SET_LOADING', payload: true })
  try {
    await loadQuestionBank(dispatch, { silent: true })

    const userId = requireCurrentUserId()
    const enterprises = sortEnterpriseRecordsByCreatedTime(normalizeRecords(await fetchEnterpriseList(userId, USER_ROLES.ENTERPRISE)))
    dispatch({ type: 'LOAD_ENTERPRISES_FROM_API', payload: { data: enterprises } })

    if (enterprises?.length > 0) {
      const latestDetail = await loadEnterpriseDetail(enterprises[0])
      dispatch({ type: 'UPSERT_ENTERPRISE_FROM_API', payload: latestDetail })
      await loadStoredAnalysis(dispatch, latestDetail.id)
      selectLatestEnterprise?.(mapEnterpriseVO(latestDetail))

      await Promise.all([
        loadTaskHistory(dispatch, latestDetail.id),
        loadStoredAnalyses(dispatch, enterprises.slice(1, 3)),
      ])
    }
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false })
  }
}

export async function loadAdminPortalData(dispatch, { scope = 'dashboard' } = {}) {
  dispatch({ type: 'SET_LOADING', payload: true })
  try {
    if (scope === 'questions') {
      await loadAdminQuestionBank(dispatch)
      return
    }

    const enterprises = await fetchAllEnterpriseList()
    dispatch({ type: 'LOAD_ENTERPRISES_FROM_API', payload: { data: enterprises || [] } })
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false })
  }
}

export async function loadAdminEnterpriseDetail(dispatch, enterpriseId) {
  const detail = await fetchEnterpriseDetail(enterpriseId)
  const mapped = mapEnterpriseVO(detail || {})
  dispatch({ type: 'UPSERT_ENTERPRISE_FROM_API', payload: detail || {} })
  return mapped
}

export async function loadAdminEnterpriseAnalysis(dispatch, enterpriseId) {
  const analysis = await fetchEnterprisePathMatchResults(enterpriseId)
  dispatch({ type: 'LOAD_PRODUCTS_FROM_API', payload: { enterpriseId, data: analysis || null } })
  return analysis
}

export async function loadAdminQuestionBank(dispatch) {
  dispatch({ type: 'SET_QUESTIONS_LOADING', payload: true })
  dispatch({ type: 'SET_QUESTIONS_ERROR', payload: '' })
  try {
    const questions = await fetchQuestionPage({ pageNum: 1, pageSize: 100 })
    dispatch({ type: 'LOAD_QUESTIONS_FROM_API', payload: questions || [] })
    return questions
  } catch (e) {
    dispatch({ type: 'SET_QUESTIONS_ERROR', payload: e.message || '题库加载失败' })
    return null
  } finally {
    dispatch({ type: 'SET_QUESTIONS_LOADING', payload: false })
  }
}

async function loadQuestionBank(dispatch, { silent = false } = {}) {
  try {
    const questions = await fetchQuestionPage({ pageNum: 1, pageSize: 100 })
    dispatch({ type: 'LOAD_QUESTIONS_FROM_API', payload: questions || [] })
    return questions
  } catch (e) {
    if (!silent) throw e
    return null
  }
}

export async function loadCapitalPortalData(dispatch, { preferredInvestorId, requirePreferredInvestor = false, selectInvestor, includeOpportunities = true } = {}) {
  dispatch({ type: 'SET_LOADING', payload: true })
  try {
    const userId = requireCurrentUserId()
    const investors = normalizeRecords(await fetchInvestorListByCreateUser(userId, USER_ROLES.INVESTOR))
    const current = selectCurrentInvestorRecord(investors, preferredInvestorId, { requirePreferredInvestor })
    if (!current) {
      dispatch({ type: 'CLEAR_CAPITAL_PORTAL_DATA' })
      return
    }

    dispatch({ type: 'LOAD_INVESTORS_FROM_API', payload: investors })
    const investor = mapInvestorVO(current)
    dispatch({ type: 'LOAD_CURRENT_INVESTOR_FROM_API', payload: current })
    selectInvestor?.(investor)

    if (!includeOpportunities) {
      dispatch({ type: 'SET_CAPITAL_OPPORTUNITY_ERRORS', payload: [] })
      return
    }

    const investorCodes = collectInvestorOpportunityCodes(investor)
    if (investorCodes.length === 0) {
      dispatch({ type: 'SET_CAPITAL_OPPORTUNITY_ERRORS', payload: [] })
      dispatch({ type: 'LOAD_CAPITAL_OPPORTUNITIES_FROM_API', payload: [] })
      return
    }

    const failedCodes = []
    const opportunityGroups = await Promise.all(investorCodes.map(async code => {
      try {
        return normalizeRecords(await fetchInvestorOpportunitiesOnce(code))
      } catch {
        failedCodes.push(code)
        return []
      }
    }))
    dispatch({ type: 'SET_CAPITAL_OPPORTUNITY_ERRORS', payload: failedCodes })
    dispatch({ type: 'LOAD_CAPITAL_OPPORTUNITIES_FROM_API', payload: dedupeById(opportunityGroups.flat()) })
  } finally {
    dispatch({ type: 'SET_LOADING', payload: false })
  }
}

function fetchInvestorOpportunitiesOnce(code) {
  const key = String(code || '').trim()
  if (!key) return Promise.resolve([])
  const pending = inflightInvestorOpportunityRequests.get(key)
  if (pending) return pending
  const request = fetchInvestorOpportunities(key)
    .finally(() => inflightInvestorOpportunityRequests.delete(key))
  inflightInvestorOpportunityRequests.set(key, request)
  return request
}

function normalizeRecords(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.records)) return value.records
  if (Array.isArray(value?.data)) return value.data
  return []
}

function collectInvestorOpportunityCodes(currentInvestor) {
  const code = getCurrentInvestorOpportunityCode(currentInvestor)
  return code ? [code] : []
}

function getCurrentInvestorOpportunityCode(currentInvestor) {
  if (!currentInvestor) return ''
  const direct = String(currentInvestor.investorIdCode || currentInvestor.id || '').trim()
  if (direct) return direct
  const fieldCode = normalizeFieldRecords(currentInvestor.fields).find(field => (
    field?.id === 'investor_id' || field?.id === 'enterprise_id'
  ))?.value
  return String(fieldCode || '').trim()
}

function normalizeFieldRecords(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function selectCurrentInvestorRecord(investors, preferredInvestorId, { requirePreferredInvestor = false } = {}) {
  if (!Array.isArray(investors) || investors.length === 0) return null
  const hasPreferred = Boolean(String(preferredInvestorId || '').trim())
  const preferred = findInvestorRecordById(investors, preferredInvestorId)
  if (preferred) return preferred
  if (hasPreferred && requirePreferredInvestor) return null
  return sortInvestorRecordsByCreatedTime(investors)[0] || investors[0] || null
}

function findInvestorRecordById(investors, preferredInvestorId) {
  const target = String(preferredInvestorId || '').trim()
  if (!target) return null
  return (investors || []).find(item => {
    const fields = normalizeFieldRecords(item?.investmentField)
    const fieldCodes = fields
      .filter(field => field?.id === 'investor_id' || field?.id === 'enterprise_id')
      .map(field => String(field.value || '').trim())
    const candidates = [
      item?.id,
      pickRecord(item, 'investorIdCode', 'investor_id_code', 'investorId', 'investor_id'),
      ...fieldCodes,
    ].map(value => String(value || '').trim()).filter(Boolean)
    return candidates.includes(target)
  }) || null
}

function sortInvestorRecordsByCreatedTime(investors) {
  return [...(investors || [])].sort((a, b) => {
    const bTime = Date.parse(pickRecord(b, 'createdAt', 'created_at', 'updatedAt', 'updated_at') || '') || 0
    const aTime = Date.parse(pickRecord(a, 'createdAt', 'created_at', 'updatedAt', 'updated_at') || '') || 0
    return bTime - aTime
  })
}

function sortEnterpriseRecordsByCreatedTime(enterprises) {
  return [...(enterprises || [])].sort((a, b) => {
    const bTime = getRecordTime(b)
    const aTime = getRecordTime(a)
    if (bTime !== aTime) return bTime - aTime
    return Number(pickRecord(b, 'id') || 0) - Number(pickRecord(a, 'id') || 0)
  })
}

function getRecordTime(record) {
  const raw = pickRecord(record, 'createdAt', 'created_at', 'updatedAt', 'updated_at') || ''
  return Date.parse(String(raw).replace(' ', 'T')) || Date.parse(raw) || 0
}

function hasMainFlag(item) {
  const flag = pickRecord(item, 'mainFlag', 'main_flag')
  return flag === true || flag === 1 || String(flag).toLowerCase() === 'true' || String(flag).toUpperCase() === 'Y'
}

function pickRecord(obj, ...keys) {
  for (const key of keys) {
    const value = obj?.[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function dedupeById(records) {
  const seen = new Set()
  return (records || []).filter(item => {
    const key = item.matchId || item.id || `${item.taskId || ''}-${item.investorIdCode || ''}-${item.routeIdCode || ''}`
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function requireCurrentUserId() {
  const userId = getCurrentUserId()
  if (!userId) throw new Error('未获取到当前登录用户ID，请重新登录')
  return userId
}

async function loadStoredAnalyses(dispatch, enterprises) {
  for (const ent of enterprises) {
    await loadStoredAnalysis(dispatch, ent.id)
  }
}

async function loadStoredAnalysis(dispatch, enterpriseId) {
  try {
    const analysis = await fetchEnterprisePathMatchResults(enterpriseId)
    dispatch({ type: 'LOAD_PRODUCTS_FROM_API', payload: { enterpriseId, data: analysis || null } })
    return analysis
  } catch (e) {
    // 单个企业方案失败不影响端内首页进入。
    dispatch({ type: 'LOAD_PRODUCTS_FROM_API', payload: { enterpriseId, data: null } })
    return null
  }
}

async function loadEnterpriseDetail(enterprise) {
  try {
    return await fetchEnterpriseDetail(enterprise.id)
  } catch (e) {
    return enterprise
  }
}

export async function loadTaskHistory(dispatch, enterpriseId) {
  const tasks = await fetchAiTaskPage({
    pageNum: 1,
    pageSize: 10,
    sortField: 'createdAt',
    sortOrder: 'desc',
    taskType: 'ANALYSIS',
    enterpriseId: String(enterpriseId),
  })
  dispatch({ type: 'LOAD_TASKS_FROM_API', payload: { enterpriseId, data: tasks } })
  return tasks
}
