import {
  createAiRoutingPolicy,
  deleteAiRoutingPolicy,
  fetchAiRoutingPolicies,
  fetchAiRoutingPolicyConfigs,
  fetchAiRoutingPolicyDetail,
  fetchInvestorCategoryTree,
  fetchQuestionPage,
  updateAiRoutingPolicy,
} from '../api'

const DEFAULT_QUERY = {
  pageNum: 1,
  pageSize: 10,
  sortField: 'updatedAt',
  sortOrder: 'desc',
  policyName: '',
  state: '',
  description: '',
}

export async function getMatchingRulesConfig(query = {}) {
  const [rulesPage, fundingSources, questions] = await Promise.all([
    fetchAiRoutingPolicies({ ...DEFAULT_QUERY, ...query }),
    fetchInvestorCategoryTree(),
    fetchQuestionPage({ pageNum: 1, pageSize: 100 }),
  ])
  const configs = await fetchAiRoutingPolicyConfigs().catch(() => [])
  const configMap = new Map((Array.isArray(configs) ? configs : []).map(item => [item.id, item]))

  const records = Array.isArray(rulesPage?.records) ? rulesPage.records : []
  return {
    rules: records.map(record => normalizePolicy(mergePolicyConfig(record, configMap.get(record.id)))),
    fundingSources: normalizeFundingSources(fundingSources),
    questions: normalizeQuestions(questions),
    page: {
      pageNum: rulesPage?.pageNum || query.pageNum || DEFAULT_QUERY.pageNum,
      pageSize: rulesPage?.pageSize || query.pageSize || DEFAULT_QUERY.pageSize,
      total: rulesPage?.total || 0,
      pages: rulesPage?.pages || 0,
    },
  }
}

export async function getMatchingRuleDetail(id) {
  const detail = await fetchAiRoutingPolicyDetail(id)
  return normalizePolicy(detail)
}

export async function saveMatchingRule(rule) {
  const payload = ruleToPayload(rule)
  const saved = rule?.isNew || !rule?.id
    ? await createAiRoutingPolicy(payload)
    : await updateAiRoutingPolicy(rule.id, payload)
  if (saved?.id || saved?.policyName) return normalizePolicy(saved)
  const resolvedId = typeof saved === 'string' ? saved : rule?.id
  return normalizePolicy({ ...payload, id: resolvedId || '' })
}

export async function removeMatchingRule(id) {
  await deleteAiRoutingPolicy(id)
  return true
}

export function buildEmptyMatchingRule(question = null) {
  return {
    id: `draft_${Date.now()}`,
    isNew: true,
    name: '新建匹配规则',
    description: '',
    isActive: true,
    conditions: [
      {
        field: question?.id || '',
        label: question?.label || '',
        value: '',
      },
    ],
    targets: [],
  }
}

function normalizePolicy(policy = {}) {
  const config = policy.config || policy
  const pipeline = Array.isArray(config.pipeline) ? config.pipeline : []
  const constraints = Array.isArray(config.constraints) ? config.constraints : []
  return {
    id: policy.id || config.id || '',
    name: config.policyName || policy.policyName || '未命名规则',
    description: config.description || policy.description || '',
    isActive: (config.state || policy.state || 'ACTIVE') === 'ACTIVE',
    state: config.state || policy.state || 'ACTIVE',
    isNew: false,
    nodeCount: policy.nodeCount ?? pipeline.length,
    createdAt: policy.createdAt || '',
    updatedAt: policy.updatedAt || '',
    conditions: constraints.map(item => ({
      field: item.field || '',
      label: item.label || item.field || '',
      value: item.value || '',
      operator: item.operator || 'MATCH_ANY',
    })),
    targets: pipeline
      .slice()
      .sort((a, b) => Number(a.priorityLevel || 0) - Number(b.priorityLevel || 0))
      .map(item => ({
        code: item.endpointCode || '',
        name: item.endpointName || item.endpointCode || '',
        priorityLevel: item.priorityLevel || 0,
      })),
  }
}

function mergePolicyConfig(record = {}, config = null) {
  if (!config) return record
  return {
    ...record,
    config: {
      ...config,
      id: config.id || record.id,
      policyName: config.policyName || record.policyName,
      description: config.description || record.description,
      state: config.state || record.state,
    },
  }
}

function ruleToPayload(rule = {}) {
  return {
    id: rule.isNew ? undefined : rule.id,
    policyName: rule.name || '未命名规则',
    state: rule.isActive ? 'ACTIVE' : 'SUSPENDED',
    description: rule.description || '',
    evaluationLogic: 'AND',
    constraints: (rule.conditions || [])
      .filter(condition => condition.field && condition.value)
      .map(condition => ({
        field: condition.field,
        label: condition.label || condition.field,
        value: condition.value,
        operator: 'MATCH_ANY',
      })),
    pipeline: (rule.targets || [])
      .filter(target => target.code)
      .map((target, index) => ({
        endpointCode: target.code,
        endpointName: target.name || target.code,
        priorityLevel: index + 1,
      })),
  }
}

function normalizeFundingSources(categories = []) {
  return (Array.isArray(categories) ? categories : [])
    .slice()
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map(category => ({
      id: category.id || category.code || category.name,
      name: category.name || category.categoryName || '未命名大类',
      code: category.code || category.id,
      description: category.description || '',
      children: (category.children || [])
        .slice()
        .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
        .map(child => ({
          id: child.id || child.code || child.name,
          code: child.id || child.code || child.name,
          rawCode: child.code || '',
          name: child.name || child.categoryName || '未命名通道',
          description: child.description || '',
        })),
    }))
}

function normalizeQuestions(page = {}) {
  const records = Array.isArray(page?.records) ? page.records : Array.isArray(page) ? page : []
  return records
    .slice()
    .sort((a, b) => Number(a.sortOrder || a.sort || 0) - Number(b.sortOrder || b.sort || 0))
    .map(item => ({
      id: String(item.id || item.questionId || ''),
      label: String(item.questionName || item.name || '').trim(),
      description: String(item.description || item.questionText || '').trim(),
    }))
    .filter(item => item.id && item.label)
}
