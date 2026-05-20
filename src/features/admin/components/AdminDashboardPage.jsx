import { STATUS_COLORS } from '../../../config/appConfig'
import { formatDisplayValue, formatWanRange, getEnterpriseDisplayStatus } from '../utils/adminDisplay'

export default function AdminDashboardPage({
  isLoading,
  loadError,
  enterprises,
  onRefresh,
  onOpenEnterpriseDetail,
}) {
  return (
    <div className="page-content">
      <div className="page-intro">
        <div>
          <h2 className="page-heading">企业需求工作台</h2>
          <p className="page-subtitle">查看企业融资需求与处理进展。</p>
        </div>
        <button className="btn-outline btn-sm" onClick={onRefresh} disabled={isLoading}>刷新</button>
      </div>
      {isLoading && <div className="inline-loading"><span className="spinner" />正在加载企业需求...</div>}
      {loadError && (
        <div className="empty-panel error mb-16">
          <strong>数据加载失败</strong>
          <p>{loadError}</p>
          <button className="btn-outline btn-sm" onClick={onRefresh}>重试</button>
        </div>
      )}
      <div className="enterprise-list workspace-list">
        {!isLoading && !loadError && enterprises.length === 0 ? (
          <div className="empty-panel">
            <strong>暂无企业需求</strong>
            <p>可稍后刷新查看。</p>
            <button className="btn-outline btn-sm" onClick={onRefresh}>刷新</button>
          </div>
        ) : enterprises.map(ent => (
          <div
            key={ent.id}
            className="enterprise-card"
            role="button"
            tabIndex={0}
            aria-label={`查看 ${ent.companyName || '企业'} 详情`}
            onClick={() => onOpenEnterpriseDetail(ent)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onOpenEnterpriseDetail(ent)
              }
            }}
          >
            <div className="enterprise-card-top">
              <h4 className="enterprise-card-name">{formatDisplayValue(ent.companyName)}</h4>
              <span className={`badge ${STATUS_COLORS[getEnterpriseDisplayStatus(ent)] || 'badge-default'}`}>{getEnterpriseDisplayStatus(ent)}</span>
            </div>
            <div className="enterprise-card-meta"><span>{formatDisplayValue(ent.industry)}</span><span className="meta-dot">·</span><span>{formatDisplayValue(ent.region)}</span></div>
            <div className="enterprise-card-footer">
              <span className="finance-amount">融资 {formatWanRange(ent.financingMin, ent.financingMax) || '未填写'}</span>
              <button
                className="btn-outline btn-sm enterprise-detail-entry"
                onClick={(event) => {
                  event.stopPropagation()
                  onOpenEnterpriseDetail(ent)
                }}
              >
                查看详情
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
