import { Icons } from '../../../shared/components/Icons'
import { formatDisplayValue, isRepeatedExtendedField } from '../utils/adminDisplay'

export default function ExtendedInfoSection({ extendedInfo = [], isExpanded, onToggle }) {
  const fields = Array.isArray(extendedInfo) ? extendedInfo : []
  const displayFields = fields.filter(item => !isRepeatedExtendedField(item))
  const previewFields = displayFields.slice(0, 3)
  const visibleFields = isExpanded ? displayFields : previewFields

  return (
    <div className="detail-block">
      <div className="admin-detail-section-head">
        <div>
          <span className="admin-detail-section-title">扩展信息</span>
          <p>企业采集与补充资料中的更多字段。</p>
        </div>
        <button
          type="button"
          className={`expand-toggle expand-toggle-inline ${isExpanded ? 'is-open' : ''}`}
          onClick={onToggle}
        >
          <span>{isExpanded ? '收起' : '查看全部'}</span>
          {Icons.chevronDown}
        </button>
      </div>
      {displayFields.length === 0 ? (
        <div className="empty-panel detail-empty-panel">
          <strong>暂无扩展信息</strong>
          <p>{fields.length === 0 ? '暂无更多字段。' : '更多字段已在上方摘要展示。'}</p>
        </div>
      ) : (
        <div className="info-card detail-ext-card">
          <div className={isExpanded ? 'detail-grid-2col detail-ext-grid' : 'detail-ext-summary'}>
            {visibleFields.map((item, idx) => (
              <div
                key={item.id || item.label || idx}
                className={isExpanded ? `detail-grid-item ${idx % 2 === 0 ? '' : 'no-border'}` : 'detail-ext-chip'}
              >
                <span className={isExpanded ? 'detail-grid-label' : undefined}>{formatDisplayValue(item.label)}</span>
                <strong className={isExpanded ? 'detail-grid-value' : undefined}>{formatDisplayValue(item.value)}</strong>
              </div>
            ))}
          </div>
          {displayFields.length > previewFields.length && (
            <div className="detail-ext-action-row">
              <span>{isExpanded ? `已显示全部 ${displayFields.length} 项` : `已显示 ${previewFields.length}/${displayFields.length} 项`}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
