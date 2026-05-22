import { Icons } from '../../../shared/components/Icons'
import InvestorMatchCard from './InvestorMatchCard'

export default function ProductCard({
  product,
  isExpanded,
  expandedInvestorReasons,
  contactSubmittingKey,
  isMatchingInvestors,
  statusColors,
  canInitiateContact,
  getInvestorStatusText,
  getInitiateContactLabel,
  onToggleExpanded,
  onToggleInvestorReason,
  onInitiateContact,
  onMatchInvestors,
}) {
  const matchedInvestors = product.matchedInvestors || []
  const hasVisibleValue = (value) => {
    const text = String(value || '').trim()
    return Boolean(text && !['待补充', 'null', 'undefined', '-'].includes(text.toLowerCase()))
  }
  const compactMetaItems = [
    { label: '产品额度', value: product.amount },
    { label: '融资期限', value: product.term },
    { label: '需求占比', value: product.ratioOfTotal },
    { label: '还款方式', value: product.repaymentMethod },
    { label: '匹配策略', value: product.policyName, wide: true },
    { label: '资金用途', value: product.purpose, wide: true },
    { label: '增信方案', value: product.enhancementNote, wide: true },
  ].filter(item => hasVisibleValue(item.value))
  const investorActionLabel = matchedInvestors.length
    ? (isExpanded ? '收起资金方' : '查看资金方')
    : '匹配资金方'

  const handleInvestorAction = () => {
    if (matchedInvestors.length) {
      onToggleExpanded()
      return
    }
    onMatchInvestors()
  }

  return (
    <div className={`product-card ${isExpanded ? 'expanded' : ''}`}>
      <div className="product-card-header product-card-overview">
        <div className="product-card-top">
          <div className="product-info">
            <div className="product-name">{product.name}</div>
            <div className="product-tag-row">
              <span className="product-tag">{product.tag}</span>
            </div>
          </div>
          <div className="product-side">
            <div className="product-score"><span className="score-number">{product.score}</span><span className="score-unit">分</span></div>
            <button
              type="button"
              className={`product-investor-toggle ${matchedInvestors.length ? 'has-results' : 'needs-match'} ${isExpanded ? 'is-open' : ''}`}
              aria-expanded={matchedInvestors.length ? isExpanded : undefined}
              onClick={handleInvestorAction}
              disabled={isMatchingInvestors || (!matchedInvestors.length && !product.pathMatchResultId)}
            >
              <span>{isMatchingInvestors ? '匹配中...' : investorActionLabel}</span>
              {matchedInvestors.length > 0 && Icons.chevronDown}
            </button>
          </div>
        </div>
      </div>
      <div className="product-detail product-card-body">
        {compactMetaItems.length > 0 && (
          <div className="product-meta-grid product-meta-grid-detail product-meta-grid-compact">
            {compactMetaItems.map(item => (
              <div key={item.label} className={`product-meta-item ${item.wide ? 'wide' : ''}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        )}
        <div className="product-detail-grid">
          {hasVisibleValue(product.riskNotes) && (
            <div className="detail-section detail-panel">
              <h5>风险点说明</h5>
              <p>{product.riskNotes}</p>
            </div>
          )}
          {hasVisibleValue(product.matchGapNote) && (
            <div className="detail-section detail-panel">
              <h5>补充说明</h5>
              <p>{product.matchGapNote}</p>
            </div>
          )}
        </div>
        {isExpanded && matchedInvestors.length > 0 && (
          <div className="detail-section investor-match-section">
            <div className="investor-section-head">
              <h5>匹配资金方</h5>
              <div className="investor-section-actions">
                <button
                  className="btn-outline btn-sm"
                  onClick={onMatchInvestors}
                  disabled={isMatchingInvestors || !product.pathMatchResultId}
                >
                  {isMatchingInvestors ? '匹配中...' : '重新匹配'}
                </button>
              </div>
            </div>
            {matchedInvestors.map((investor) => {
              const reasonKey = `${product.id}-${investor.id}-reason`
              return (
                <InvestorMatchCard
                  key={investor.id}
                  investor={investor}
                  productId={product.id}
                  isReasonExpanded={Boolean(expandedInvestorReasons[reasonKey])}
                  contactSubmittingKey={contactSubmittingKey}
                  statusColors={statusColors}
                  canInitiateContact={canInitiateContact}
                  getInvestorStatusText={getInvestorStatusText}
                  getInitiateContactLabel={getInitiateContactLabel}
                  onToggleReason={() => onToggleInvestorReason(reasonKey)}
                  onInitiateContact={onInitiateContact}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
