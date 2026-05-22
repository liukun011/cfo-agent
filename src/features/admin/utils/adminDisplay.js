export function getCfoVisibleInvestors(product) {
  return product.matchedInvestors || []
}

export function getLatestQuestionSort(questions = []) {
  const maxSort = questions.reduce((max, question) => Math.max(max, Number(question.rawSortOrder ?? question.sortOrder ?? question.sort) || 0), 0)
  return maxSort + 1
}

export function formatDisplayValue(value) {
  const text = String(value ?? '').trim()
  return text || '未填写'
}

export function formatRangeValue(min, max) {
  const minText = formatWanValue(min)
  const maxText = formatWanValue(max)
  if (!minText && !maxText) return '未填写'
  if (!minText) return `${maxText} 万元`
  if (!maxText) return `${minText} 万元`
  if (minText === maxText) return `${minText} 万元`
  return `${minText}-${maxText} 万元`
}

export function formatWanRange(min, max) {
  const minText = formatWanValue(min)
  const maxText = formatWanValue(max)
  if (!minText && !maxText) return ''
  if (!minText) return `${maxText} 万元`
  if (!maxText) return `${minText} 万元`
  if (minText === maxText) return `${minText} 万元`
  return `${minText}-${maxText} 万元`
}

export function getEnterpriseDisplayStatus(enterprise) {
  const analysisStatus = String(enterprise?.analysisTaskStatus || '').toUpperCase()
  const importStatus = String(enterprise?.importTaskStatus || '').toUpperCase()
  if (analysisStatus === 'SUCCESS') return '方案已生成'
  if (analysisStatus === 'RUNNING') return '方案生成中'
  if (importStatus === 'RUNNING') return '资料检测中'
  if ((enterprise?.missingFields || []).length > 0) return '待补充'
  if (!analysisStatus || analysisStatus === 'NONE') return '待生成方案'
  return enterprise?.status || '待处理'
}

export function summarizeInvestorContacts(products = []) {
  const items = []
  const counts = new Map([
    ['已确认', 0],
    ['待确认', 0],
    ['未发起', 0],
    ['待处理', 0],
    ['其他', 0],
  ])

  products.forEach(product => {
    getCfoVisibleInvestors(product).forEach(inv => {
      const status = normalizeContactStatus(inv.status)
      if (counts.has(status)) counts.set(status, counts.get(status) + 1)
      else counts.set('其他', counts.get('其他') + 1)
    })
  })

  counts.forEach((count, label) => {
    if (count > 0) items.push({ label, count })
  })

  const total = items.reduce((sum, item) => sum + item.count, 0)
  return { total, items }
}

export function normalizeContactStatus(status) {
  if (status === '待审核') return '待处理'
  if (status === '已推送') return '已确认'
  return status || '其他'
}

export function isRepeatedExtendedField(item) {
  const label = normalizeFieldLabel(item?.label)
  return EXTENDED_INFO_DUPLICATE_LABELS.has(label)
}

const EXTENDED_INFO_DUPLICATE_LABELS = new Set([
  '企业名称',
  '公司名称',
  '所属行业',
  '所属行业领域',
  '行业',
  '地区',
  '企业地区',
  '融资金额',
  '计划融资金额',
  '本次融资诉求',
  '融资诉求',
  '资金用途',
])

function normalizeFieldLabel(label) {
  return String(label || '').replace(/[：:\s]/g, '')
}

function formatWanValue(value) {
  if (value === null || value === undefined || value === '') return ''
  const num = Number(value)
  if (!Number.isFinite(num)) return String(value)
  if (num === 0) return ''
  return Number.isInteger(num) ? String(num) : String(num).replace(/\.0+$/, '')
}
