import { Icons } from '../../../shared/components/Icons'

export default function EnterpriseInfoSection({
  coreEnterpriseFields,
  extraEnterpriseFields,
  showFullEnterpriseInfo,
  isBusy,
  renderEnterpriseFieldValue,
  onRestartChat,
  onToggleFullEnterpriseInfo,
}) {
  return (
    <section className="section panel-section">
      <div className="section-title-row">
        <div>
          <h3 className="section-title" style={{ marginBottom: 0 }}>核心采集信息</h3>
          <p className="section-subtitle">关键字段优先展示，更多内容可继续核对</p>
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
        {extraEnterpriseFields.length > 0 && (
          <>
            <button className={`info-collapse-toggle expand-toggle expand-toggle-row ${showFullEnterpriseInfo ? 'is-open' : ''}`} onClick={onToggleFullEnterpriseInfo}>
              <span>{showFullEnterpriseInfo ? `已显示全部 ${extraEnterpriseFields.length} 项` : `还有 ${extraEnterpriseFields.length} 项采集信息`}</span>
              <strong>{showFullEnterpriseInfo ? '收起' : '查看全部采集信息'}</strong>
              {Icons.chevronDown}
            </button>
            {showFullEnterpriseInfo && (
              <div className="enterprise-extra-fields">
                {extraEnterpriseFields.map(field => (
                  <div key={field.id || field.label} className={`info-row ${field.long ? 'info-row-vertical' : ''}`}>
                    <span className="info-label">{field.label}</span>
                    {renderEnterpriseFieldValue(field)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
