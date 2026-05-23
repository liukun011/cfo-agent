import { useEffect, useMemo, useState } from 'react'
import {
  buildEmptyMatchingRule,
  getMatchingRuleDetail,
  getMatchingRulesConfig,
  removeMatchingRule,
  saveMatchingRule,
} from '../../../services/matchingRulesService'
import { Icons } from '../../../shared/components/Icons'

const DEFAULT_FILTER = {
  policyName: '',
}

export default function MatchingRulesPage({ onSaved, onError }) {
  const [rules, setRules] = useState([])
  const [fundingSources, setFundingSources] = useState([])
  const [questions, setQuestions] = useState([])
  const [pageInfo, setPageInfo] = useState({ total: 0, pageNum: 1, pageSize: 10 })
  const [filter, setFilter] = useState(DEFAULT_FILTER)
  const [appliedFilter, setAppliedFilter] = useState(DEFAULT_FILTER)
  const [activeRuleId, setActiveRuleId] = useState('')
  const [draftRule, setDraftRule] = useState(null)
  const [mode, setMode] = useState('list')
  const [openCategories, setOpenCategories] = useState({})
  const [isChannelPanelOpen, setIsChannelPanelOpen] = useState(false)
  const [channelSearch, setChannelSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [hasDraftChanges, setHasDraftChanges] = useState(false)

  useEffect(() => {
    loadRules(appliedFilter)
  }, [appliedFilter])

  const activeRulesCount = rules.filter(rule => rule.isActive).length
  const activeRule = draftRule || rules.find(rule => rule.id === activeRuleId) || null
  const firstQuestion = questions[0] || null
  const questionIds = useMemo(() => new Set(questions.map(item => item.id)), [questions])
  const channelIds = useMemo(() => new Set(fundingSources.flatMap(category => (category.children || []).map(item => item.code))), [fundingSources])
  const filteredFundingSources = useMemo(() => {
    const keyword = channelSearch.trim().toLowerCase()
    if (!keyword) return fundingSources
    return fundingSources
      .map(category => ({
        ...category,
        children: (category.children || []).filter(item => (
          `${item.name || ''}${item.code || ''}${item.description || ''}`.toLowerCase().includes(keyword)
        )),
      }))
      .filter(category => (category.children || []).length)
  }, [channelSearch, fundingSources])

  async function loadRules(nextFilter = appliedFilter) {
    setIsLoading(true)
    try {
      const data = await getMatchingRulesConfig({
        pageNum: 1,
        pageSize: 10,
        sortField: 'updatedAt',
        sortOrder: 'desc',
        ...nextFilter,
      })
      setRules(data.rules || [])
      setFundingSources(data.fundingSources || [])
      setQuestions(data.questions || [])
      setPageInfo(data.page || { total: 0, pageNum: 1, pageSize: 10 })
      setOpenCategories(Object.fromEntries((data.fundingSources || []).map(category => [category.id, true])))
      if (!activeRuleId) setActiveRuleId(data.rules?.[0]?.id || '')
    } catch {
      onError?.('金融方案规则加载失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  const openRule = async rule => {
    setIsDetailLoading(true)
    setIsChannelPanelOpen(false)
    setChannelSearch('')
    try {
      const hasConfig = (rule.conditions || []).length || (rule.targets || []).length
      const detail = hasConfig ? rule : await getMatchingRuleDetail(rule.id)
      const normalizedDetail = normalizeRuleForEditor(detail, questions, fundingSources)
      setActiveRuleId(normalizedDetail.id)
      setDraftRule({ ...normalizedDetail, isNew: false })
      setHasDraftChanges(false)
      setMode('editor')
    } catch {
      onError?.('金融方案规则详情加载失败，请稍后重试')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const addRule = () => {
    const next = buildEmptyMatchingRule(firstQuestion)
    setActiveRuleId(next.id)
    setDraftRule(next)
    setIsChannelPanelOpen(false)
    setChannelSearch('')
    setHasDraftChanges(false)
    setMode('editor')
  }

  const deleteRule = async ruleId => {
    if (!ruleId || deletingId) return
    if (typeof window !== 'undefined' && !window.confirm('确认删除这条金融方案规则？')) return
    setDeletingId(ruleId)
    try {
      await removeMatchingRule(ruleId)
      onSaved?.('金融方案规则已删除')
      if (activeRuleId === ruleId) setActiveRuleId('')
      await loadRules(appliedFilter)
    } catch {
      onError?.('金融方案规则删除失败，请稍后重试')
    } finally {
      setDeletingId('')
    }
  }

  const updateActiveRule = patch => {
    setHasDraftChanges(true)
    setDraftRule(prev => ({ ...(prev || activeRule || {}), ...patch }))
  }

  const updateCondition = (index, patch) => {
    if (!activeRule) return
    const conditions = (activeRule.conditions || []).map((condition, idx) => (
      idx === index ? { ...condition, ...patch } : condition
    ))
    updateActiveRule({ conditions })
  }

  const addCondition = () => {
    updateActiveRule({
      conditions: [
        ...(activeRule?.conditions || []),
        { field: firstQuestion?.id || '', label: firstQuestion?.label || '', value: '' },
      ],
    })
  }

  const removeCondition = index => {
    const conditions = (activeRule?.conditions || []).filter((_, idx) => idx !== index)
    updateActiveRule({
      conditions: conditions.length ? conditions : [{ field: firstQuestion?.id || '', label: firstQuestion?.label || '', value: '' }],
    })
  }

  const isTargetSelected = code => Boolean(activeRule?.targets?.some(target => target.code === code))

  const addTarget = item => {
    if (!activeRule || isTargetSelected(item.code)) return
    updateActiveRule({ targets: [...(activeRule.targets || []), { code: item.code, name: item.name }] })
  }

  const removeTarget = index => updateActiveRule({ targets: (activeRule?.targets || []).filter((_, idx) => idx !== index) })

  const moveTarget = (index, direction) => {
    if (!activeRule) return
    const targets = [...(activeRule.targets || [])]
    const next = index + direction
    if (next < 0 || next >= targets.length) return
    ;[targets[index], targets[next]] = [targets[next], targets[index]]
    updateActiveRule({ targets })
  }

  const saveRule = async () => {
    if (!activeRule || isSaving) return
    if (!activeRule.name?.trim()) {
      onError?.('请填写规则名称')
      return
    }
    if (!(activeRule.conditions || []).some(item => item.field && item.value && questionIds.has(item.field))) {
      onError?.('请至少填写一条适用条件')
      return
    }
    if (!(activeRule.targets || []).some(item => item.code && channelIds.has(item.code))) {
      onError?.('请至少选择一个方案通道')
      return
    }
    setIsSaving(true)
    try {
      await saveMatchingRule({
        ...activeRule,
        conditions: (activeRule.conditions || []).filter(item => item.field && item.value && questionIds.has(item.field)),
        targets: (activeRule.targets || []).filter(item => item.code && channelIds.has(item.code)),
      })
      onSaved?.('金融方案规则已保存')
      setHasDraftChanges(false)
      setMode('list')
      setDraftRule(null)
      setIsChannelPanelOpen(false)
      setChannelSearch('')
      await loadRules(appliedFilter)
    } catch {
      onError?.('金融方案规则保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  const applySearch = () => setAppliedFilter({ policyName: filter.policyName.trim() })

  const resetSearch = () => {
    setFilter(DEFAULT_FILTER)
    setAppliedFilter(DEFAULT_FILTER)
  }

  const closeEditor = () => {
    if (hasDraftChanges && typeof window !== 'undefined' && !window.confirm('当前规则还未保存，确认返回列表？')) return
    setMode('list')
    setDraftRule(null)
    setIsChannelPanelOpen(false)
    setChannelSearch('')
    setHasDraftChanges(false)
  }

  if (isLoading) {
    return <div className="page-content"><div className="inline-loading"><span className="spinner" />正在加载金融方案规则...</div></div>
  }

  if (mode === 'editor' && activeRule) {
    const validConditionCount = (activeRule.conditions || []).filter(item => item.field && item.value && questionIds.has(item.field)).length
    const validTargetCount = (activeRule.targets || []).filter(item => item.code && channelIds.has(item.code)).length
    const progressSteps = [
      { label: '基础信息', done: Boolean(activeRule.name?.trim()) },
      { label: '适用条件', done: validConditionCount > 0 },
      { label: '方案通道', done: validTargetCount > 0 },
    ]

    return (
      <div className="page-content matching-rules-page">
        <div className="matching-editor-topbar">
          <button className="btn-text btn-sm matching-editor-back" onClick={closeEditor}>返回</button>
          <div className="matching-editor-title">
            <span>{activeRule.isNew ? '新增规则' : '编辑规则'}</span>
            <strong>{activeRule.name || '未命名规则'}</strong>
          </div>
          <span className={`matching-editor-state ${hasDraftChanges ? 'is-dirty' : activeRule.isActive ? 'is-active' : 'is-paused'}`}>
            {hasDraftChanges ? '未保存' : activeRule.isActive ? '启用中' : '已停用'}
          </span>
        </div>

        <div className="matching-editor-progress" aria-label="规则配置进度">
          {progressSteps.map((step, index) => (
            <div key={step.label} className={`matching-editor-progress-step ${step.done ? 'is-done' : ''}`}>
              <em>{index + 1}</em>
              <span>{step.label}</span>
            </div>
          ))}
        </div>

        <section className="matching-rule-editor-card matching-rule-basic-card">
          <div className="matching-rule-section-head">
            <div><strong>基础信息</strong><p>设置方案规则名称、状态和适用场景。</p></div>
          </div>
          <label className="matching-rule-field">
            <span>规则名称</span>
            <input className="form-input" value={activeRule.name || ''} onChange={event => updateActiveRule({ name: event.target.value })} placeholder="请输入金融方案规则名称" />
          </label>
          <label className="matching-rule-field">
            <span>场景描述</span>
            <textarea className="form-input" value={activeRule.description || ''} onChange={event => updateActiveRule({ description: event.target.value })} placeholder="请输入适用场景" rows={4} />
          </label>
          <label className="matching-rule-switch matching-rule-switch-compact">
            <div><strong>启用规则</strong><p>停用后暂不参与金融方案推荐。</p></div>
            <input type="checkbox" checked={Boolean(activeRule.isActive)} onChange={event => updateActiveRule({ isActive: event.target.checked })} />
          </label>
        </section>

        <section className="matching-rule-editor-card">
          <div className="matching-rule-section-head">
            <div><strong>适用条件</strong><p>条件需全部满足，关键词用 / 分隔。</p></div>
          </div>
          <div className="matching-condition-list">
            {(activeRule.conditions || []).map((condition, index) => (
              <div key={index} className="matching-condition-card">
                <div className="matching-condition-card-head">
                  <div className="matching-condition-index">条件 {index + 1}</div>
                  <button className="matching-condition-remove" onClick={() => removeCondition(index)} aria-label="删除条件">删除</button>
                </div>
                <div className="matching-condition-fields">
                  <label>
                    <span>问题字段</span>
                    <select
                      className="form-input"
                      value={condition.field}
                      onChange={event => {
                        const question = questions.find(item => item.id === event.target.value)
                        updateCondition(index, { field: event.target.value, label: question?.label || '' })
                      }}
                    >
                      <option value="">选择问题字段</option>
                      {condition.field && !questionIds.has(condition.field) && (
                        <option value={condition.field}>{condition.label || condition.field}</option>
                      )}
                      {questions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>关键词</span>
                    <input className="form-input" value={condition.value || ''} onChange={event => updateCondition(index, { value: event.target.value })} placeholder="订单垫资 / 绿色通道 / 高风险" />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-outline btn-sm matching-add-row-btn" onClick={addCondition}>添加条件</button>
        </section>

        <section className="matching-rule-editor-card">
          <div className="matching-rule-section-head">
            <div><strong>方案通道</strong><p>按顺序决定推荐优先级。</p></div>
          </div>
          {(activeRule.targets || []).length > 0 ? (
            <div className="matching-target-list">
              {activeRule.targets.map((target, index) => (
                <div key={`${target.code}-${index}`} className="matching-target-card">
                  <div className="matching-target-rank">P{index + 1}</div>
                  <div><strong>{target.name}</strong><span>{target.code}</span></div>
                  <div className="matching-target-actions">
                    <button onClick={() => moveTarget(index, -1)} disabled={index === 0} aria-label="上移通道">↑</button>
                    <button onClick={() => moveTarget(index, 1)} disabled={index === activeRule.targets.length - 1} aria-label="下移通道">↓</button>
                    <button className="is-danger" onClick={() => removeTarget(index)} aria-label="删除通道">删</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="builder-empty-field">还未选择方案通道</div>
          )}
          <button className="btn-outline btn-sm matching-add-row-btn" onClick={() => setIsChannelPanelOpen(true)}>添加通道</button>
        </section>

        {isChannelPanelOpen && (
          <div className="matching-channel-drawer-backdrop" onClick={() => setIsChannelPanelOpen(false)}>
            <section className="matching-channel-panel matching-channel-drawer" onClick={event => event.stopPropagation()}>
              <div className="matching-channel-panel-head">
                <div>
                  <strong>选择方案通道</strong>
                  <p>{activeRule.targets?.length ? `已选择 ${activeRule.targets.length} 个，可连续添加` : '选择后将按优先级推送'}</p>
                </div>
                <button className="btn-text btn-sm" onClick={() => setIsChannelPanelOpen(false)}>关闭</button>
              </div>
              <input
                className="form-input matching-channel-search"
                value={channelSearch}
                onChange={event => setChannelSearch(event.target.value)}
                placeholder="搜索通道名称"
              />
              <div className="matching-node-categories">
                {filteredFundingSources.map(category => (
                  <div key={category.id} className="matching-node-category">
                    <button className="matching-node-category-head" onClick={() => setOpenCategories(prev => ({ ...prev, [category.id]: !prev[category.id] }))}>
                      <span>{category.name}</span>
                      <em>{category.children?.length || 0}</em>
                      <i className={openCategories[category.id] ? 'is-open' : ''}>{Icons.chevronDown}</i>
                    </button>
                    {openCategories[category.id] && (
                      <div className="matching-node-grid">
                        {(category.children || []).map(item => {
                          const selected = isTargetSelected(item.code)
                          return (
                            <button key={item.code} className={selected ? 'is-selected' : ''} onClick={() => addTarget(item)} disabled={selected}>
                              <span>{item.name}</span>
                              <small>{selected ? '已添加' : '添加'}</small>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
                {filteredFundingSources.length === 0 && (
                  <div className="builder-empty-field">没有找到可添加的方案通道。</div>
                )}
              </div>
              <div className="matching-channel-panel-footer">
                <button className="btn-primary btn-sm" onClick={() => setIsChannelPanelOpen(false)}>完成</button>
              </div>
            </section>
          </div>
        )}

        <div className="matching-editor-sticky-actions">
          <button className="btn-outline btn-sm" onClick={closeEditor}>返回列表</button>
          <button className="btn-primary btn-sm" onClick={saveRule} disabled={isSaving}>{isSaving ? '保存中...' : '保存规则'}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content matching-rules-page">
      <div className="matching-rules-hero">
        <div>
          <span className="form-builder-kicker">方案规则</span>
          <h2 className="page-heading">金融方案规则</h2>
          <p className="page-subtitle">配置不同融资场景适用的金融方案与通道优先级。</p>
        </div>
        <button className="btn-primary btn-sm" onClick={addRule}>新增方案规则</button>
      </div>

      <div className="form-builder-stats">
        <div><span>规则</span><strong>{pageInfo.total || rules.length}</strong></div>
        <div><span>启用</span><strong>{activeRulesCount}</strong></div>
      </div>

      <section className="matching-rule-editor-card matching-rule-filter-card is-basic">
        <div className="matching-filter-title">
          <strong>查询方案规则</strong>
          <span>按规则名称快速查找</span>
        </div>
        <div className="matching-filter-quick">
          <input className="form-input" value={filter.policyName} onChange={event => setFilter(prev => ({ ...prev, policyName: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter') applySearch() }} placeholder="输入规则名称" />
          <button className="btn-primary btn-sm" onClick={applySearch}>查询</button>
          <button className="btn-outline btn-sm" onClick={resetSearch}>重置</button>
        </div>
      </section>

      {isDetailLoading && <div className="inline-loading"><span className="spinner" />正在加载规则详情...</div>}

      <section className="matching-rule-list">
        {rules.map(rule => (
          <article key={rule.id} className={`matching-rule-card ${rule.isActive ? 'is-active' : ''}`}>
            <div className="matching-rule-card-head">
              <div>
                <span className="form-builder-kicker">{rule.isActive ? '启用中' : '已停用'}</span>
                <h3>{rule.name || '未命名规则'}</h3>
              </div>
            </div>
            {rule.description && <p className="matching-rule-description">{rule.description}</p>}
            <div className="matching-rule-preview-lines">
              <div>
                <span>条件</span>
                <strong>{formatConditionPreview(rule.conditions)}</strong>
              </div>
              <div>
                <span>通道</span>
                <strong>{formatTargetPreview(rule.targets)}</strong>
              </div>
            </div>
            <div className="form-config-meta">
              <div><span>条件</span><strong>{rule.conditions?.length || 0}</strong></div>
              <div><span>通道</span><strong>{rule.targets?.length || rule.nodeCount || 0}</strong></div>
              <div><span>状态</span><strong>{rule.isActive ? '启用' : '停用'}</strong></div>
            </div>
            <div className="matching-rule-card-actions">
              <button className="btn-primary btn-sm" onClick={() => openRule(rule)}>编辑规则</button>
              <button className="btn-danger btn-sm" onClick={() => deleteRule(rule.id)} disabled={deletingId === rule.id}>
                {deletingId === rule.id ? '删除中' : '删除'}
              </button>
            </div>
          </article>
        ))}
        {rules.length === 0 && (
          <div className="smart-empty">
            <strong>暂无金融方案规则</strong>
            <p>新增后，可以配置适用条件和方案通道。</p>
            <button className="btn-primary btn-sm" onClick={addRule}>新增方案规则</button>
          </div>
        )}
      </section>
    </div>
  )
}

function formatConditionPreview(conditions = []) {
  const visible = conditions.filter(item => item.label || item.field)
  if (!visible.length) return '暂无条件'
  return visible.slice(0, 2).map(item => item.label || item.field).join(' / ') + (visible.length > 2 ? ` 等 ${visible.length} 项` : '')
}

function formatTargetPreview(targets = []) {
  const visible = targets.filter(item => item.name || item.code)
  if (!visible.length) return '暂无通道'
  return visible.slice(0, 2).map(item => item.name || item.code).join(' / ') + (visible.length > 2 ? ` 等 ${visible.length} 个` : '')
}

function normalizeRuleForEditor(rule, questions, fundingSources) {
  const questionById = new Map(questions.map(item => [item.id, item]))
  const questionByLabel = new Map(questions.map(item => [item.label, item]))
  const channels = fundingSources.flatMap(category => category.children || [])
  const channelById = new Map(channels.map(item => [item.code, item]))
  const channelByName = new Map(channels.map(item => [item.name, item]))
  const channelByRawCode = new Map(channels.filter(item => item.rawCode).map(item => [item.rawCode, item]))

  return {
    ...rule,
    conditions: (rule.conditions || []).map(condition => {
      const question = questionById.get(condition.field) || questionByLabel.get(condition.label)
      return question
        ? { ...condition, field: question.id, label: question.label }
        : condition
    }),
    targets: (rule.targets || []).map(target => {
      const channel = channelById.get(target.code) || channelByName.get(target.name) || channelByRawCode.get(target.code)
      return channel
        ? { ...target, code: channel.code, name: channel.name }
        : target
    }),
  }
}
