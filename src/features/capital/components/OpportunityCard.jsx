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
  onToggleExpanded,
}) {
  const isPending = request.status === '待确认'

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
          <div><span>融资总额</span><b>{request.amount || '未填写'}</b></div>
          <div><span>推荐产品</span><b>{request.routeName || request.product || '未填写'}</b></div>
          <div><span>方案金额</span><b>{formatWan(request.raw?.amountWan) || '未填写'}</b></div>
          <div><span>资金用途</span><b>{request.fundPurpose || request.demandType || '未填写'}</b></div>
          <div><span>资金缺口</span><b>{formatWan(request.fundingGapWan) || '未填写'}</b></div>
          <div><span>覆盖率</span><b>{formatMaybePercent(request.coverageRate) || '未填写'}</b></div>
          <div><span>综合成本</span><b>{request.weightedAvgCost || '未填写'}</b></div>
          <div><span>还款安全</span><b>{request.repaymentSafetyLevel || '未填写'}</b></div>
          <div><span>匹配度</span><b className="request-score">{request.matchRate}%</b></div>
        </div>
        {isExpanded && (
          <div className="request-detail-block">
            {request.matchReason && <div className="request-row request-reason"><span className="request-label">匹配原因</span><p className="request-text">{request.matchReason}</p></div>}
            {request.matchRisk && <div className="request-row request-reason"><span className="request-label">风险提示</span><p className="request-text">{request.matchRisk}</p></div>}
            {request.missingMaterials.length > 0 && <div className="request-row"><span className="request-label">缺失材料</span><span className="request-value missing">{request.missingMaterials.join('、')}</span></div>}
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
          <button className="btn-primary btn-sm" onClick={() => onConfirm(request)} disabled={confirmingRequestId === request.id || isLoading}>
            {confirmingRequestId === request.id ? '确认中...' : '确认对接'}
          </button>
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
