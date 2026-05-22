import { Icons } from '../../../shared/components/Icons'

export default function InvestorMatchCard({
  investor,
  productId,
  isReasonExpanded,
  contactSubmittingKey,
  statusColors,
  canInitiateContact,
  getInvestorStatusText,
  getInitiateContactLabel,
  onToggleReason,
  onInitiateContact,
}) {
  const contactKey = `${productId}-${investor.id}`
  const reasonText = investor.matchReason || '暂无匹配原因'
  const isReasonLong = reasonText.length > 92
  const canClickInvestor = canInitiateContact(investor) && Number(investor.matchRate || 0) > 0 && Boolean(investor.investorIdCode || investor.id)
  const contactText = [investor.contactPerson, investor.contactPhone]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="investor-card">
      <div className="investor-header">
        <div className="investor-info">
          <span className="investor-name">{investor.name}</span>
          <span className="investor-match">{investor.matchRate}% 匹配</span>
        </div>
        <span className={`badge ${statusColors[investor.status] || 'badge-default'}`}>{getInvestorStatusText(investor.status)}</span>
      </div>
      <div className="investor-tags">{investor.tags.map((tag, idx) => <span key={idx} className="tag-item">{tag}</span>)}</div>
      <div className="investor-reason">
        <span className="reason-label">匹配原因</span>
        <p className={isReasonLong && !isReasonExpanded ? 'text-clamp-3' : ''}>{reasonText}</p>
        {isReasonLong && (
          <button
            className={`expand-toggle expand-toggle-inline ${isReasonExpanded ? 'is-open' : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              onToggleReason()
            }}
          >
            <span>{isReasonExpanded ? '收起' : '查看全文'}</span>
            {Icons.chevronDown}
          </button>
        )}
      </div>
      {canClickInvestor && (
        <button
          className="btn-primary btn-sm investor-primary-action"
          onClick={(e) => {
            e.stopPropagation()
            onInitiateContact(productId, investor.id)
          }}
          disabled={contactSubmittingKey === contactKey}
        >
          {contactSubmittingKey === contactKey ? '提交中...' : getInitiateContactLabel(investor)}
        </button>
      )}
      {(investor.status === '待审核' || investor.status === '待确认') && (
        <div className="investor-state-strip">待资金方确认</div>
      )}
      {(investor.status === '已推送' || investor.status === '已确认') && (
        <div className="investor-state-strip is-confirmed">
          <span>已确认对接</span>
          {contactText && <small>{contactText}</small>}
        </div>
      )}
    </div>
  )
}
