import { Icons } from '../../../shared/components/Icons'

export default function OpportunityCard({
  request,
  isExpanded,
  confirmingRequestId,
  isLoading,
  statusColors,
  formatWan,
  formatMaybePercent,
  onConfirm,
  onReject,
  onToggleExpanded,
}) {
  const isPending = request.status === '待确认'
  const hasMatchRate = request.matchRate !== undefined && request.matchRate !== null && request.matchRate !== ''
  const matchRateText = hasMatchRate ? `${request.matchRate}%` : '未填写'
  const routeScoreText = request.routeMatchScore !== undefined && request.routeMatchScore !== null && request.routeMatchScore !== ''
    ? `${request.routeMatchScore}%`
    : ''
  const productText = [request.productName || request.routeName, request.endpointName].filter(Boolean).join(' · ')
  const arrivalText = request.estimatedArrivalDays !== undefined && request.estimatedArrivalDays !== null && request.estimatedArrivalDays !== ''
    ? `${request.estimatedArrivalDays} 天`
    : ''
  const coreMetrics = [
    { label: '分配额度', value: formatWan(request.allocatedAmountWan) || request.amount || '未填写' },
    { label: '推荐产品', value: productText || request.product || '未填写' },
    { label: '建议金额', value: formatWan(request.suggestedAmountWan) || '未填写' },
    { label: '匹配度', value: matchRateText, score: hasMatchRate },
  ]
  const detailMetrics = [
    { label: '额度占比', value: formatMaybePercent(request.allocatedRatio) || '未填写' },
    { label: '覆盖用途', value: request.fundingPurposeCovered || request.fundPurpose || request.demandType || '未填写' },
    { label: '路径匹配', value: routeScoreText || '未填写' },
    { label: '金额适配', value: request.amountFitConclusion || '未填写' },
    { label: '预估成本', value: request.estimatedCostRange || '未填写' },
    { label: '预估期限', value: request.estimatedTerm || '未填写' },
    { label: '到账周期', value: arrivalText || '未填写' },
  ]

  return (
    <div className={`capital-request-card ${isPending ? 'is-pending' : 'is-confirmed'}`}>
      <div className="request-header">
        <div>
          <h4>{request.companyName || '未命名企业'}</h4>
          <p>{[request.demandType, request.pushTime].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`badge ${statusColors[request.status] || 'badge-default'}`}>{request.status}</span>
      </div>
      <div className="request-body">
        {request.matchLabel && (
          <div className="request-tag-row">
            {String(request.matchLabel).split(/[、,，;]/).filter(Boolean).slice(0, 4).map(label => (
              <span key={label}>{label.trim()}</span>
            ))}
          </div>
        )}
        <div className="request-summary-grid">
          {coreMetrics.map(item => (
            <div key={item.label}><span>{item.label}</span><b className={item.score ? 'request-score' : ''}>{item.value}</b></div>
          ))}
        </div>
        {isExpanded && (
          <div className="request-detail-block">
            <div className="request-summary-grid request-summary-grid-detail">
              {detailMetrics.map(item => <div key={item.label}><span>{item.label}</span><b>{item.value}</b></div>)}
            </div>
            {request.routeMatchReason && <div className="request-row request-reason"><span className="request-label">匹配原因</span><p className="request-text">{request.routeMatchReason}</p></div>}
            {request.matchReason && <div className="request-row request-reason"><span className="request-label">核心要素</span><p className="request-text">{request.matchReason}</p></div>}
            {request.matchRisk && <div className="request-row request-reason"><span className="request-label">风险点</span><p className="request-text">{request.matchRisk}</p></div>}
            {request.riskAdvice && <div className="request-row request-reason"><span className="request-label">产品建议</span><p className="request-text">{request.riskAdvice}</p></div>}
            {request.requiredMaterials.length > 0 && <div className="request-row"><span className="request-label">所需材料</span><span className="request-value missing">{request.requiredMaterials.join('、')}</span></div>}
          </div>
        )}
      </div>
      {request.status === '已确认' && isExpanded && (
        <div className="contact-revealed">
          <p className="contact-wait-text">等待融资方联系，请保持沟通渠道畅通。</p>
        </div>
      )}
      {request.status === '待确认' ? (
        <div className="request-action-bar">
          <span>待确认对接</span>
          <div className="request-action-buttons">
            <button className="btn-outline btn-sm" onClick={() => onReject(request)} disabled={confirmingRequestId === request.id || isLoading}>
              暂不接收
            </button>
            <button className="btn-primary btn-sm" onClick={() => onConfirm(request)} disabled={confirmingRequestId === request.id || isLoading}>
              {confirmingRequestId === request.id ? '处理中...' : '确认对接'}
            </button>
          </div>
        </div>
      ) : (
        <div className="request-action-bar is-muted">
          <span>等待融资方联系</span>
          <button
            className={`expand-toggle expand-toggle-inline ${isExpanded ? 'is-open' : ''}`}
            onClick={() => onToggleExpanded(request.id)}
            disabled={isLoading}
          >
            <span>{isExpanded ? '收起详情' : '查看详情'}</span>
            {Icons.chevronDown}
          </button>
        </div>
      )}
    </div>
  )
}
