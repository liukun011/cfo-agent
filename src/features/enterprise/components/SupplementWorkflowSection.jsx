import { Icons } from '../../../shared/components/Icons'

export default function SupplementWorkflowSection({
  isSupplementChecking,
  hasMissingFields,
  missingFields,
  supplementProgressPercent,
  supplementProgressText,
  visibleMissingFields,
  hiddenMissingFieldCount,
  showAllSupplementFields,
  supplementValues,
  canSaveSupplement,
  isRegenerating,
  onToggleShowAllSupplementFields,
  onSupplementChange,
  onSubmitSupplement,
  renderCompletedSupplement,
}) {
  return (
    <section className="section panel-section">
      <div className="section-title-row">
        <div>
          <h3 className="section-title" style={{ marginBottom: 0 }}>完善企业资料</h3>
          <p className="section-subtitle">{isSupplementChecking ? '正在整理建议补充项' : hasMissingFields ? `还有 ${missingFields.length} 项可补充` : '资料完整，可生成方案'}</p>
        </div>
        <div className="section-actions">
          {hasMissingFields && <span className="count-pill">{missingFields.length} 项</span>}
        </div>
      </div>
      <div className="supplement-workflow-card">
        <div className="supplement-workflow-head">
          <div>
            <strong>{isSupplementChecking ? '资料整理中' : hasMissingFields ? '建议补充关键信息' : '资料已完善'}</strong>
            <p>{isSupplementChecking ? '正在整理建议补充项。' : hasMissingFields ? '完善资料可提升方案准确度。' : '可以继续生成融资方案。'}</p>
          </div>
          <span className="supplement-status-pill">{isSupplementChecking ? '检测中' : hasMissingFields ? supplementProgressText : '可生成方案'}</span>
        </div>
        {isSupplementChecking ? (
          <div className="state-box">
            <span className="spinner" />
            <div>
              <strong>正在整理建议补充项</strong>
              <p>请稍候。</p>
            </div>
          </div>
        ) : hasMissingFields ? (
          <>
            <div className="supplement-progress-panel">
              <div className="supplement-progress-ring" style={{ '--progress': `${supplementProgressPercent}%` }}>
                <span>{supplementProgressPercent}%</span>
              </div>
              <div>
                <strong>{supplementProgressText}</strong>
                <p>完善资料后可生成更准确的方案。</p>
              </div>
            </div>
            <div className="supplement-task-list">
              {visibleMissingFields.map((field) => {
                const index = missingFields.findIndex(item => (item.id || item.label) === (field.id || field.label))
                const fieldKey = field.id || field.label
                const value = supplementValues[fieldKey] || ''
                const isFilled = String(value).trim().length > 0
                return (
                  <div key={fieldKey} className={`supplement-task-item ${isFilled ? 'is-filled' : ''}`}>
                    <div className="supplement-task-head">
                      <div className="supplement-task-meta">
                        <span className="supplement-task-index">{index + 1}</span>
                        <span>{field.priority ? `${field.priority} · ` : ''}{field.label}</span>
                      </div>
                      <span className="supplement-task-state">{isFilled ? '已填写' : field.required ? '待填写' : '建议填写'}</span>
                    </div>
                    <p className="supplement-task-hint">{field.suggestedContent || field.priorityReason || field.impact || '补充后可提升额度和准入判断准确度。'}</p>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      placeholder="请输入补充信息"
                      value={value}
                      disabled={isRegenerating || isSupplementChecking}
                      onChange={(e) => onSupplementChange(fieldKey, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>
            {hiddenMissingFieldCount > 0 && (
              <button className={`supplement-expand-toggle expand-toggle expand-toggle-row ${showAllSupplementFields ? 'is-open' : ''}`} onClick={onToggleShowAllSupplementFields}>
                <span>{showAllSupplementFields ? `已显示 ${missingFields.length} 项` : `还有 ${hiddenMissingFieldCount} 项可补充`}</span>
                <strong>{showAllSupplementFields ? '收起' : '查看全部'}</strong>
                {Icons.chevronDown}
              </button>
            )}
            <div className="supplement-save-bar">
              <span>{canSaveSupplement ? '保存后更新资料状态' : '填写至少一项后可保存'}</span>
              <button className="btn-primary btn-sm" onClick={onSubmitSupplement} disabled={!canSaveSupplement}>
                {Icons.save} {isRegenerating ? '保存中...' : '保存补充信息'}
              </button>
            </div>
            {renderCompletedSupplement()}
          </>
        ) : (
          <div className="state-box success">
            <span>{Icons.check}</span>
            <div>
              <strong>资料完整，可生成方案</strong>
              <p>当前资料已经满足方案生成要求。</p>
            </div>
          </div>
        )}
        {!hasMissingFields && renderCompletedSupplement()}
      </div>
    </section>
  )
}
