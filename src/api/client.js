// API Service Layer
const BASE = '/apiAgent'
const AUTH_BASE = '/authApi'

function getStoredToken() {
  try {
    const session = JSON.parse(window.localStorage.getItem('cfo-agent-auth') || 'null')
    return session?.token || ''
  } catch {
    return ''
  }
}

async function request(url, options = {}) {
  const token = getStoredToken()
  const isFormData = options.body instanceof FormData
  const { headers: optionHeaders, ...restOptions } = options
  const headers = new Headers(optionHeaders || {})
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(`${BASE}${url}`, {
    ...restOptions,
    headers,
  })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  const data = await res.json()
  if (data.code !== 200 && data.code !== 202 && data.code !== 0) {
    throw new Error(data.msg || data.message || '请求失败')
  }
  return data.data
}

async function authRequest(url, options = {}) {
  const token = getStoredToken()
  const { headers: optionHeaders, ...restOptions } = options
  const headers = new Headers(optionHeaders || {})
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  const res = await fetch(`${AUTH_BASE}${url}`, {
    ...restOptions,
    headers,
  })
  if (!res.ok) throw new Error(`API Error: ${res.status}`)
  const data = await res.json()
  const ok = data.successful === true || data.code === 200 || data.code === 0
  if (!ok) throw new Error(normalizeApiMessage(data.message || data.msg || '请求失败'))
  return data.data ?? data
}

function normalizeApiMessage(message) {
  const map = {
    'MESSAGE.SMS.CAPTCHA_EXPIRED': '验证码已过期或与当前操作不匹配，请重新获取验证码',
    'MESSAGE.SMS.CAPTCHA_ERROR': '验证码不正确，请重新输入',
    'MESSAGE.SMS.CAPTCHA_NOT_FOUND': '请先获取验证码',
  }
  return map[message] || message
}

// === 登录注册接口 ===

export function sendLoginSms({ mobile, autoRegister = false, roleCode }) {
  return authRequest('/sso/send-sms', {
    method: 'POST',
    body: JSON.stringify({ mobile, autoRegister, registerChannel: 'CFO_AGENT', roleCode }),
  })
}

export function loginWithPhoneCode({ mobile, captcha, autoRegister = false, roleCode }) {
  const payload = {
    mobile,
    captcha,
    autoRegister,
    registerChannel: 'CFO_AGENT',
  }
  if (roleCode) payload.roleCode = roleCode
  return authRequest('/sso/login-with-phonecode', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function fetchUserInfo() {
  return authRequest('/users/userinfo', { method: 'POST' })
}

// === 企业客户接口 ===

/** 获取当前用户的企业列表 */
export function fetchEnterpriseList(userId, userRole = 'enterprise') {
  return request('/api/cfo/enterprise/listByCreateUser', {
    method: 'POST',
    body: JSON.stringify({ userId, userRole }),
  })
}

/** CFO 获取融资方全量列表 */
export function fetchAllEnterpriseList() {
  return request('/api/cfo/enterprise/list')
}

/** 获取企业详情 */
export function fetchEnterpriseDetail(id) {
  return request(`/api/cfo/enterprise/${id}/detail`)
}

/** 新增企业 */
export function createEnterprise(data) {
  return request('/api/cfo/enterprise/save-vo', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新企业 */
export function updateEnterprise(data) {
  return request('/api/cfo/enterprise/update-vo', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

// === 融资分析接口 ===

/** 获取最近一次结构化融资分析结果 */
export function fetchStoredAnalysis(enterpriseId) {
  return request(`/cfo/analysis/${enterpriseId}/stored-result`)
}

/** 提交 AI 融资方案分析 */
export function submitAnalysis(enterpriseId) {
  return request(`/cfo/analysis/${enterpriseId}/detail`)
}

/** 查询 AI 任务状态 */
export function fetchAiTaskStatus(taskId) {
  return request(`/cfo/ai-task/${taskId}/status`)
}

/** 根据任务 ID 获取融资方案详情 */
export function fetchAiTaskResult(taskId) {
  return request(`/cfo/ai-task/${taskId}/result`)
}

/** 查询融资方下的多个融资方案 */
export function fetchAiTaskPage(params) {
  return request('/cfo/ai-task/page', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// === AI 路由策略接口 ===

/** 分页查询 AI 路由策略 */
export function fetchAiRoutingPolicies(params) {
  return request('/api/ai-routing-policies/pageQuery', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/** 查询所有 AI 路由策略配置 */
export function fetchAiRoutingPolicyConfigs() {
  return request('/api/ai-routing-policies/configs')
}

/** 查询 AI 路由策略详情 */
export function fetchAiRoutingPolicyDetail(id) {
  if (!id) throw new Error('缺少匹配规则 ID')
  return request(`/api/ai-routing-policies/${id}`)
}

/** 新增 AI 路由策略 */
export function createAiRoutingPolicy(data) {
  return request('/api/ai-routing-policies', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 修改 AI 路由策略 */
export function updateAiRoutingPolicy(id, data) {
  if (!id) throw new Error('缺少匹配规则 ID')
  return request(`/api/ai-routing-policies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

/** 删除 AI 路由策略 */
export function deleteAiRoutingPolicy(id) {
  if (!id) throw new Error('缺少匹配规则 ID')
  return request(`/api/ai-routing-policies/${id}`, {
    method: 'DELETE',
  })
}

// === 资金方接口 ===

/** 获取资金方列表 */
export function fetchInvestorList() {
  return request('/api/cfo/investor/list')
}

/** 获取当前用户关联的资金方列表 */
export function fetchInvestorListByCreateUser(userId, userRole = 'investor') {
  return request('/api/cfo/investor/listByCreateUser', {
    method: 'POST',
    body: JSON.stringify({ userId, userRole }),
  })
}

/** 获取资金方大类列表 */
export function fetchInvestorTopCategories() {
  return request('/api/cfo/investor/category/top-level')
}

/** 获取资金方分类树 */
export function fetchInvestorCategoryTree() {
  return request('/api/cfo/investor/category/tree')
}

/** 获取资金方大类下的表单配置列表 */
export function fetchInvestorCategoryChildren(parentId) {
  if (!parentId) throw new Error('缺少资金方大类 ID')
  return request(`/api/cfo/investor/category/${parentId}/children`)
}

/** 获取资金方分类详情 */
export function fetchInvestorCategoryById(id) {
  if (!id) throw new Error('缺少资金方分类 ID')
  return request(`/api/cfo/investor/category/${id}`)
}

/** 新增资金方分类/表单配置 */
export function saveInvestorCategory(data) {
  return request('/api/cfo/investor/category/save', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新资金方分类/表单配置 */
export function updateInvestorCategory(data) {
  return request('/api/cfo/investor/category/update', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 删除资金方分类/表单配置 */
export function deleteInvestorCategory(id) {
  if (!id) throw new Error('缺少资金方分类 ID')
  return request(`/api/cfo/investor/category/${id}`, {
    method: 'DELETE',
  })
}

/** 获取投资机构动态表单 */
export function fetchInvestorForm(id) {
  if (!id) throw new Error('缺少投资机构 ID')
  return request(`/api/cfo/investor/${id}/form`)
}

/** 新增/修改资金方并提交动态表单 */
export function submitInvestorForm(data) {
  return request('/api/cfo/investor/submit', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 通过邀请码关联已注册资金方机构 */
export function associateInvestorByInvitation(investorId, invitationCode) {
  if (!investorId) throw new Error('缺少本机构 ID，无法关联机构')
  if (!invitationCode) throw new Error('请输入机构邀请码')
  const params = new URLSearchParams({ invitationCode: String(invitationCode).trim().toUpperCase() })
  return request(`/api/cfo/investor/${investorId}/associate-by-invitation?${params.toString()}`, {
    method: 'POST',
  })
}

/** 获取资金方详情 */
export function fetchInvestorDetail(id) {
  return request(`/api/cfo/investor/${id}/detail`)
}

/** 新增资金方机构 */
export function createInvestor(data) {
  return request('/api/cfo/investor/save', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 更新资金方机构 */
export function updateInvestor(data) {
  return request('/api/cfo/investor/update', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** 根据结构化字段同步更新投资机构信息 */
export function syncInvestorFields(id, fields) {
  return request(`/api/cfo/investor/${id}/sync-from-fields`, {
    method: 'POST',
    body: JSON.stringify(fields),
  })
}

/** 提交资金方文本导入解析任务 */
export function uploadInvestorTextFile(file, { userId, userRole } = {}) {
  if (!userId || !userRole) throw new Error('缺少上传解析所需的用户信息，请重新登录后再试')
  const form = new FormData()
  form.append('file', file)
  const params = new URLSearchParams()
  if (userId) params.set('userId', userId)
  if (userRole) params.set('userRole', userRole)
  return request(`/cfo/analysis/upload/text${params.toString() ? `?${params.toString()}` : ''}`, {
    method: 'POST',
    body: form,
  })
}

/** 已有资金方机构补充文本并重新解析 */
export function supplementInvestorJsonText(investorId, text) {
  if (!investorId) throw new Error('缺少投资机构ID，无法补充解析')
  if (!text) throw new Error('请先输入补充文本')
  const form = new URLSearchParams()
  form.set('id', String(investorId))
  form.set('text', text)
  return request('/cfo/analysis/investor/upload/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: form.toString(),
  })
}

/** 已有资金方机构补充文本文件并重新解析 */
export function supplementInvestorFile(investorId, file) {
  if (!investorId) throw new Error('缺少投资机构ID，无法补充解析')
  if (!file) throw new Error('请先选择文件')
  const form = new FormData()
  form.append('file', file)
  return request(`/cfo/analysis/investor/${investorId}/upload/file`, {
    method: 'POST',
    body: form,
  })
}

// === 匹配资金方接口 ===

/** 查询匹配资金方列表 */
export function fetchMatchedInvestors(params) {
  return request('/api/cfo/route-matched-investor/page', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/** 按投资人编码查询匹配投资机会 */
export function fetchInvestorOpportunities(investorIdCode) {
  return request(`/api/cfo/route-matched-investor/investor/${investorIdCode}/opportunities`)
}

/** 更新联系方式查看状态 */
export function updateContactViewStatus(params) {
  return request('/api/cfo/route-matched-investor/contact-view-status', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

// === 问答题库 ===

export function fetchQuestionPage(params) {
  return request('/api/cfo/question/page', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export function saveQuestion(data) {
  return request('/api/cfo/question/save', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateQuestion(data) {
  return request('/api/cfo/question/update', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function deleteQuestion(id) {
  return request(`/api/cfo/question/${id}`, {
    method: 'DELETE',
  })
}
