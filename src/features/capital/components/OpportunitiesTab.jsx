import { STATUS_COLORS } from '../../../config/appConfig'
import OpportunityCard from './OpportunityCard'

export default function OpportunitiesTab({
  loading,
  statistics,
  opportunityErrors,
  loadError,
  investor,
  hasConfiguredProfile,
  visibleRequests,
  confirmingRequestId,
  formatWan,
  formatMaybePercent,
  onRefresh,
  onConfigureLabels,
  onOpenStat,
  onConfirmRequest,
  expandedRequestIds,
  onToggleExpandedRequest,
}) {
  return (
    <div className="page-content">
      <div className="page-intro">
        <div>
          <h2 className="page-heading">对接机会</h2>
          <p className="page-subtitle">查看企业发起的融资对接需求。</p>
        </div>
        <button className="btn-outline btn-sm" onClick={onRefresh} disabled={loading || Boolean(confirmingRequestId)}>
          {loading ? '刷新中...' : '刷新'}
        </button>
      </div>
      <div className="stats-grid cols-2 dashboard-kpis" style={{ marginBottom: 24 }}>
        <div className="stat-card" onClick={() => onOpenStat('matched')}>
          <span className="stat-number">{statistics.matchedCount}</span>
          <span className="stat-label">对接需求</span>
          <span className="stat-action">查看明细</span>
        </div>
        <div className="stat-card" onClick={() => onOpenStat('contact')}>
          <span className="stat-number">{statistics.contactExchangedCount}</span>
          <span className="stat-label">已确认对接</span>
          <span className="stat-action">查看明细</span>
        </div>
      </div>
      {opportunityErrors?.length > 0 && (
        <div className="inline-error-strip mb-16">
          <span>部分对接机会加载失败，当前先展示已获取的数据。</span>
          <button className="btn-text" onClick={onRefresh} disabled={loading}>重试</button>
        </div>
      )}
      {loading && <div className="inline-loading"><span className="spinner" />正在加载对接机会...</div>}
      {loadError ? (
        <div className="empty-panel error">
          <strong>数据加载失败</strong>
          <p>{loadError}</p>
          <button className="btn-outline btn-sm" onClick={onRefresh} disabled={loading}>重试</button>
        </div>
      ) : !loading && !investor && !hasConfiguredProfile ? (
        <div className="empty-panel investor-empty-guide">
          <strong>先完成资金方资料配置</strong>
          <p>填写机构能力和准入偏好后，即可查看匹配机会。</p>
          <button className="btn-primary btn-sm" onClick={onConfigureLabels}>去配置资料</button>
        </div>
      ) : !loading && visibleRequests.length === 0 ? (
        <div className="empty-panel">
          <strong>暂无对接机会</strong>
          <p>可稍后刷新查看。</p>
        </div>
      ) : (
        visibleRequests.map((request) => {
          const isPending = request.status === '待确认'
          const isExpanded = isPending || expandedRequestIds.includes(request.id)
          return (
            <OpportunityCard
              key={request.id}
              request={request}
              isExpanded={isExpanded}
              confirmingRequestId={confirmingRequestId}
              isLoading={loading}
              statusColors={STATUS_COLORS}
              formatWan={formatWan}
              formatMaybePercent={formatMaybePercent}
              onConfirm={onConfirmRequest}
              onToggleExpanded={onToggleExpandedRequest}
            />
          )
        })
      )}
    </div>
  )
}
