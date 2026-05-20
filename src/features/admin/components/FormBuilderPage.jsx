import { useEffect, useMemo, useState } from 'react'
import {
  deleteAdminFormSchemaConfig,
  getAdminFormParentCategories,
  getAdminFormSchemaConfig,
  getAdminFormSchemaList,
  saveAdminFormSchemaConfig,
} from '../../../services/formSchemaService'
import { Icons } from '../../../shared/components/Icons'

const FIELD_TYPES = [
  { type: 'text', label: '单行文本', desc: '机构名称、联系人等短字段' },
  { type: 'textarea', label: '多行文本', desc: '准入要求、流程说明等长内容' },
  { type: 'select', label: '下拉选择', desc: '单项枚举字段' },
  { type: 'radio', label: '单项选择', desc: '互斥选项' },
  { type: 'checkbox', label: '多项选择', desc: '多个偏好或标签' },
]

const FIXED_BASIC_SECTION_ID = 'sec_basic'

function isFixedBasicSection(section) {
  return section?.locked || section?.section_id === FIXED_BASIC_SECTION_ID
}

function isFixedField(field, section) {
  return isFixedBasicSection(section) || field?.locked
}

export default function FormBuilderPage({ onSaved, onError }) {
  const [parentCategories, setParentCategories] = useState([])
  const [selectedParentId, setSelectedParentId] = useState('')
  const [schemaList, setSchemaList] = useState([])
  const [schema, setSchema] = useState(null)
  const [mode, setMode] = useState('list')
  const [active, setActive] = useState({ sectionId: '', fieldId: '' })
  const [addingSectionId, setAddingSectionId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [hasDraftChanges, setHasDraftChanges] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadInitialData() {
      setIsLoading(true)
      try {
        const categories = await getAdminFormParentCategories()
        if (cancelled) return
        setParentCategories(categories)
        const firstParentId = categories?.[0]?.id || ''
        setSelectedParentId(firstParentId)
        setSchemaList([])
        setSchema(null)
      } catch {
        if (!cancelled) onError?.('表单配置加载失败，请稍后重试')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    loadInitialData()
    return () => { cancelled = true }
  }, [onError])

  useEffect(() => {
    if (!selectedParentId || isLoading) return
    let cancelled = false
    setIsDetailLoading(true)
    getAdminFormSchemaList(selectedParentId)
      .then(list => {
        if (cancelled) return
        setSchemaList(list)
        if (mode === 'list') setSchema(list?.[0] || null)
      })
      .catch(() => onError?.('表单配置列表加载失败，请稍后重试'))
      .finally(() => { if (!cancelled) setIsDetailLoading(false) })
    return () => { cancelled = true }
  }, [isLoading, mode, onError, selectedParentId])

  const displaySections = useMemo(() => (
    schema?.sections?.length ? schema.sections : [createFixedBasicSection()]
  ), [schema])

  const activeSection = useMemo(() => (
    displaySections.find(section => section.section_id === active.sectionId) || null
  ), [active.sectionId, displaySections])

  const activeField = useMemo(() => (
    activeSection?.fields?.find(field => field.field_id === active.fieldId) || null
  ), [active.fieldId, activeSection])

  const fieldCount = displaySections.reduce((sum, section) => sum + (section.fields || []).length, 0)
  const selectedParent = parentCategories.find(category => category.id === selectedParentId) || null

  const updateSchema = updater => {
    setHasDraftChanges(true)
    setSchema(prev => updater(prev))
  }

  const openSchema = async target => {
    const next = target || schemaList[0] || schema
    if (!next) return
    setIsDetailLoading(true)
    try {
      const detail = next.id ? await getAdminFormSchemaConfig(next.id, selectedParentId) : next
      const normalizedDetail = detail?.sections?.length ? detail : { ...detail, sections: [createFixedBasicSection()] }
      setSchema(cloneLocal(normalizedDetail))
      const firstSection = normalizedDetail?.sections?.[0]
      setActive({ sectionId: firstSection?.section_id || '', fieldId: '' })
      setAddingSectionId('')
      setHasDraftChanges(false)
      setMode('editor')
    } catch {
      onError?.('表单配置详情加载失败，请稍后重试')
    } finally {
      setIsDetailLoading(false)
    }
  }

  const backToList = () => {
    if (hasDraftChanges && typeof window !== 'undefined' && !window.confirm('当前配置还未保存，确认返回列表？')) return
    setMode('list')
    setActive({ sectionId: '', fieldId: '' })
    setAddingSectionId('')
    setHasDraftChanges(false)
  }

  const createSchema = () => {
    if (!selectedParentId) {
      onError?.('请先选择资金方大类')
      return
    }
    const next = {
      form_id: `form_${Date.now()}`,
      parentId: selectedParentId,
      categoryName: '新建表单配置',
      title: '新建表单配置',
      status: '草稿',
      isActive: true,
      updatedAt: '未保存',
      sections: [
        createFixedBasicSection(),
      ],
    }
    openSchema(next)
  }

  const deleteSchema = async formId => {
    if (!formId || deletingId) return
    setDeletingId(formId)
    try {
      await deleteAdminFormSchemaConfig(formId)
      const list = selectedParentId ? await getAdminFormSchemaList(selectedParentId) : []
      setSchemaList(list)
      if (schema?.form_id === formId || schema?.id === formId) {
        setSchema(null)
        setActive({ sectionId: '', fieldId: '' })
        setAddingSectionId('')
      }
      onSaved?.('表单配置已删除')
    } catch {
      onError?.('表单配置删除失败，请稍后重试')
    } finally {
      setDeletingId('')
    }
  }

  const addSection = () => {
    const id = `sec_${Date.now()}`
    updateSchema(prev => {
      const baseSections = prev?.sections?.length ? prev.sections : [createFixedBasicSection()]
      return {
        ...prev,
        sections: [
          ...baseSections,
          { section_id: id, order: baseSections.length + 1, title: '新建配置模块', fields: [] },
        ],
      }
    })
    setActive({ sectionId: id, fieldId: '' })
    setAddingSectionId(id)
  }

  const updateSchemaMeta = patch => {
    updateSchema(prev => ({
      ...prev,
      ...patch,
      title: Object.prototype.hasOwnProperty.call(patch, 'categoryName') ? patch.categoryName : prev?.title,
    }))
  }

  const removeSection = sectionId => {
    const section = schema?.sections?.find(item => item.section_id === sectionId)
    if (isFixedBasicSection(section)) return
    updateSchema(prev => {
      const sections = (prev?.sections || []).filter(section => section.section_id !== sectionId)
      return { ...prev, sections: normalizeSectionOrder(sections) }
    })
    setActive({ sectionId: '', fieldId: '' })
    setAddingSectionId('')
  }

  const moveSection = (sectionId, direction) => {
    const section = schema?.sections?.find(item => item.section_id === sectionId)
    if (isFixedBasicSection(section)) return
    updateSchema(prev => {
      const sections = [...(prev?.sections || [])]
      const index = sections.findIndex(section => section.section_id === sectionId)
      const next = index + direction
      if (index < 0 || next < 0 || next >= sections.length) return prev
      ;[sections[index], sections[next]] = [sections[next], sections[index]]
      return { ...prev, sections: normalizeSectionOrder(sections) }
    })
  }

  const addField = type => {
    const sectionId = active.sectionId || schema?.sections?.[0]?.section_id
    if (!sectionId) return
    const targetSection = schema?.sections?.find(section => section.section_id === sectionId)
    if (isFixedBasicSection(targetSection)) return
    const template = FIELD_TYPES.find(item => item.type === type) || FIELD_TYPES[0]
    const fieldId = `field_${Date.now()}`
    updateSchema(prev => ({
      ...prev,
      sections: (prev?.sections || []).map(section => {
        if (section.section_id !== sectionId) return section
        const fields = [
          ...(section.fields || []),
          {
            field_id: fieldId,
            order: (section.fields?.length || 0) + 1,
            type,
            label: `新建${template.label}`,
            required: false,
            placeholder: '',
            options: ['select', 'radio', 'checkbox'].includes(type) ? [
              { label: '选项 1', value: 'value_1' },
              { label: '选项 2', value: 'value_2' },
            ] : undefined,
          },
        ]
        return { ...section, fields }
      }),
    }))
    setActive({ sectionId, fieldId })
    setAddingSectionId('')
  }

  const updateSectionTitle = value => {
    if (isFixedBasicSection(activeSection)) return
    updateSchema(prev => ({
      ...prev,
      sections: (prev?.sections || []).map(section => (
        section.section_id === active.sectionId ? { ...section, title: value } : section
      )),
    }))
  }

  const updateField = patch => {
    if (isFixedField(activeField, activeSection)) {
      const allowedPatch = {}
      if (Object.prototype.hasOwnProperty.call(patch, 'placeholder')) allowedPatch.placeholder = patch.placeholder
      if (!Object.keys(allowedPatch).length) return
      patch = allowedPatch
    }
    updateSchema(prev => ({
      ...prev,
      sections: (prev?.sections || []).map(section => (
        section.section_id !== active.sectionId ? section : {
          ...section,
          fields: (section.fields || []).map(field => (
            field.field_id === active.fieldId ? { ...field, ...patch } : field
          )),
        }
      )),
    }))
  }

  const moveField = (fieldId, direction) => {
    if (isFixedBasicSection(activeSection)) return
    updateSchema(prev => ({
      ...prev,
      sections: (prev?.sections || []).map(section => {
        if (section.section_id !== active.sectionId) return section
        const fields = [...(section.fields || [])]
        const index = fields.findIndex(field => field.field_id === fieldId)
        const next = index + direction
        if (index < 0 || next < 0 || next >= fields.length) return section
        ;[fields[index], fields[next]] = [fields[next], fields[index]]
        return { ...section, fields: normalizeFieldOrder(fields) }
      }),
    }))
  }

  const removeField = fieldId => {
    const field = activeSection?.fields?.find(item => item.field_id === fieldId)
    if (isFixedField(field, activeSection)) return
    updateSchema(prev => ({
      ...prev,
      sections: (prev?.sections || []).map(section => (
        section.section_id !== active.sectionId ? section : {
          ...section,
          fields: normalizeFieldOrder((section.fields || []).filter(field => field.field_id !== fieldId)),
        }
      )),
    }))
    setActive(prev => ({ ...prev, fieldId: '' }))
  }

  const toggleSection = sectionId => {
    setActive(prev => (
      prev.sectionId === sectionId
        ? { sectionId: '', fieldId: '' }
        : { sectionId, fieldId: '' }
    ))
    setAddingSectionId('')
  }

  const toggleField = (sectionId, fieldId) => {
    setActive(prev => (
      prev.sectionId === sectionId && prev.fieldId === fieldId
        ? { sectionId, fieldId: '' }
        : { sectionId, fieldId }
    ))
    setAddingSectionId('')
  }

  const addOption = () => {
    const options = activeField?.options || []
    updateField({ options: [...options, { label: `选项 ${options.length + 1}`, value: `value_${options.length + 1}` }] })
  }

  const updateOption = (index, label) => {
    const options = (activeField?.options || []).map((option, optIndex) => (
      optIndex === index ? { ...option, label, value: option.value || `value_${index + 1}` } : option
    ))
    updateField({ options })
  }

  const removeOption = index => {
    const options = (activeField?.options || []).filter((_, optIndex) => optIndex !== index)
    updateField({ options })
  }

  const saveSchema = async () => {
    if (!schema || isSaving) return
    if (!schema.parentId) {
      onError?.('请选择所属资金方大类')
      return
    }
    if (!String(schema.categoryName || schema.title || '').trim()) {
      onError?.('请输入配置名称')
      return
    }
    setIsSaving(true)
    try {
      const saved = await saveAdminFormSchemaConfig(schema)
      setSchema(saved)
      setHasDraftChanges(false)
      if (saved.parentId && saved.parentId !== selectedParentId) setSelectedParentId(saved.parentId)
      const list = await getAdminFormSchemaList(saved.parentId || selectedParentId)
      setSchemaList(list)
      onSaved?.('表单配置已保存')
    } catch {
      onError?.('表单配置保存失败，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <div className="page-content"><div className="inline-loading"><span className="spinner" />正在加载表单配置...</div></div>
  }

  if (mode === 'list') {
    return (
      <div className="page-content form-builder-page">
        <div className="form-builder-hero form-builder-hero-pro">
          <div>
            <span className="form-builder-kicker">动态表单</span>
            <h2 className="page-heading">表单配置</h2>
            <p className="page-subtitle">按资金方类型维护填报字段，资金方侧会按这里的配置展示表单。</p>
          </div>
          <div className="form-builder-hero-metrics">
            <div><span>大类</span><strong>{parentCategories.length}</strong></div>
            <div><span>当前配置</span><strong>{schemaList.length}</strong></div>
          </div>
        </div>

        <section className="form-builder-filter-card">
          <div className="form-builder-filter-head">
            <div>
              <strong>{selectedParent?.name || '选择资金方大类'}</strong>
              <p>当前大类下共有 {schemaList.length} 份表单配置</p>
            </div>
          </div>
          <div className="form-builder-filter-controls">
            <label className="form-builder-select-field">
              <span>资金方大类</span>
              <select
                className="form-input"
                value={selectedParentId}
                onChange={e => setSelectedParentId(e.target.value)}
                disabled={isDetailLoading}
              >
                {parentCategories.map(category => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
                {parentCategories.length === 0 && <option value="">暂无可选大类</option>}
              </select>
            </label>
            <div className="form-builder-filter-summary">
              <span>配置数量</span>
              <strong>{schemaList.length}</strong>
            </div>
            <button className="btn-primary btn-sm" onClick={createSchema} disabled={!selectedParentId}>新增配置</button>
          </div>
        </section>

        <section className="form-config-list">
          {isDetailLoading && <div className="inline-loading"><span className="spinner" />正在加载配置列表...</div>}
          {(schemaList || []).map(item => (
            <article key={item.form_id} className="form-config-card">
              <div className="form-config-card-head">
                <div>
                  <span className="form-builder-kicker">{item.status || '草稿'}</span>
                  <h3>{item.title || '未命名表单'}</h3>
                </div>
                <div className="form-config-actions">
                  <button className="btn-primary btn-sm" onClick={() => openSchema(item)}>编辑表单</button>
                  <button className="btn-danger btn-sm" onClick={() => deleteSchema(item.id || item.form_id)} disabled={deletingId === (item.id || item.form_id)}>
                    {deletingId === (item.id || item.form_id) ? '删除中' : '删除'}
                  </button>
                </div>
              </div>
              <div className="form-config-meta">
                <div><span>模块</span><strong>{item.sectionCount ?? item.sections?.length ?? 0}</strong></div>
                <div><span>字段</span><strong>{item.fieldCount ?? getSchemaFieldCount(item)}</strong></div>
                <div><span>状态</span><strong>{item.isActive === false ? '停用' : '启用'}</strong></div>
              </div>
              <p>{getSchemaModulePreview(item)}</p>
            </article>
          ))}
          {!isDetailLoading && schemaList.length === 0 && (
            <div className="smart-empty">
              <strong>暂无表单配置</strong>
              <p>新建一份配置后，可以维护模块和字段。</p>
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="page-content form-builder-page">
      <div className="form-builder-hero form-builder-editor-hero">
        <div>
          <span className="form-builder-kicker">动态表单</span>
          <h2 className="page-heading">{schema?.title || '表单配置'}</h2>
          <p className="page-subtitle">{hasDraftChanges ? '有未保存修改，请保存后返回。' : '配置模块和字段，保存后用于资金方资料填报。'}</p>
        </div>
        <div className="form-builder-hero-actions">
          <button className="btn-outline btn-sm" onClick={backToList}>返回列表</button>
          <button className="btn-primary btn-sm" onClick={saveSchema} disabled={isSaving}>
            {isSaving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>

      <div className="form-builder-stats">
        <div><span>模块</span><strong>{displaySections.length}</strong></div>
        <div><span>字段</span><strong>{fieldCount}</strong></div>
        <div><span>状态</span><strong>{schema?.isActive === false ? '停用' : '启用'}</strong></div>
      </div>

      <section className="form-builder-meta-card">
        <div className="form-builder-meta-title">
          <span className="form-builder-kicker">配置档案</span>
          <strong>基础信息</strong>
          <p>保存后会成为当前资金方大类下的表单模板。</p>
        </div>
        <div className="form-builder-meta-fields">
          <label className="form-builder-select-field">
            <span>所属大类</span>
            <select className="form-input" value={schema?.parentId || selectedParentId} onChange={e => updateSchemaMeta({ parentId: e.target.value })}>
              {parentCategories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
              {parentCategories.length === 0 && <option value="">暂无可选大类</option>}
            </select>
          </label>
          <label>
            <span>配置名称</span>
            <input
              className="form-input"
              value={schema?.categoryName || schema?.title || ''}
              onChange={e => updateSchemaMeta({ categoryName: e.target.value })}
              placeholder="请输入配置名称"
            />
          </label>
        </div>
        <label className="form-builder-switch-field">
          <span>启用状态</span>
          <button
            type="button"
            className={`form-builder-status-toggle ${schema?.isActive === false ? '' : 'is-on'}`}
            onClick={() => updateSchemaMeta({ isActive: schema?.isActive === false })}
          >
            <i />
            <b>{schema?.isActive === false ? '停用' : '启用'}</b>
          </button>
        </label>
      </section>

      <section className="form-builder-workbench">
        <div className="form-builder-panel-head form-builder-workbench-head">
          <div>
            <strong>配置表单结构</strong>
            <p>展开一个模块，在模块内添加字段并配置属性。</p>
          </div>
          <button className="btn-primary btn-sm" onClick={addSection}>新增模块</button>
        </div>

        <div className="form-builder-sections">
          {displaySections.map((section, sectionIndex) => {
            const isActiveSection = active.sectionId === section.section_id
            const selectedField = isActiveSection ? activeField : null
            const isLockedSection = isFixedBasicSection(section)
            return (
              <div key={section.section_id} className={`builder-section-card builder-section-card-pro ${isActiveSection ? 'is-active' : ''}`}>
                <div className="builder-section-shell">
                  <div className="builder-section-title">
                    <span>{sectionIndex + 1}</span>
                    <strong>{section.title || '未命名模块'}</strong>
                    <small>{isLockedSection ? '固定字段' : `${section.fields?.length || 0} 个字段`}</small>
                  </div>
                  <div className="builder-section-actions">
                    <button className="builder-section-toggle" aria-label={isActiveSection ? '收起模块' : '配置模块'} onClick={() => toggleSection(section.section_id)}>
                      {isActiveSection ? '收起' : '配置'}
                    </button>
                    {!isLockedSection && (
                      <>
                        <button className="builder-move-up" aria-label="上移模块" onClick={() => moveSection(section.section_id, -1)} disabled={sectionIndex === 0}>{Icons.chevronDown}</button>
                        <button aria-label="下移模块" onClick={() => moveSection(section.section_id, 1)} disabled={sectionIndex === (schema?.sections?.length || 0) - 1}>{Icons.chevronDown}</button>
                        <button aria-label="删除模块" onClick={() => removeSection(section.section_id)}>{Icons.trash}</button>
                      </>
                    )}
                  </div>
                </div>

                {isActiveSection && (
                  <div className="builder-section-editor">
                    {!isLockedSection ? (
                      <label className="builder-title-editor">
                        <span>模块标题</span>
                        <input className="form-input" value={section.title || ''} onChange={e => updateSectionTitle(e.target.value)} />
                      </label>
                    ) : (
                      <div className="builder-lock-note">机构基本信息为固定模块，包含机构名称、注册地、联系人、联系电话，不能删除或改名。</div>
                    )}

                    <div className="builder-field-list builder-field-list-pro">
                      {(section.fields || []).map((field, fieldIndex) => {
                        const isActiveField = active.fieldId === field.field_id
                        const isLockedField = isFixedField(field, section)
                        return (
                          <div key={field.field_id} className={`builder-field-card ${isActiveField ? 'is-active' : ''}`}>
                            <button
                              className="builder-field-card-head"
                              onClick={() => toggleField(section.section_id, field.field_id)}
                            >
                              <span>{fieldIndex + 1}</span>
                              <div>
                                <b>{field.label || '未命名字段'}</b>
                                <em>{getFieldTypeLabel(field.type)}{field.required ? ' · 必填' : ' · 选填'}</em>
                              </div>
                              <i>{Icons.chevronDown}</i>
                            </button>

                            {isActiveField && selectedField && (
                              <div className="builder-field-editor">
                                <label>字段标题<input className="form-input" value={selectedField.label || ''} onChange={e => updateField({ label: e.target.value })} disabled={isLockedField} /></label>
                                {isFixedField(selectedField, section) && <div className="builder-lock-note builder-lock-note-compact">固定字段仅可维护提示文本。</div>}
                                <label>提示文本<input className="form-input" value={selectedField.placeholder || ''} onChange={e => updateField({ placeholder: e.target.value })} /></label>
                                <label className="builder-switch"><span>设为必填</span><input type="checkbox" checked={Boolean(selectedField.required)} onChange={e => updateField({ required: e.target.checked })} disabled={isLockedField} /></label>
                                {['select', 'radio', 'checkbox'].includes(selectedField.type) && (
                                  <div className="builder-options">
                                    <div className="builder-options-head"><strong>选项</strong><button className="btn-outline btn-xs" onClick={addOption}>追加</button></div>
                                    {(selectedField.options || []).map((option, index) => (
                                      <div key={index} className="builder-option-row">
                                        <input className="form-input" value={option.label || ''} onChange={e => updateOption(index, e.target.value)} />
                                        <button onClick={() => removeOption(index)} disabled={(selectedField.options || []).length <= 1}>{Icons.trash}</button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {!isLockedField && (
                                  <div className="builder-prop-actions">
                                    <button className="btn-outline btn-sm" onClick={() => moveField(selectedField.field_id, -1)} disabled={fieldIndex === 0}>上移</button>
                                    <button className="btn-outline btn-sm" onClick={() => moveField(selectedField.field_id, 1)} disabled={fieldIndex === (section.fields || []).length - 1}>下移</button>
                                    <button className="btn-danger btn-sm" onClick={() => removeField(selectedField.field_id)}>删除字段</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {(section.fields || []).length === 0 && <div className="builder-empty-field">暂无字段，点击下方“添加字段”开始配置。</div>}
                    </div>

                    {!isLockedSection && <div className={`builder-add-field-box ${addingSectionId === section.section_id ? 'is-open' : ''}`}>
                      <button className="builder-add-field-trigger" onClick={() => setAddingSectionId(prev => prev === section.section_id ? '' : section.section_id)}>
                        <span>{addingSectionId === section.section_id ? '收起字段类型' : '添加字段'}</span>
                        <i>{Icons.chevronDown}</i>
                      </button>
                      {addingSectionId === section.section_id && (
                        <div className="field-type-rail">
                          {FIELD_TYPES.map(item => (
                            <button key={item.type} onClick={() => addField(item.type)}>
                              <strong>{item.label}</strong>
                              <span>{item.desc}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function normalizeSectionOrder(sections) {
  return sections.map((section, index) => ({ ...section, order: index + 1 }))
}

function normalizeFieldOrder(fields) {
  return fields.map((field, index) => ({ ...field, order: index + 1 }))
}

function getFieldTypeLabel(type) {
  return FIELD_TYPES.find(item => item.type === type)?.label || type
}

function getSchemaFieldCount(schema) {
  return (schema?.sections || []).reduce((sum, section) => sum + (section.fields || []).length, 0)
}

function getSchemaModulePreview(schema) {
  const modules = (schema?.sections || [])
    .filter(section => !isFixedBasicSection(section))
    .map(section => section.title)
    .filter(Boolean)
    .slice(0, 3)
  return modules.length ? modules.join(' / ') : '基础字段已固定，可继续添加业务模块'
}

function cloneLocal(value) {
  return JSON.parse(JSON.stringify(value))
}

function createFixedBasicSection() {
  return {
    section_id: FIXED_BASIC_SECTION_ID,
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
}
