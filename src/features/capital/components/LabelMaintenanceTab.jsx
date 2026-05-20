import { getInvestorTagFormSchema } from '../../../services/formSchemaService'

export default function LabelMaintenanceTab({
  investor,
  showProfileImport,
  labelSaveNotice,
  hasUnsavedLabelWork,
  canSaveLabels,
  missingRequiredLabels,
  isSavingLabels,
  loading,
  requiredProgress,
  saveLabelText,
  visibleLabelDrafts,
  formSchema,
  formOptions = [],
  selectedFormId,
  isLoadingTagForms,
  onSaveLabels,
  onUpdateLabelDraft,
  onSelectForm,
}) {
  const resolvedFormSchema = formSchema || getInvestorTagFormSchema(visibleLabelDrafts)
  const saveDisabled = isSavingLabels || loading || !canSaveLabels || (investor && !hasUnsavedLabelWork)

  return (
    <div className="page-content">
      <div className="section-title-row tag-form-title-row">
        <div>
          <h2 className="page-heading">机构资料</h2>
          <p className="page-subtitle">{investor ? '维护本机构资料与资金偏好。' : '选择表单配置并补齐必填资料。'}</p>
        </div>
      </div>

      {(labelSaveNotice || hasUnsavedLabelWork) && (
        <div className="label-save-notice">
          <div>
            <strong>{hasUnsavedLabelWork ? '有未保存修改' : '资料已保存'}</strong>
            <span>{labelSaveNotice || (canSaveLabels ? '核对无误后保存生效。' : `还差 ${missingRequiredLabels.length} 项必填信息`)}</span>
          </div>
        </div>
      )}

      <div className="tag-form-renderer">
          <div className="tag-form-head tag-form-head-compact">
            <div>
              <strong>{resolvedFormSchema.title}</strong>
              <p>{canSaveLabels ? '字段已就绪，保存后生效。' : `还差 ${missingRequiredLabels.length} 项必填信息`}</p>
            </div>
            <div className="tag-form-head-actions">
              <span>{resolvedFormSchema.sections.reduce((sum, section) => sum + section.fields.length, 0)} 项</span>
              <span>{requiredProgress}%</span>
            </div>
          </div>
          <div className="tag-form-selector">
            <label className="form-builder-select-field">
              <span>表单配置</span>
              <select
                className="form-input"
                value={selectedFormId || ''}
                onChange={e => onSelectForm?.(e.target.value)}
                disabled={isLoadingTagForms || formOptions.length === 0}
              >
                {formOptions.map(option => (
                  <option key={option.id} value={option.id}>
                    {option.parentName ? `${option.parentName} / ` : ''}{option.title}
                  </option>
                ))}
                {formOptions.length === 0 && <option value="">暂无可选表单</option>}
              </select>
            </label>
            {isLoadingTagForms && <span className="tag-form-selector-loading">加载中...</span>}
          </div>
          {resolvedFormSchema.sections.map(section => (
            <section key={section.section_id} className="dynamic-form-section">
              <div className="dynamic-form-section-head">
                <span />
                <h3>{section.title}</h3>
              </div>
              <div className="dynamic-form-fields">
                {section.fields.map(field => (
                  <DynamicTagField
                    key={field.field_id}
                    field={field}
                    onChange={value => onUpdateLabelDraft(field.field_id, value)}
                  />
                ))}
              </div>
            </section>
          ))}
        {loading && <div className="inline-loading label-form-loading"><span className="spinner" />正在加载机构资料...</div>}
        <div className={`tag-form-bottom-save ${canSaveLabels ? 'is-ready' : 'is-incomplete'}`}>
          <div>
            <strong>{canSaveLabels ? (hasUnsavedLabelWork ? '可保存修改' : '表单已同步') : '必填项未完成'}</strong>
            <span>{canSaveLabels ? '核对无误后保存。' : `还差 ${missingRequiredLabels.length} 项`}</span>
          </div>
          <button className="btn-primary btn-sm" onClick={onSaveLabels} disabled={saveDisabled}>
            {canSaveLabels ? saveLabelText : `还差 ${missingRequiredLabels.length} 项`}
          </button>
        </div>
      </div>
    </div>
  )
}

function DynamicTagField({ field, onChange }) {
  const value = field.value ?? (field.type === 'checkbox' ? [] : '')
  return (
    <div className="dynamic-form-field">
      <label className="dynamic-form-label">
        <span>{field.label}{field.required && <b>*</b>}</span>
        <em>{field.required ? '必填' : '选填'}</em>
      </label>
      {renderControl(field, value, onChange)}
      {field.placeholder && <p className="dynamic-form-hint">{field.placeholder}</p>}
    </div>
  )
}

function renderControl(field, value, onChange) {
  if (field.type === 'textarea') {
    return <textarea className="form-textarea dynamic-form-control" rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || '请输入详细内容'} />
  }
  if (field.type === 'select') {
    return (
      <select className="form-input dynamic-form-control" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">请选择</option>
        {(field.options || []).map(option => <option key={option.value || option.label} value={option.value || option.label}>{option.label}</option>)}
      </select>
    )
  }
  if (field.type === 'radio') {
    return (
      <div className="dynamic-choice-list">
        {(field.options || []).map(option => {
          const optionValue = option.value || option.label
          return (
            <label key={optionValue} className={`dynamic-choice ${value === optionValue ? 'is-selected' : ''}`}>
              <input type="radio" name={field.field_id} value={optionValue} checked={value === optionValue} onChange={() => onChange(optionValue)} />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    )
  }
  if (field.type === 'checkbox') {
    const selected = Array.isArray(value) ? value : []
    return (
      <div className="dynamic-choice-list is-wrap">
        {(field.options || []).map(option => {
          const optionValue = option.value || option.label
          const checked = selected.includes(optionValue)
          return (
            <label key={optionValue} className={`dynamic-choice ${checked ? 'is-selected' : ''}`}>
              <input
                type="checkbox"
                value={optionValue}
                checked={checked}
                onChange={() => onChange(checked ? selected.filter(item => item !== optionValue) : [...selected, optionValue])}
              />
              <span>{option.label}</span>
            </label>
          )
        })}
      </div>
    )
  }
  return <input className="form-input dynamic-form-control" value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || '请输入'} />
}
