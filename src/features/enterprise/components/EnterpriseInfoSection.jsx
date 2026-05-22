export default function EnterpriseInfoSection({
  coreEnterpriseFields,
  extendedEnterpriseFields = [],
  isBusy,
  renderEnterpriseFieldValue,
  onRestartChat,
}) {
  return (
    <section className="section panel-section">
      <div className="section-title-row">
        <div>
          <h3 className="section-title" style={{ marginBottom: 0 }}>基础信息</h3>
          <p className="section-subtitle">展示企业提交的基础资料</p>
        </div>
        <button className="btn-outline btn-sm enterprise-edit-entry" onClick={onRestartChat} disabled={isBusy}>编辑资料</button>
      </div>
      <div className="info-card scan-card">
        {coreEnterpriseFields.map(field => (
          <div key={field.id || field.label} className={`info-row ${field.long ? 'info-row-vertical' : ''}`}>
            <span className="info-label">{field.label}</span>
            {renderEnterpriseFieldValue(field)}
          </div>
        ))}
      </div>
      <div className="enterprise-extended-info">
        <div className="enterprise-extended-info-head">
          <div>
            <h4>对话采集信息</h4>
            <p>展示本次问答采集到的企业信息</p>
          </div>
          <span>{extendedEnterpriseFields.length} 项</span>
        </div>
        <div className="info-card scan-card enterprise-extra-fields">
          {extendedEnterpriseFields.length === 0 ? (
            <div className="enterprise-extended-empty">暂无对话采集信息</div>
          ) : extendedEnterpriseFields.map(field => (
              <div key={field.id || field.label} className="info-row info-row-vertical">
                <span className="info-label">{field.label}</span>
                {renderEnterpriseFieldValue(field)}
              </div>
            ))
          }
        </div>
      </div>
    </section>
  )
}
