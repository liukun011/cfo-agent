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
  const summaryMetaItems = [
    { label: '融资额度', value: product.amount },
    { label: '融资期限', value: product.term },
    { label: '资金方', value: product.matchedInvestors.length ? `${product.matchedInvestors.length} 家` : '待匹配' },
  ]
  const detailMetaItems = [
    { label: '需求占比', value: product.ratioOfTotal },
    { label: '还款方式', value: product.repaymentMethod },
    { label: '资金用途', value: product.purpose, wide: true },
    { label: '增信方案', value: product.enhancementNote, wide: true },
  ]

  const handleHeaderKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onToggleExpanded()
    }
  }

  return (
    <div className={`product-card ${isExpanded ? 'expanded' : ''}`}>
      <div
        className="product-card-header product-card-trigger"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggleExpanded}
        onKeyDown={handleHeaderKeyDown}
      >
        <div className="product-card-top">
          <div className="product-info">
            <div className="product-name">{product.name}</div>
            <div className="product-tag-row">
              <span className="product-tag">{product.tag}</span>
              {product.matchedInvestors.length > 0 && <span className="product-tag muted">{product.matchedInvestors.length} 家资金方</span>}
            </div>
          </div>
          <div className="product-side">
            <div className="product-score"><span className="score-number">{product.score}</span><span className="score-unit">分</span></div>
            <span className={`product-title-toggle ${isExpanded ? 'is-open' : ''}`}>
              <span>{isExpanded ? '收起详情' : '查看详情'}</span>
              {Icons.chevronDown}
            </span>
          </div>
        </div>
        <div className="product-meta-grid product-meta-grid-summary product-summary-metrics">
          {summaryMetaItems.map(item => (
            <div key={item.label} className={`product-meta-item ${item.wide ? 'wide' : ''}`}>
              <span>{item.label}</span>
              <strong>{item.value || '待补充'}</strong>
            </div>
          ))}
        </div>
      </div>
      {isExpanded && (
        <div className="product-detail">
          <div className="product-meta-grid product-meta-grid-detail">
            {detailMetaItems.map(item => (
              <div key={item.label} className={`product-meta-item ${item.wide ? 'wide' : ''}`}>
                <span>{item.label}</span>
                <strong>{item.value || '待补充'}</strong>
              </div>
            ))}
          </div>
          <div className="product-detail-grid">
            <div className="detail-section detail-panel">
              <h5>风险点说明</h5>
              <p>{product.riskNotes || '暂无风险点说明'}</p>
            </div>
            {product.matchGapNote && (
              <div className="detail-section detail-panel">
                <h5>补充说明</h5>
                <p>{product.matchGapNote}</p>
              </div>
            )}
          </div>
          <div className="detail-section investor-match-section">
            <div className="investor-section-head">
              <h5>匹配资金方</h5>
              <div className="investor-section-actions">
                <span>{product.matchedInvestors.length ? `${product.matchedInvestors.length} 家` : '尚未匹配'}</span>
                <button
                  className={product.matchedInvestors.length ? 'btn-outline btn-sm' : 'btn-primary btn-sm'}
                  onClick={onMatchInvestors}
                  disabled={isMatchingInvestors || !product.pathMatchResultId}
                >
                  {isMatchingInvestors ? '匹配中...' : product.matchedInvestors.length ? '重新匹配' : '匹配资金方'}
                </button>
              </div>
            </div>
            {product.matchedInvestors.length === 0 && (
              <div className="investor-empty">
                <strong>{isMatchingInvestors ? '正在匹配该方案下的资金方' : '暂未匹配到资金方'}</strong>
                <p>
                  {isMatchingInvestors
                    ? '匹配完成后，可在这里查看可对接的资金方。'
                    : product.matchGapNote || '点击上方按钮继续匹配该方案下的资金方。'}
                </p>
              </div>
            )}
            {product.matchedInvestors.map((investor) => {
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
        </div>
      )}
    </div>
  )
}
