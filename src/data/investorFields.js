export const HIDDEN_INVESTOR_FIELD_IDS = new Set(['enterprise_id', 'investor_id'])

export const INVESTOR_FIELD_DEFINITIONS = [
  { id: 'investor_name', label: '机构名称', required: true, sort: 1, hint: '请输入资金方机构名称' },
  { id: 'investor_type', label: '机构类型', required: true, sort: 2, hint: '如银行、担保公司、融资租赁、股权基金等' },
  { id: 'legal_representative', label: '法定代表人', required: false, sort: 3, hint: '机构法定代表人，未提及时可填“未提及”' },
  { id: 'coverage_area', label: '覆盖地域范围', required: true, sort: 4, hint: '资金覆盖或重点服务地区' },
  { id: 'contact_person', label: '对接联系人', required: false, sort: 5, hint: '对接联系人' },
  { id: 'contact_phone', label: '联系电话', required: true, sort: 6, hint: '联系电话或其他联系方式' },
  { id: 'investment_type', label: '投资/业务类型', required: true, sort: 10, hint: '如股权投资、债权融资、融资租赁等' },
  { id: 'investment_scale', label: '单笔投资金额范围', required: true, sort: 11, hint: '单笔可投/可放款金额范围' },
  { id: 'fund_total_scale', label: '基金/资金池总规模', required: false, sort: 12, hint: '基金或资金池总规模' },
  { id: 'investment_stage', label: '投资阶段偏好', required: true, sort: 13, hint: '如A轮、B轮、Pre-IPO、成熟期等' },
  { id: 'investment_field', label: '行业/领域偏好', required: true, sort: 14, hint: '重点关注或适配的行业领域' },
  { id: 'preferred_enterprise_profile', label: '偏好企业特征', required: false, sort: 15, hint: '偏好的阶段、区域、资产或资质' },
  { id: 'product_lines', label: '产品线/投资工具', required: true, sort: 16, hint: '如普通股、可转债、明股实债、售后回租等' },
  { id: 'cost_structure', label: '利率/估值/综合成本', required: true, sort: 20, hint: '利率、估值或综合资金成本' },
  { id: 'financing_term', label: '融资/投资期限', required: true, sort: 21, hint: '融资期限或预期持有期' },
  { id: 'collateral_requirement', label: '抵押/担保要求', required: true, sort: 22, hint: '抵押物、担保或信用类要求' },
  { id: 'repayment_method', label: '还款/退出方式', required: true, sort: 23, hint: '还款方式、IPO、并购、回购等退出方式' },
  { id: 'valuation_adjustment', label: '对赌/估值调整机制', required: false, sort: 24, hint: '对赌条款、估值调整或里程碑安排' },
  { id: 'control_rights', label: '控制权/股东权利要求', required: false, sort: 25, hint: '董事席位、否决权、治理改造等要求' },
  { id: 'risk_control_criteria', label: '准入门槛/白名单指标', required: true, sort: 30, hint: '收入、毛利率、资质、客户、技术成熟度等准入指标' },
  { id: 'prohibited_entries', label: '禁止准入/黑名单/红线', required: true, sort: 31, hint: '不接受的行业、模式、风险或企业类型' },
  { id: 'max_leverage_ratio', label: '负债率上限', required: false, sort: 32, hint: '可接受的资产负债率上限' },
  { id: 'min_revenue_profit', label: '最低收入/利润要求', required: false, sort: 33, hint: '最低营收、利润、毛利率等财务门槛' },
  { id: 'cashflow_requirement', label: '现金流要求', required: false, sort: 34, hint: '经营现金流、回款或现金流覆盖要求' },
  { id: 'loss_tolerance', label: '亏损容忍度', required: false, sort: 35, hint: '对亏损、风险和估值波动的容忍说明' },
  { id: 'preferences', label: '特别偏好/加分项', required: false, sort: 36, hint: '特别偏好或加分项' },
  { id: 'required_documents', label: '进件材料/尽调清单', required: true, sort: 40, hint: '申请或尽调所需材料' },
  { id: 'business_process', label: '业务流程/决策链路', required: true, sort: 41, hint: '从初筛到投决/放款的流程' },
  { id: 'decision_cycle', label: '决策周期', required: false, sort: 42, hint: '预计审批、投决或放款周期' },
]

export function buildInvestorFieldDrafts(fields = []) {
  const byId = new Map(fields.map(field => [field.id, field]))
  return INVESTOR_FIELD_DEFINITIONS.map(template => {
    const existing = byId.get(template.id)
    return {
      ...template,
      ...existing,
      label: template.label,
      required: template.required,
      sort: template.sort,
      hint: existing?.hint || template.hint,
      value: existing?.value ?? '',
    }
  })
}

export function buildInvestorFieldsPayload(drafts = [], existingFields = []) {
  const fixedIds = new Set(INVESTOR_FIELD_DEFINITIONS.map(field => field.id))
  const hiddenFields = (existingFields || []).filter(field => HIDDEN_INVESTOR_FIELD_IDS.has(field.id) || !fixedIds.has(field.id))
  const fields = drafts.map((field, index) => ({
    id: field.id,
    label: field.label,
    value: field.value ?? '',
    required: Boolean(field.required),
    sort: Number(field.sort ?? index + 1),
    hint: field.hint || '',
  }))
  return [...hiddenFields, ...fields].sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
}

export function fieldsToInvestorCreatePayload(fields, extra = {}) {
  const byId = Object.fromEntries((fields || []).map(field => [field.id, field.value ?? '']))
  return {
    institutionName: byId.institutionName || byId.institution_name || byId.investor_name || '',
    institutionType: byId.investor_type || '',
    registeredAddress: byId.registeredAddress || byId.registered_address || byId.address || byId.coverage_area || '',
    investmentDetail: byId.risk_control_criteria || byId.preferred_enterprise_profile || '',
    contactPerson: byId.contactPerson || byId.contact_person || '',
    contactPhone: byId.contactPhone || byId.contact_phone || '',
    description: byId.preferred_enterprise_profile || '',
    deleteFlag: false,
    ...extra,
    investmentField: JSON.stringify(fields),
  }
}
