import { INVESTOR_FIELD_DEFINITIONS } from '../data/investorFields'
import {
  deleteInvestorCategory,
  fetchInvestorForm,
  fetchInvestorCategoryById,
  fetchInvestorCategoryChildren,
  fetchInvestorTopCategories,
  saveInvestorCategory,
  submitInvestorForm,
  updateInvestorCategory,
} from '../api/investorApi'

const DEFAULT_ADMIN_SCHEMA = {
  form_id: 'leasing_form_mock',
  title: '租赁公司登记模型',
  status: '启用',
  updatedAt: '2026-05-18 10:00',
  sections: [
    {
      section_id: 'sec_basic',
      order: 1,
      title: '机构基本信息',
      fields: [
        { field_id: 'institution_name', order: 1, type: 'text', label: '机构名称', required: true, placeholder: '请输入机构名称' },
        { field_id: 'contact_phone', order: 2, type: 'text', label: '联系电话', required: true, placeholder: '请输入联系电话' },
        { field_id: 'contact_person', order: 3, type: 'text', label: '对接联系人', required: true, placeholder: '请输入对接联系人' },
      ],
    },
    {
      section_id: 'sec_preference',
      order: 2,
      title: '业务与资产偏好',
      fields: [
        {
          field_id: 'investment_type',
          order: 1,
          type: 'checkbox',
          label: '核心业务模式',
          required: false,
          options: [
            { label: '直接租赁', value: 'direct' },
            { label: '售后回租', value: 'leaseback' },
          ],
        },
        { field_id: 'investment_scale', order: 2, type: 'text', label: '单笔融资额区间', required: true, placeholder: '如 500万-2000万' },
        { field_id: 'investment_field', order: 3, type: 'textarea', label: '偏好设备/行业', required: true, placeholder: '请输入重点关注行业或设备类型' },
      ],
    },
    {
      section_id: 'sec_risk',
      order: 3,
      title: '风控与准入要求',
      fields: [
        { field_id: 'risk_control_criteria', order: 1, type: 'textarea', label: '准入门槛', required: true, placeholder: '收入、毛利率、资质、客户等要求' },
        { field_id: 'required_documents', order: 2, type: 'textarea', label: '进件材料', required: true, placeholder: '请输入申请或尽调材料清单' },
        { field_id: 'business_process', order: 3, type: 'textarea', label: '业务流程', required: true, placeholder: '请输入审批或投决流程' },
      ],
    },
  ],
}

const INVESTOR_SECTION_RULES = [
  { id: 'basic', title: '机构基本信息', maxSort: 9 },
  { id: 'preference', title: '资金偏好', minSort: 10, maxSort: 19 },
  { id: 'terms', title: '产品与交易条件', minSort: 20, maxSort: 29 },
  { id: 'risk', title: '准入与风控', minSort: 30, maxSort: 39 },
  { id: 'process', title: '材料与流程', minSort: 40 },
]

const FIXED_BASIC_SECTION = {
  section_id: 'sec_basic',
  order: 1,
  title: '机构基本信息',
  locked: true,
  fields: [
    { field_id: 'institutionName', order: 1, type: 'text', label: '机构名称', required: true, placeholder: '请输入机构名称', locked: true },
    { field_id: 'registeredAddress', order: 2, type: 'text', label: '注册地', required: true, placeholder: '请输入注册地', locked: true },
    { field_id: 'contactPerson', order: 3, type: 'text', label: '联系人', required: true, placeholder: '请输入联系人', locked: true },
    { field_id: 'contactPhone', order: 4, type: 'text', label: '联系电话', required: true, placeholder: '请输入联系电话', locked: true },
  ],
}

const DEFAULT_ADMIN_SCHEMA_LIST = [
  DEFAULT_ADMIN_SCHEMA,
  {
    form_id: 'equity_form_mock',
    title: '股权投资机构登记模型',
    status: '草稿',
    updatedAt: '2026-05-18 10:00',
    sections: [
      FIXED_BASIC_SECTION,
      {
        section_id: 'sec_equity_preference',
        order: 2,
        title: '投资偏好',
        fields: [
          { field_id: 'investment_stage', order: 1, type: 'text', label: '投资阶段', required: true, placeholder: '如 A轮-B轮' },
          { field_id: 'investment_scale', order: 2, type: 'text', label: '单笔投资金额', required: true, placeholder: '如 3000万-1亿元' },
          { field_id: 'investment_field', order: 3, type: 'textarea', label: '行业偏好', required: true, placeholder: '请输入重点关注行业' },
        ],
      },
    ],
  },
]

export async function getAdminFormParentCategories() {
  const categories = await fetchInvestorTopCategories()
  return cloneSchema((categories || []).map(normalizeCategoryOption))
}

export async function getAdminFormSchemaConfig(id, parentId = '') {
  if (!id) return cloneSchema(normalizeAdminSchema(DEFAULT_ADMIN_SCHEMA_LIST[0]))
  const category = await fetchInvestorCategoryById(id)
  return cloneSchema(categoryToSchema(category, parentId))
}

export async function getAdminFormSchemaList(parentId) {
  if (!parentId) return []
  const categories = await fetchInvestorCategoryChildren(parentId)
  return cloneSchema((categories || []).map(category => withSchemaStats(categoryToSchema(category, parentId))))
}

export async function saveAdminFormSchemaConfig(schema) {
  const normalized = normalizeAdminSchema(schema)
  const payload = schemaToCategoryPayload(normalized)
  if (payload.id) {
    await updateInvestorCategory(payload)
    return cloneSchema(await getAdminFormSchemaConfig(payload.id, payload.parentId))
  }
  const savedId = await saveInvestorCategory(payload)
  const resolvedId = typeof savedId === 'string' ? savedId : savedId?.id
  if (resolvedId) {
    return cloneSchema(await getAdminFormSchemaConfig(resolvedId, payload.parentId))
  }
  return cloneSchema(withSchemaStats(normalized))
}

export async function deleteAdminFormSchemaConfig(id) {
  await deleteInvestorCategory(id)
  return true
}

export async function getInvestorTagFormOptions() {
  const parents = await getAdminFormParentCategories()
  const groups = await Promise.all((parents || []).map(async parent => {
    const schemas = await getAdminFormSchemaList(parent.id)
    return (schemas || [])
      .filter(schema => schema.isActive !== false)
      .map(schema => ({
        id: schema.id || schema.form_id,
        parentId: parent.id,
        parentName: parent.name,
        title: schema.title || schema.categoryName || '未命名表单',
        fieldCount: schema.fieldCount || 0,
        sectionCount: schema.sectionCount || 0,
        raw: schema,
      }))
  }))
  return cloneSchema(groups.flat())
}

export async function getInvestorTagFormSchemaById(id, parentId = '') {
  return cloneSchema(await getAdminFormSchemaConfig(id, parentId))
}

export async function getInvestorFilledTagForm(investorId) {
  const form = await fetchInvestorForm(investorId)
  return normalizeInvestorFilledForm(form)
}

export async function submitInvestorTagForm({ id, categoryId, sections, userId, userRole }) {
  return submitInvestorForm({
    id: id || undefined,
    categoryId,
    category_id: categoryId,
    userId,
    userRole,
    createdBy: userId,
    updatedBy: userId,
    createdByRole: userRole,
    updatedByRole: userRole,
    sections: cloneSchema(sections || []),
  })
}

export function hydrateInvestorTagFormSchema(schema, fields = [], investor = null) {
  const fieldValueMap = buildFieldValueMap(fields, investor)
  return {
    ...schema,
    sections: (schema.sections || []).map(section => ({
      ...section,
      fields: (section.fields || []).map(field => {
        const key = field.field_id || field.id
        const fallback = fieldValueMap.get(key) ?? fieldValueMap.get(field.id) ?? fieldValueMap.get(field.label)
        return {
          ...field,
          field_id: key,
          value: normalizeSchemaValue(fallback ?? field.value, field.type),
        }
      }),
    })),
  }
}

export function updateTagFormFieldValue(schema, fieldId, value) {
  return {
    ...schema,
    sections: (schema.sections || []).map(section => ({
      ...section,
      fields: (section.fields || []).map(field => (
        (field.field_id || field.id) === fieldId ? { ...field, value } : field
      )),
    })),
  }
}

export function getTagFormMissingRequiredLabels(schema) {
  return (schema?.sections || [])
    .flatMap(section => section.fields || [])
    .filter(field => isRequiredField(field) && isEmptyValue(field.value))
    .map(field => field.label || field.field_id || '未命名字段')
}

export function flattenTagFormFields(schema) {
  return (schema?.sections || []).flatMap(section => (
    (section.fields || []).map((field, index) => ({
      id: field.field_id || field.id,
      label: field.label || field.field_id || '',
      value: field.value ?? '',
      required: isRequiredField(field),
      sort: Number(field.sort || field.order || index + 1),
      hint: field.placeholder || field.hint || '',
    }))
  ))
}

export function getInvestorTagFormSchema(fields = []) {
  const source = fields.length ? fields : INVESTOR_FIELD_DEFINITIONS
  const sections = INVESTOR_SECTION_RULES.map(rule => ({
    section_id: `investor_${rule.id}`,
    order: INVESTOR_SECTION_RULES.indexOf(rule) + 1,
    title: rule.title,
    fields: source
      .filter(field => isFieldInSection(field, rule))
      .map((field, index) => ({
        field_id: field.id || field.field_id || `field_${index}`,
        order: Number(field.sort || index + 1),
        type: inferInvestorFieldType(field),
        label: field.label || field.id || '未命名字段',
        required: isRequiredField(field),
        placeholder: field.hint || '请输入字段内容',
        value: normalizeSchemaValue(field.value, inferInvestorFieldType(field)),
      }))
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
  })).filter(section => section.fields.length > 0)

  return {
    form_id: 'investor_tag_form',
    title: '机构业务登记表',
    sections,
  }
}

function normalizeInvestorFilledForm(form = {}) {
  const sections = parseSections(form.sections)
  const categoryId = form.categoryId || form.category_id || form.form_id || ''
  const investorId = form.investorId || form.investor_id || form.id || ''
  return {
    id: categoryId,
    categoryId,
    category_id: categoryId,
    form_id: categoryId || form.formName || 'investor_tag_form',
    parentId: form.parentId || '',
    categoryName: form.categoryName || '',
    title: form.categoryName || form.formName || '机构业务登记表',
    formTemplateKey: form.formName || '',
    investorId,
    sections: sections.map((section, sectionIndex) => ({
      ...section,
      section_id: section.section_id || section.sectionId || `section_${sectionIndex + 1}`,
      order: Number(section.order || sectionIndex + 1),
      fields: (section.fields || []).map((field, fieldIndex) => ({
        ...field,
        field_id: field.field_id || field.id || `field_${sectionIndex + 1}_${fieldIndex + 1}`,
        order: Number(field.order || field.sort || fieldIndex + 1),
        required: isRequiredField(field),
        placeholder: field.placeholder || field.hint || '',
        value: normalizeSchemaValue(field.value, field.type),
      })).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    })).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
  }
}

export function updateSchemaFieldValue(schema, fieldId, value) {
  return {
    ...schema,
    sections: (schema.sections || []).map(section => ({
      ...section,
      fields: (section.fields || []).map(field => (
        field.field_id === fieldId ? { ...field, value } : field
      )),
    })),
  }
}

function isFieldInSection(field, rule) {
  const sort = Number(field.sort || 0)
  if (rule.minSort !== undefined && sort < rule.minSort) return false
  if (rule.maxSort !== undefined && sort > rule.maxSort) return false
  return true
}

function inferInvestorFieldType(field) {
  const text = `${field.id || ''}${field.label || ''}`.toLowerCase()
  const value = String(field.value ?? '')
  if (/criteria|documents|process|profile|entries|preferences|requirement|准入|材料|流程|偏好|要求|清单|说明|红线|特征/.test(text)) return 'textarea'
  if (value.length > 42) return 'textarea'
  return 'text'
}

function normalizeSchemaValue(value, type) {
  if (type === 'checkbox') return normalizeCheckboxValue(value)
  return value ?? ''
}

function normalizeCheckboxValue(value) {
  if (Array.isArray(value)) return value
  if (value === undefined || value === null || value === '') return []
  if (typeof value !== 'string') return [value]
  const text = value.trim()
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // 后端可能直接以中文分隔符保存多选值，继续按文本拆分。
  }
  return text
    .split(/[,，、;；|/\n]+/)
    .map(item => item.trim())
    .filter(Boolean)
}

function buildFieldValueMap(fields = [], investor = null) {
  const map = new Map()
  ;(fields || []).forEach(field => {
    const value = field.value ?? ''
    if (field.id) map.set(field.id, value)
    if (field.field_id) map.set(field.field_id, value)
    if (field.label) map.set(field.label, value)
  })
  if (investor) {
    const name = investor.name || map.get('institutionName') || map.get('institution_name') || map.get('investor_name') || ''
    const address = investor.registeredAddress || investor.region || map.get('registeredAddress') || map.get('registered_address') || map.get('address') || map.get('coverage_area') || ''
    const phone = investor.contactPhone || map.get('contactPhone') || map.get('contact_phone') || ''
    const person = investor.contactPerson || map.get('contactPerson') || map.get('contact_person') || ''
    map.set('institutionName', name)
    map.set('institution_name', name)
    map.set('investor_name', name)
    map.set('registeredAddress', address)
    map.set('registered_address', address)
    map.set('address', address)
    map.set('coverage_area', address)
    map.set('contactPhone', phone)
    map.set('contact_phone', phone)
    map.set('contactPerson', person)
    map.set('contact_person', person)
    map.set('investor_type', investor.type || map.get('investor_type') || '')
  }
  return map
}

function isEmptyValue(value) {
  if (Array.isArray(value)) return value.length === 0
  return !String(value ?? '').trim()
}

function normalizeSectionRequiredFlags(sections = []) {
  return (sections || []).map(section => ({
    ...section,
    fields: (section.fields || []).map(field => ({
      ...field,
      required: isRequiredField(field),
    })),
  }))
}

function isRequiredField(field = {}) {
  return normalizeRequiredFlag(field.required)
}

function normalizeRequiredFlag(value) {
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y', 'required'].includes(value.trim().toLowerCase())
  }
  return value === true || value === 1
}

function cloneSchema(schema) {
  return JSON.parse(JSON.stringify(schema))
}

function normalizeAdminSchema(schema) {
  const sourceSections = schema?.sections || []
  const basicSection = normalizeBasicSection(sourceSections.find(isBasicSectionLike))
  const sections = sourceSections.filter(section => !isBasicSectionLike(section))
  return {
    ...schema,
    sections: [
      basicSection || cloneSchema(FIXED_BASIC_SECTION),
      ...sections.map((section, index) => ({ ...section, order: index + 2 })),
    ],
  }
}

function isBasicSectionLike(section = {}) {
  return section.locked ||
    section.section_id === FIXED_BASIC_SECTION.section_id ||
    section.sectionId === FIXED_BASIC_SECTION.section_id ||
    /机构基本信息/.test(section.title || '')
}

function normalizeBasicSection(section = null) {
  const fields = section?.fields || []
  const fixedFields = [
    ensureBasicField(fields, 0, ['institutionName', 'institution_name', 'investor_name'], ['机构名称', '机构全称'], FIXED_BASIC_SECTION.fields[0]),
    ensureBasicField(fields, 1, ['registeredAddress', 'registered_address', 'address', 'coverage_area'], ['注册地', '注册地址', '所在地区', '所在地', '地址'], FIXED_BASIC_SECTION.fields[1]),
    ensureBasicField(fields, 2, ['contactPerson', 'contact_person'], ['联系人', '对接联系人'], FIXED_BASIC_SECTION.fields[2]),
    ensureBasicField(fields, 3, ['contactPhone', 'contact_phone'], ['联系电话', '联系方式', '手机号'], FIXED_BASIC_SECTION.fields[3]),
  ]
  const fixedIds = new Set(fixedFields.map(field => field.field_id || field.id).filter(Boolean))
  const restFields = fields.filter(field => !fixedIds.has(field.field_id || field.id))
  return {
    ...(section || {}),
    section_id: section?.section_id || section?.sectionId || FIXED_BASIC_SECTION.section_id,
    order: 1,
    title: '机构基本信息',
    locked: true,
    fields: [...fixedFields, ...restFields].map((field, index) => ({
      ...field,
      field_id: field.field_id || field.id || FIXED_BASIC_SECTION.fields[index]?.field_id || `basic_${index + 1}`,
      order: index + 1,
      type: field.type || 'text',
      required: index < fixedFields.length ? true : isRequiredField(field),
      locked: true,
    })),
  }
}

function ensureBasicField(fields, index, ids, labels, fallback) {
  const matched = pickBasicField(fields, ids, labels)
  return matched ? { ...fallback, ...matched } : cloneSchema(fallback)
}

function pickBasicField(fields, ids, labels) {
  return fields.find(field => ids.includes(field.field_id || field.id)) ||
    fields.find(field => labels.some(label => String(field.label || '').includes(label)))
}

function normalizeCategoryOption(category = {}) {
  return {
    id: category.id || '',
    name: category.name || category.categoryName || '未命名大类',
    code: category.code || category.categoryCode || '',
    level: normalizeCategoryLevel(category.level ?? category.categoryLevel, 1),
    sortOrder: Number(category.sortOrder || 0),
  }
}

function categoryToSchema(category = {}, parentId = '') {
  const sections = normalizeSectionRequiredFlags(parseSections(category.sections))
  return normalizeAdminSchema({
    id: category.id || '',
    form_id: category.id || category.code || category.categoryCode || `category_${Date.now()}`,
    parentId: category.parentId || parentId || '',
    categoryName: category.name || category.categoryName || '未命名配置',
    title: category.name || category.categoryName || '未命名配置',
    categoryCode: category.code || category.categoryCode || '',
    formTemplateKey: category.formName || category.formTemplateKey || '',
    status: category.isActive === false ? '停用' : '启用',
    isActive: category.isActive !== false,
    sortOrder: Number(category.sortOrder || 0),
    description: category.description || '',
    sections,
    updatedAt: category.updatedAt || '',
  })
}

function withSchemaStats(schema) {
  const normalized = normalizeAdminSchema(schema)
  return {
    ...normalized,
    sectionCount: normalized.sections.length,
    fieldCount: normalized.sections.reduce((sum, section) => sum + (section.fields || []).length, 0),
  }
}

function schemaToCategoryPayload(schema) {
  const normalized = normalizeAdminSchema(schema)
  const categoryName = normalized.categoryName || normalized.title || '未命名配置'
  return {
    id: normalized.id || undefined,
    parentId: normalized.parentId || undefined,
    categoryName,
    categoryCode: normalized.categoryCode || generateCategoryCode(categoryName),
    categoryLevel: normalized.parentId ? 2 : 1,
    sortOrder: Number(normalized.sortOrder || 0),
    formTemplateKey: normalized.formTemplateKey || generateFormTemplateKey(categoryName),
    description: normalized.description || '',
    isActive: normalized.isActive !== false,
    sections: JSON.stringify(normalized.sections || []),
  }
}

function normalizeCategoryLevel(value, fallback = 1) {
  if (typeof value === 'boolean') return value ? 1 : 2
  const numberValue = Number(value)
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback
}

function parseSections(sections) {
  if (Array.isArray(sections)) return sections
  if (typeof sections === 'string' && sections.trim()) {
    try {
      const parsed = JSON.parse(sections)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

function generateCategoryCode(name) {
  return `category_${slugify(name)}`
}

function generateFormTemplateKey(name) {
  return `form_${slugify(name)}`
}

function slugify(text) {
  const raw = String(text || '').trim()
  const ascii = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return ascii || String(Date.now())
}
