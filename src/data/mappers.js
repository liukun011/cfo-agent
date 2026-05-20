function parseMaybeJson(value, fallback) {
  if (!value) return fallback
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normalizeList(value) {
  const parsed = parseMaybeJson(value, [])
  return Array.isArray(parsed) ? parsed : []
}

function pick(obj, ...keys) {
  for (const key of keys) {
    if (obj?.[key] !== undefined && obj?.[key] !== null) return obj[key]
  }
  return undefined
}

export function mapEnterpriseVO(item) {
  const extInfo = normalizeList(item.extendedInfo)
    .map(e => ({ ...e, label: normalizeDisplayLabel(e.label), value: e.value }))
    .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
  const aiTagList = normalizeList(item.aiTags).map(t => ({ label: normalizeDisplayLabel(t.label), value: t.value }))
  const aiDetectInfo = parseMaybeJson(item.aiDetectInfo, item.aiDetectInfo)
  const aiTagObj = {}
  aiTagList.forEach(t => { aiTagObj[t.label] = t.value })
  const region = extInfo.find(e => e.label?.includes('地址') || e.label?.includes('地区'))?.value || item.region || ''

  return {
    id: Number(item.id) || item.id || 0,
    companyName: item.companyName || '',
    industry: item.industry || '',
    contactPerson: item.contactPerson || '',
    contactPhone: item.contactPhone || '',
    region,
    revenueMin: Number(item.revenueMin) || 0,
    revenueMax: Number(item.revenueMax) || 0,
    financingMin: Number(item.financingMin) || 0,
    financingMax: Number(item.financingMax) || 0,
    financingPurpose: item.financingPurpose || '',
    coreProblems: item.coreProblems || '',
    assetStatus: item.assetStatus || '',
    status: mapStatus(item.status),
    analysisTaskStatus: item.analysisTaskStatus || '',
    importTaskStatus: item.importTaskStatus || '',
    extendedInfo: extInfo,
    aiTags: aiTagObj,
    aiDetectInfo: mapAiDetectInfo(aiDetectInfo),
    missingFields: mapMissingFields(aiDetectInfo, item.missingFields),
    qualityAssessment: aiDetectInfo?.quality_assessment || null,
    createdAt: item.createdAt || '',
    createdBy: item.createdBy || '',
  }
}

export function mapQuestionVO(item) {
  return {
    id: String(item.id || ''),
    text: item.description || item.text || item.questionName || '',
    title: item.questionName || '',
    questionName: item.questionName || '',
    questionType: item.questionType || '',
    description: item.description || '',
    sortOrder: Number(item.sortOrder ?? item.sort ?? 0),
    sort: Number(item.sortOrder ?? item.sort ?? 0),
    note: item.questionType || item.note || item.questionName || '',
    deleted: Boolean(item.deleteFlag),
  }
}

export function mapInvestorVO(item, depth = 0) {
  const fields = normalizeList(item.investmentField).map(field => ({
    ...field,
    label: normalizeDisplayLabel(field.label),
    value: field.value ?? '',
  })).sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
  const byId = Object.fromEntries(fields.map(field => [field.id, field.value]))
  const byLabel = Object.fromEntries(fields.map(field => [field.label, field.value]))
  const subInstitutions = depth > 1
    ? []
    : normalizeList(pick(item, 'subInstitutionVOs', 'subInstitutionVOS', 'subInstitutions', 'sub_institution_vos', 'sub_institutions')).map(child => mapInvestorVO(child, depth + 1))
  const mainFlag = normalizeFlag(pick(item, 'mainFlag', 'main_flag'))

  return {
    id: String(item.id || byId.enterprise_id || byId.investor_id || ''),
    investorIdCode: String(item.investorIdCode || byId.investor_id || byId.enterprise_id || item.id || ''),
    name: item.institutionName || byId.institutionName || byId.institution_name || byId.investor_name || byLabel['机构名称'] || '',
    type: item.institutionType || byId.investor_type || byLabel['机构类型'] || '',
    products: byId.product_lines || byId.investment_type || byLabel['产品线/投资工具'] || byLabel['投资/业务类型'] || '',
    industries: byId.investment_field || byLabel['行业/领域偏好'] || '',
    region: byId.registeredAddress || byId.registered_address || byId.address || byId.coverage_area || item.registeredAddress || byLabel['注册地'] || byLabel['注册地址'] || byLabel['覆盖地域范围'] || '',
    amountMin: item.amountMin || parseAmountRange(byId.investment_scale || byLabel['单笔投资金额范围']).min,
    amountMax: item.amountMax || parseAmountRange(byId.investment_scale || byLabel['单笔投资金额范围']).max,
    amountRange: byId.investment_scale || byLabel['单笔投资金额范围'] || '',
    rate: byId.cost_structure || byLabel['利率/估值/综合成本'] || '',
    conditions: byId.risk_control_criteria || byId.access_conditions || byId.preferred_enterprise_profile || byLabel['准入门槛/白名单指标'] || byLabel['准入条件'] || byLabel['偏好企业特征'] || item.investmentDetail || '',
    forbidden: byId.prohibited_entries || byId.negative_industries || byLabel['禁止准入/黑名单/红线'] || byLabel['禁入行业'] || '',
    preferences: byId.preferences || byId.preferred_enterprise_profile || byLabel['特别偏好/加分项'] || byLabel['偏好企业特征'] || item.description || '',
    contactPerson: byId.contactPerson || byId.contact_person || byLabel['对接联系人'] || byLabel['联系人'] || '',
    contactPhone: byId.contactPhone || byId.contact_phone || byLabel['联系电话'] || byLabel['联系方式'] || '',
    invitationCode: pick(
      item,
      'invitationCode',
      'invitation_code',
      'inviteCode',
      'invite_code',
      'invitationCodeValue',
      'invitation_code_value',
      'inviteCodeValue',
      'invite_code_value',
      'institutionInvitationCode',
      'institution_invitation_code',
    ) || '',
    associatedId: pick(item, 'associatedId', 'associated_id') || '',
    associatedName: pick(item, 'associatedName', 'associated_name', 'associatedInstitutionName', 'associated_institution_name', 'parentInstitutionName', 'parent_institution_name') || '',
    mainFlag,
    ownerId: pick(item, 'ownerId', 'owner_id') || '',
    createdAt: item.createdAt || '',
    updatedAt: item.updatedAt || '',
    subInstitutions,
    fields,
    raw: item,
  }
}

export function mapInvestorFieldsToInvestor(fields, base = {}) {
  return mapInvestorVO({ ...base, investmentField: fields })
}

export function mapOpportunityToCapitalRequest(item) {
  const contactViewStatus = pick(item, 'contactViewStatus', 'contact_view_status') || 'NOT_APPLIED'
  return {
    id: item.matchId || `${item.taskId || ''}-${item.investorIdCode || ''}-${item.routeIdCode || ''}`,
    matchId: item.matchId || '',
    taskId: item.taskId || '',
    enterpriseId: Number(item.enterpriseId) || item.enterpriseId || '',
    investorIdCode: item.investorIdCode || '',
    ownerInvestorIdCode: pick(item, 'ownerInvestorIdCode', 'owner_investor_id_code', 'investorId', 'investor_id') || '',
    investorName: item.investorName || '',
    investorType: item.investorType || '',
    routeIdCode: item.routeIdCode || '',
    companyName: item.companyName || '',
    amount: item.totalDemandWan ? `${item.totalDemandWan} 万` : item.amountWan ? `${item.amountWan} 万` : '',
    product: [item.routeName, item.amountWan ? `${item.amountWan} 万` : ''].filter(Boolean).join(' '),
    demandType: item.productType || item.fundPurpose || '',
    pushTime: item.createdAt || '',
    contactViewStatus,
    status: mapContactStatus(contactViewStatus),
    matchRate: parseInt(item.matchScore) || 0,
    matchLabel: item.matchLabel || '',
    missingMaterials: [],
    matchReason: item.matchReasons || '',
    matchRisk: item.matchRisks || item.riskNotes || '',
    routeName: item.routeName || '',
    fundPurpose: item.fundPurpose || '',
    coverageRate: item.coverageRate || '',
    weightedAvgCost: item.weightedAvgCost || '',
    fundingGapWan: item.fundingGapWan || '',
    repaymentSafetyLevel: item.repaymentSafetyLevel || '',
    contactPerson: item.contactPerson || '',
    contactPhone: item.contactPhone || '',
    raw: item,
  }
}

export function mapOpportunitiesToStatistics(opportunities) {
  const requests = (opportunities || []).map(mapOpportunityToCapitalRequest)
  const actionable = requests.filter(item => item.status === '待确认' || item.status === '已确认')
  const connected = requests.filter(item => item.status === '已确认')
  return {
    matchedCount: actionable.length,
    contactExchangedCount: connected.length,
    recentMatches: actionable.map(item => ({
      company: item.status === '已确认' ? item.companyName : '',
      amount: item.amount,
      date: item.pushTime,
      score: item.matchRate,
      product: item.routeName || item.product,
      reason: item.matchReason,
      industry: item.demandType,
      status: item.status === '已确认' ? '已对接' : item.status,
      contactPerson: item.contactPerson,
      contactPhone: item.contactPhone,
    })),
  }
}

function mapStatus(status) {
  const map = { 0: '待处理', 1: '待处理', 2: '已推送', 3: '已完成' }
  if (typeof status === 'string') return map[status] || status
  return map[status] || '待处理'
}

function normalizeFlag(value) {
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true' || String(value).toUpperCase() === 'Y'
}

function mapAiDetectInfo(info) {
  if (!info || !info.company_info) return {}
  const result = {}
  for (const item of info.company_info) {
    if (item.label && item.value) result[item.label] = item.value
  }
  return result
}

function mapMissingFields(info, fallback = []) {
  const fields = info?.missing_fields
  if (!Array.isArray(fields)) return Array.isArray(fallback) ? fallback : []
  return fields.map(field => ({
    id: field.field_id || field.id || field.fieldLabel,
    label: normalizeDisplayLabel(field.field_label || field.label || ''),
    value: field.value || field.content || field.answer || field.current_value || field.currentValue || field.filled_value || field.filledValue || '',
    priority: field.priority || '',
    priorityReason: field.priority_reason || '',
    impact: field.impact_if_missing || '',
    suggestedContent: field.suggested_content || '',
  })).filter(field => field.id && field.label)
}

function normalizeDisplayLabel(label = '') {
  const text = String(label).trim()
  const labelMap = {
    '退出路径预期': '未来发展计划',
    'ESG及绿色金融': '绿色发展情况',
    'ESG 及绿色金融': '绿色发展情况',
  }
  if (labelMap[text]) return labelMap[text]
  return text
    .replace(/ESG\s*及绿色金融/gi, '绿色发展情况')
    .replace(/ESG/gi, '绿色发展')
    .replace(/退出路径预期/g, '未来发展计划')
}

function parseAmountRange(value = '') {
  const numbers = String(value || '').match(/\d+(?:\.\d+)?/g) || []
  if (!numbers.length) return { min: '', max: '' }
  return {
    min: numbers[0],
    max: numbers.length > 1 ? numbers[numbers.length - 1] : numbers[0],
  }
}

export function mapAnalysisToProducts(data) {
  const plan = data?.combination_plan
  if (!plan || !plan.routes) return []
  return plan.routes.map(route => {
    const matchedInvestors = pick(route, 'matchedInvestors', 'matched_investors') || []
    const productType = pick(route, 'productType', 'product_type') || ''
    const priorityLevel = pick(route, 'priorityLevel', 'priority_level') || ''
    const amountWan = pick(route, 'amountWan', 'amount_wan') || 0
    const enhancementNote = pick(route, 'enhancementNote', 'enhancement_note') || ''
    return {
      id: pick(route, 'routeIdCode', 'route_id', 'id'),
      taskId: pick(route, 'taskId', 'task_id') || plan.taskId || plan.task_id,
      name: pick(route, 'routeName', 'route_name') || '',
      tag: `${productType} · ${priorityLevel}`,
      amount: `${amountWan} 万`,
      ratioOfTotal: pick(route, 'ratioOfTotal', 'ratio_of_total') || '',
      term: pick(route, 'term', 'financingTerm', 'financing_term') || '',
      repaymentMethod: pick(route, 'repaymentMethod', 'repayment_method') || '',
      purpose: pick(route, 'fundPurpose', 'fund_purpose') || '',
      score: matchedInvestors.length ? parseScore(pick(matchedInvestors[0], 'matchScore', 'match_score')) : 0,
      description: enhancementNote || pick(route, 'fundPurpose', 'fund_purpose') || '',
      riskNotes: pick(route, 'riskNotes', 'risk_notes') || '',
      matchGapNote: pick(route, 'matchGapNote', 'match_gap_note') || '',
      enhancementNote,
      matchedInvestors: matchedInvestors.map(inv => {
        const contactViewStatus = pick(inv, 'contactViewStatus', 'contact_view_status') || 'NOT_APPLIED'
        const matchId = pick(inv, 'matchId', 'match_id', 'id')
        return {
          id: pick(inv, 'investorIdCode', 'investor_id', 'id'),
          matchId,
          investorIdCode: pick(inv, 'investorIdCode', 'investor_id'),
          taskId: pick(inv, 'taskId', 'task_id') || pick(route, 'taskId', 'task_id') || plan.taskId || plan.task_id,
          name: pick(inv, 'investorName', 'investor_name') || '',
          matchRate: parseScore(pick(inv, 'matchScore', 'match_score')),
          matchReason: pick(inv, 'matchReasons', 'match_reasons') || '',
          matchRisk: pick(inv, 'matchRisks', 'match_risks') || '',
          requiredMaterials: '',
          contactViewStatus,
          status: mapContactStatus(contactViewStatus),
          tags: [pick(inv, 'investorType', 'investor_type'), productType].filter(Boolean),
          contactPerson: pick(inv, 'contactPerson', 'contact_person') || '',
          contactPhone: pick(inv, 'contactPhone', 'contact_phone') || '',
          raw: inv,
        }
      }),
    }
  })
}

function parseScore(value) {
  const num = Number.parseInt(value, 10)
  if (!Number.isFinite(num)) return 0
  return Math.max(0, Math.min(100, num))
}

function mapContactStatus(status) {
  const normalized = String(status || '').trim().toUpperCase()
  const map = {
    NOT_APPLIED: '未发起',
    PENDING_PLATFORM_REVIEW: '待审核',
    PLATFORM_REJECTED: '暂不推送',
    PENDING_INVESTOR_CONFIRM: '待确认',
    INVESTOR_REJECTED: '暂不接收',
    APPROVED: '已确认',
  }
  return map[normalized] || '未发起'
}
