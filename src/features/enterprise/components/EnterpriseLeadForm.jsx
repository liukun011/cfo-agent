import { useEffect, useState } from 'react'
import { Icons } from '../../../shared/components/Icons'

const EMPTY_FORM = {
  companyName: '',
  industry: '',
  contactPerson: '',
  contactPhone: '',
  financingMin: '',
  financingMax: '',
}

export default function EnterpriseLeadForm({ initialValues, isSubmitting, onBack, onSubmit }) {
  const [values, setValues] = useState(EMPTY_FORM)
  const isEditing = Boolean(initialValues?.id)

  useEffect(() => {
    setValues({
      companyName: initialValues?.companyName || '',
      industry: initialValues?.industry || '',
      contactPerson: initialValues?.contactPerson || '',
      contactPhone: initialValues?.contactPhone || '',
      financingMin: initialValues?.financingMin || '',
      financingMax: initialValues?.financingMax || '',
    })
  }, [initialValues])

  const canSubmit = Object.values(values).every(value => String(value || '').trim())
    && Number(values.financingMin) > 0
    && Number(values.financingMax) > 0
    && Number(values.financingMax) >= Number(values.financingMin)

  const updateValue = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  const submit = event => {
    event.preventDefault()
    if (!canSubmit || isSubmitting) return
    onSubmit(values)
  }

  return (
    <div className="page-content enterprise-lead-page">
      <div className="enterprise-lead-hero">
        <div>
          <span className="home-kicker">融资需求采集</span>
          <h2 className="home-title">先完善基础信息</h2>
          <p>填写企业基础信息后，继续通过 CFO-Agent 完成融资需求问答。</p>
        </div>
      </div>

      <form className="enterprise-lead-card" onSubmit={submit}>
        <label>
          <span>企业名称 *</span>
          <input className="form-input" value={values.companyName} onChange={e => updateValue('companyName', e.target.value)} placeholder="请输入企业名称" />
        </label>
        <label>
          <span>所属行业 *</span>
          <input className="form-input" value={values.industry} onChange={e => updateValue('industry', e.target.value)} placeholder="请输入所属行业" />
        </label>
        <label>
          <span>联系人 *</span>
          <input className="form-input" value={values.contactPerson} onChange={e => updateValue('contactPerson', e.target.value)} placeholder="请输入联系人" />
        </label>
        <label>
          <span>联系方式 *</span>
          <input className="form-input" value={values.contactPhone} onChange={e => updateValue('contactPhone', e.target.value)} placeholder="请输入手机号或联系电话" />
        </label>
        <div className="enterprise-lead-range">
          <label>
            <span>本次融资额度下限（万元）*</span>
            <input
              className="form-input"
              type="number"
              min="0"
              value={values.financingMin}
              onChange={e => updateValue('financingMin', e.target.value)}
              placeholder="例如 500"
            />
          </label>
          <label>
            <span>本次融资额度上限（万元）*</span>
            <input
              className="form-input"
              type="number"
              min="0"
              value={values.financingMax}
              onChange={e => updateValue('financingMax', e.target.value)}
              placeholder="例如 1000"
            />
          </label>
        </div>
        {values.financingMin && values.financingMax && Number(values.financingMax) < Number(values.financingMin) && (
          <p className="form-error-text">融资额度上限不能小于下限</p>
        )}

        <div className="enterprise-lead-actions">
          <button type="button" className="btn-outline" onClick={onBack} disabled={isSubmitting}>返回</button>
          <button type="submit" className="btn-primary" disabled={!canSubmit || isSubmitting}>
            {Icons.chat} {isSubmitting ? '保存中...' : isEditing ? '更新并开始对话' : '保存并开始对话'}
          </button>
        </div>
      </form>
    </div>
  )
}
