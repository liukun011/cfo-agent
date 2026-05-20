import {
  createEnterprise,
  fetchAiTaskResult,
  fetchAiTaskStatus,
  fetchEnterpriseDetail,
  fetchStoredAnalysis,
  submitAnalysis,
  updateEnterprise,
} from '../api'
import { mapEnterpriseVO } from '../data/mappers'
import { delay } from '../shared/utils'
import { loadTaskHistory } from './portalLoaders'

export async function saveEnterprise(payload, dispatch) {
  const saved = await createEnterprise(payload)
  const savedEnterprise = mapEnterpriseVO({ ...payload, ...saved })
  dispatch({ type: 'UPSERT_ENTERPRISE_FROM_API', payload: { ...payload, ...saved } })

  return savedEnterprise
}

export async function updateEnterpriseAfterChat(enterprise, payload, dispatch) {
  const updatePayload = {
    ...payload,
    id: String(enterprise.id),
    companyName: payload.companyName || enterprise.companyName,
    industry: payload.industry || enterprise.industry,
    contactPerson: payload.contactPerson || enterprise.contactPerson || '',
    contactPhone: payload.contactPhone || enterprise.contactPhone || '',
    status: 1,
  }
  const saved = await updateEnterprise(updatePayload)
  const savedEnterprise = mapEnterpriseVO({ ...updatePayload, ...saved })
  dispatch({ type: 'UPSERT_ENTERPRISE_FROM_API', payload: { ...updatePayload, ...saved } })

  return savedEnterprise
}

export async function refreshEnterpriseDetail(enterpriseId, dispatch) {
  const detail = await fetchEnterpriseDetail(enterpriseId)
  dispatch({ type: 'UPSERT_ENTERPRISE_FROM_API', payload: detail })
  return mapEnterpriseVO(detail)
}

export async function waitForEnterpriseDetection(enterpriseId, dispatch) {
  for (let i = 0; i < 10; i += 1) {
    if (i > 0) await delay(1500)
    try {
      const detail = await refreshEnterpriseDetail(enterpriseId, dispatch)
      if (hasDetectionResult(detail)) return detail
    } catch (e) {
      // 详情检测是异步增强能力，单次失败继续等下一轮。
    }
  }

  try {
    return await refreshEnterpriseDetail(enterpriseId, dispatch)
  } catch {
    return null
  }
}

export async function generateEnterpriseAnalysis(enterpriseId, dispatch) {
  let analysis = null
  try {
    const task = await submitAnalysis(enterpriseId)
    if (task?.taskId) {
      analysis = await waitForAnalysis(enterpriseId, task.taskId)
    }
    if (!analysis) {
      analysis = await fetchStoredAnalysis(enterpriseId)
    }
  } catch (analysisError) {
    console.log('融资方案分析接口暂不可用', analysisError)
  }

  dispatch({ type: 'LOAD_PRODUCTS_FROM_API', payload: { enterpriseId, data: analysis || null } })
  await loadTaskHistory(dispatch, enterpriseId).catch(() => null)

  return analysis
}

export async function startEnterpriseAnalysis(enterpriseId) {
  return submitAnalysis(enterpriseId)
}

export async function refreshEnterpriseAnalysis(enterpriseId, taskId, dispatch, options = {}) {
  let taskStatus = ''
  if (taskId) {
    const status = await fetchAiTaskStatus(taskId)
    taskStatus = status?.taskStatus || status?.status || ''
    if (taskStatus === 'SUCCESS') {
      const resultSource = options.resultSource || 'stored'
      const analysis = resultSource === 'task'
        ? await fetchAiTaskResult(taskId)
        : await fetchStoredAnalysis(enterpriseId)
      if (analysis) {
        dispatch({ type: 'LOAD_PRODUCTS_FROM_API', payload: { enterpriseId, data: analysis } })
        await loadTaskHistory(dispatch, enterpriseId).catch(() => null)
      }
      return { taskStatus, analysis }
    }
    if (taskStatus === 'FAILED') {
      dispatch({ type: 'LOAD_PRODUCTS_FROM_API', payload: { enterpriseId, data: null } })
      return { taskStatus, analysis: null }
    }
    return { taskStatus: taskStatus || 'RUNNING', analysis: null }
  }

  const analysis = await fetchStoredAnalysis(enterpriseId)
  dispatch({ type: 'LOAD_PRODUCTS_FROM_API', payload: { enterpriseId, data: analysis || null } })
  if (analysis) await loadTaskHistory(dispatch, enterpriseId).catch(() => null)
  if (analysis) return { taskStatus: taskStatus || 'SUCCESS', analysis }

  return { taskStatus: taskStatus || 'RUNNING', analysis: null }
}

export async function saveEnterpriseAndAnalyze(payload, dispatch) {
  const savedEnterprise = await saveEnterprise(payload, dispatch)
  const analysis = await generateEnterpriseAnalysis(savedEnterprise.id, dispatch)
  return { analysis, enterprise: savedEnterprise }
}

export async function updateEnterpriseSupplement(enterprise, supplementFields, dispatch) {
  const extendedInfo = mergeExtendedInfo(enterprise.extendedInfo, supplementFields)
  const saved = await updateEnterprise(buildEnterpriseUpdatePayload(enterprise, extendedInfo))
  const optimistic = mapEnterpriseVO({ ...enterprise, ...saved, extendedInfo })
  const updated = removeSubmittedMissingFields(optimistic, supplementFields)
  dispatch({ type: 'UPSERT_ENTERPRISE_FROM_API', payload: { ...enterprise, ...saved, extendedInfo } })
  return updated
}

async function waitForAnalysis(enterpriseId, taskId) {
  for (let i = 0; i < 6; i += 1) {
    await delay(2500)
    const status = await fetchAiTaskStatus(taskId)
    const taskStatus = status?.taskStatus || status?.status
    if (taskStatus === 'SUCCESS') return fetchStoredAnalysis(enterpriseId)
    if (taskStatus === 'FAILED') return null
  }
  return null
}

function hasDetectionResult(enterprise) {
  const importTaskStatus = String(enterprise?.importTaskStatus || '').toUpperCase()
  return importTaskStatus === 'SUCCESS'
    || importTaskStatus === 'FAILED'
}

function mergeExtendedInfo(current = [], incoming) {
  const byId = new Map(current.map(item => [item.id || item.label, item]))
  incoming.forEach(item => {
    if (!item.value) return
    byId.set(item.id || item.label, { ...byId.get(item.id || item.label), ...item })
  })
  return Array.from(byId.values())
}

function removeSubmittedMissingFields(enterprise, supplementFields) {
  const submittedIds = new Set(supplementFields.map(field => field.id || field.label).filter(Boolean))
  if (submittedIds.size === 0) return enterprise
  return {
    ...enterprise,
    missingFields: (enterprise.missingFields || []).filter(field => !submittedIds.has(field.id || field.label)),
  }
}

function buildEnterpriseUpdatePayload(enterprise, extendedInfo) {
  return {
    id: String(enterprise.id),
    companyName: enterprise.companyName,
    industry: enterprise.industry,
    contactPerson: enterprise.contactPerson || '',
    contactPhone: enterprise.contactPhone || '',
    revenueMin: String(enterprise.revenueMin || ''),
    revenueMax: String(enterprise.revenueMax || ''),
    financingMin: String(enterprise.financingMin || ''),
    financingMax: String(enterprise.financingMax || ''),
    financingPurpose: enterprise.financingPurpose,
    coreProblems: enterprise.coreProblems,
    assetStatus: enterprise.assetStatus,
    status: 1,
    extendedInfo,
    aiTags: Object.entries(enterprise.aiTags || {}).map(([label, value], index) => ({
      id: label,
      label,
      value,
      sort: index + 1,
    })),
  }
}
