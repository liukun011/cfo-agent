import { useEffect, useMemo, useState } from 'react'

const EMPTY_BASIC_FORM = {
  companyName: '',
  industry: '',
  contactPerson: '',
  contactPhone: '',
  financingMin: '',
  financingMax: '',
}

function toFormValue(value) {
  return value === undefined || value === null ? '' : String(value)
}

function normalizeExtendedInfo(fields = []) {
  return fields
    .filter(field => field && (field.id || field.label))
    .map((field, index) => ({
      id: field.id || field.label || `extended_${index + 1}`,
      label: field.label || field.id || `采集项 ${index + 1}`,
      value: toFormValue(field.value),
      required: Boolean(field.required),
      sort: field.sort ?? index + 1,
      hint: field.hint || '',
    }))
}

export default function EnterpriseEditForm({ enterprise, isSubmitting, onBack, onSubmit }) {
  const initialExtendedInfo = useMemo(() => normalizeExtendedInfo(enterprise?.extendedInfo || []), [enterprise?.extendedInfo])
  const [basicValues, setBasicValues] = useState(EMPTY_BASIC_FORM)
  const [extendedValues, setExtendedValues] = useState(initialExtendedInfo)

  useEffect(() => {
    setBasicValues({
      companyName: toFormValue(enterprise?.companyName),
      industry: toFormValue(enterprise?.industry),
      contactPerson: toFormValue(enterprise?.contactPerson),
      contactPhone: toFormValue(enterprise?.contactPhone),
      financingMin: toFormValue(enterprise?.financingMin),
      financingMax: toFormValue(enterprise?.financingMax),
    })
    setExtendedValues(normalizeExtendedInfo(enterprise?.extendedInfo || []))
  }, [enterprise])

  const canSubmit = Boolean(enterprise?.id)
    && Object.values(basicValues).every(value => String(value || '').trim())
    && Number(basicValues.financingMin) > 0
    && Number(basicValues.financingMax) > 0
    && Number(basicValues.financingMax) >= Number(basicValues.financingMin)
  const completedExtendedCount = extendedValues.filter(field => String(field.value || '').trim()).length

  const updateBasicValue = (key, value) => {
    setBasicValues(prev => ({ ...prev, [key]: value }))
  }

  const updateExtendedValue = (id, value) => {
    setExtendedValues(prev => prev.map(field => (
      field.id === id ? { ...field, value } : field
    )))
  }

  const submit = event => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return
    onSubmit({
      ...basicValues,
      extendedInfo: extendedValues,
    })
  }

  return (
    <div className="page-content enterprise-edit-page">
      <div className="enterprise-edit-header">
        <div>
          <span className="home-kicker">企业资料</span>
          <h2 className="home-title">编辑企业资料</h2>
          <p>修改后保存即可，不会重新进入对话。</p>
        </div>
        <button type="button" className="enterprise-edit-back" onClick={onBack} disabled={isSubmitting}>返回</button>
      </div>

      <form className="enterprise-edit-form" onSubmit={submit}>
        <div className="enterprise-edit-summary">
          <div>
            <span>基础信息</span>
            <strong>6 项</strong>
          </div>
          <div>
            <span>采集信息</span>
            <strong>{completedExtendedCount}/{extendedValues.length}</strong>
          </div>
          <div>
            <span>保存方式</span>
            <strong>仅保存</strong>
          </div>
        </div>

        <section className="enterprise-edit-card">
          <div className="enterprise-edit-card-head">
            <div>
              <h3>基础信息</h3>
              <p>用于识别企业和融资需求。</p>
            </div>
            <span>必填</span>
          </div>
          <div className="enterprise-edit-grid">
            <label className="is-wide">
              <span>企业名称 *</span>
              <input className="form-input" value={basicValues.companyName} onChange={e => updateBasicValue('companyName', e.target.value)} placeholder="请输入企业名称" />
            </label>
            <label className="is-wide">
              <span>所属行业 *</span>
              <input className="form-input" value={basicValues.industry} onChange={e => updateBasicValue('industry', e.target.value)} placeholder="请输入所属行业" />
            </label>
            <label>
              <span>联系人 *</span>
              <input className="form-input" value={basicValues.contactPerson} onChange={e => updateBasicValue('contactPerson', e.target.value)} placeholder="请输入联系人" />
            </label>
            <label>
              <span>联系方式 *</span>
              <input className="form-input" value={basicValues.contactPhone} onChange={e => updateBasicValue('contactPhone', e.target.value)} placeholder="请输入手机号或联系电话" />
            </label>
            <label>
              <span>融资额度下限（万元）*</span>
              <input className="form-input" type="number" min="0" value={basicValues.financingMin} onChange={e => updateBasicValue('financingMin', e.target.value)} placeholder="例如 500" />
            </label>
            <label>
              <span>融资额度上限（万元）*</span>
              <input className="form-input" type="number" min="0" value={basicValues.financingMax} onChange={e => updateBasicValue('financingMax', e.target.value)} placeholder="例如 1000" />
            </label>
          </div>
          {basicValues.financingMin && basicValues.financingMax && Number(basicValues.financingMax) < Number(basicValues.financingMin) && (
            <p className="form-error-text">融资额度上限不能小于下限</p>
          )}
        </section>

        <section className="enterprise-edit-card">
          <div className="enterprise-edit-card-head">
            <div>
              <h3>对话采集信息</h3>
              <p>可直接修正问答内容，保存后用于后续产品生成。</p>
            </div>
            <span>{completedExtendedCount}/{extendedValues.length}</span>
          </div>
          {extendedValues.length === 0 ? (
            <div className="enterprise-extended-empty">暂无对话采集信息</div>
          ) : extendedValues.map((field, index) => (
            <label key={field.id} className="enterprise-edit-extended-field">
              <span><em>{index + 1}</em>{field.label}</span>
              <textarea
                className="form-input"
                rows={3}
                value={field.value}
                onChange={e => updateExtendedValue(field.id, e.target.value)}
                placeholder={field.hint || '请输入内容'}
              />
            </label>
          ))}
        </section>

        <div className="enterprise-edit-actions">
          <button type="button" className="btn-outline" onClick={onBack} disabled={isSubmitting}>取消</button>
          <button type="submit" className="btn-primary" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? '保存中...' : '保存修改'}
          </button>
        </div>
      </form>
    </div>
  )
}
