export default function EnterpriseInfoSection({
  coreEnterpriseFields,
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
        <button className="btn-text btn-sm" onClick={onRestartChat} disabled={isBusy}>编辑并重新采集</button>
      </div>
      <div className="info-card scan-card">
        {coreEnterpriseFields.map(field => (
          <div key={field.id || field.label} className={`info-row ${field.long ? 'info-row-vertical' : ''}`}>
            <span className="info-label">{field.label}</span>
            {renderEnterpriseFieldValue(field)}
          </div>
        ))}
      </div>
    </section>
  )
}
