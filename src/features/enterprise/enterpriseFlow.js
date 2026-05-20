import { getCurrentUserId } from '../../services/authSession'

export function getChatAnswers(chatLog) {
  return chatLog.filter(msg => msg.role === 'user').map(msg => msg.text)
}

export function buildEnterprisePayload(questions, answers, baseInfo = {}) {
  const entries = questions.map((question, index) => ({
    question,
    answer: answers[index] || '',
  })).filter(item => item.answer.trim())

  const companyName = baseInfo.companyName || extractCompanyName(findAnswer(entries, ['公司名称', '企业名称', '名称'])) || ''
  const industry = baseInfo.industry || findAnswer(entries, ['所属行业', '行业领域', '行业']) || ''
  const finance = findAnswer(entries, ['财务', '营收', '收入', '销售', '利润', '纳税']) || ''
  const demand = findAnswer(entries, ['融资诉求', '融资需求', '融资', '资金用途']) || ''
  const coreProblems = findAnswer(entries, ['核心问题', '经营压力', '业务问题', '痛点']) || ''
  const assetStatus = findAnswer(entries, ['资产', '负债', '抵押', '担保']) || ''
  const qualification = findAnswer(entries, ['资质', '证书', '专利']) || ''
  const revenue = extractFirstWan(finance)
  const financing = extractFirstWan(demand)

  return {
    companyName,
    industry,
    contactPerson: baseInfo.contactPerson || '',
    contactPhone: baseInfo.contactPhone || '',
    revenueMin: revenue ? Math.max(0, Math.round(revenue * 0.75)) : undefined,
    revenueMax: revenue ? Math.round(revenue * 1.25) : undefined,
    financingMin: financing || undefined,
    financingMax: financing || undefined,
    financingPurpose: demand,
    coreProblems,
    assetStatus: [assetStatus, qualification].filter(Boolean).join('；'),
    extendedInfo: entries.map(({ question, answer }, index) => ({
      id: question.id || `question_${index + 1}`,
      label: question.title || `问题 ${index + 1}`,
      value: answer,
      required: true,
      sort: question.sort || index + 1,
      hint: question.text || question.note || '',
    })),
    createdBy: getCurrentUserId(),
    status: 1,
  }
}

export function buildEnterpriseLeadPayload(values) {
  return {
    companyName: String(values.companyName || '').trim(),
    industry: String(values.industry || '').trim(),
    contactPerson: String(values.contactPerson || '').trim(),
    contactPhone: String(values.contactPhone || '').trim(),
    extendedInfo: [],
    aiTags: [],
    createdBy: getCurrentUserId(),
    status: 1,
  }
}

export function buildSummaryText(enterprise, products) {
  const recommended = (products || []).slice(0, 2).map(p => `${p.name}（${p.amount}）`).join(' + ') || '方案生成中'
  return `企业名称：${enterprise?.companyName || ''}\n行业：${enterprise?.industry || ''}\n地区：${enterprise?.region || ''}\n融资金额：${formatWan(enterprise?.financingMin)}\n资金用途：${enterprise?.financingPurpose || ''}\n年营收：${formatWanRange(enterprise?.revenueMin, enterprise?.revenueMax)}\n核心压力：${enterprise?.coreProblems || ''}\n推荐方案：${recommended}`
}

export function buildSupplementPayloadFromMissingFields(missingFields, values) {
  return missingFields
    .map((field, index) => ({
      id: field.id,
      label: field.label,
      value: values[field.id] || '',
      required: field.priority === 'P0' || field.priority === 'P1',
      sort: 100 + index,
      hint: field.suggestedContent || field.priorityReason || '请补充该字段',
    }))
    .filter(item => item.value.trim())
}

function findAnswer(entries, keywords) {
  const entry = entries.find(({ question }) => {
    const text = `${question.title || ''}${question.text || ''}${question.note || ''}`
    return keywords.some(keyword => text.includes(keyword))
  })
  return entry?.answer || ''
}

function extractCompanyName(text) {
  const value = text?.trim()
  if (!value) return ''
  const match = value.match(/(?:公司叫|企业叫|公司名称是|企业名称是|名称是|叫)([^，。,.；;\s]+)/)
  return (match?.[1] || value).trim()
}

function extractFirstWan(text) {
  const match = text?.match(/(\d+(?:\.\d+)?)\s*(?:多)?\s*万/)
  return match ? Number(match[1]) : 0
}

function formatWan(value) {
  return value ? `${value} 万元` : ''
}

function formatWanRange(min, max) {
  if (min && max && Number(min) !== Number(max)) return `${min} - ${max} 万元`
  if (max) return `${max} 万元`
  if (min) return `${min} 万元`
  return ''
}
