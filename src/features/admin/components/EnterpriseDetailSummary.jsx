import { STATUS_COLORS } from '../../../config/appConfig'
import { formatDisplayValue, formatRangeValue, formatWanRange, getEnterpriseDisplayStatus } from '../utils/adminDisplay'

export default function EnterpriseDetailSummary({ enterprise, detailState, onRetry }) {
  return (
    <>
      <div className="info-card detail-summary-card">
        <div className="detail-header">
          <div className="detail-header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 6h6M9 10h6M9 14h6M9 18h4"/></svg>
          </div>
          <div className="detail-header-info">
            <div className="detail-header-label-row">
              <span className="detail-header-label">企业名称</span>
              <span className={`badge ${STATUS_COLORS[getEnterpriseDisplayStatus(enterprise)] || 'badge-default'}`}>{getEnterpriseDisplayStatus(enterprise)}</span>
            </div>
            <span className="detail-header-value">{formatDisplayValue(enterprise.companyName)}</span>
            {detailState.status === 'loading' && <span className="detail-header-hint">正在加载企业详情...</span>}
            {detailState.status === 'error' && (
              <span className="detail-header-hint error">
                详情加载失败：{detailState.error || '请重试'}
                <button className="btn-text detail-inline-retry" onClick={onRetry}>重试</button>
              </span>
            )}
          </div>
        </div>
        <div className="detail-header-grid">
          <div className="detail-header-grid-item"><span className="detail-header-grid-label">行业</span><span className="detail-header-grid-value">{formatDisplayValue(enterprise.industry)}</span></div>
          <div className="detail-header-grid-item"><span className="detail-header-grid-label">地区</span><span className="detail-header-grid-value">{formatDisplayValue(enterprise.region)}</span></div>
          <div className="detail-header-grid-item"><span className="detail-header-grid-label">年营收</span><span className="detail-header-grid-value">{formatRangeValue(enterprise.revenueMin, enterprise.revenueMax)}</span></div>
          <div className="detail-header-grid-item"><span className="detail-header-grid-label">融资金额</span><span className="detail-header-grid-value">{formatDisplayValue(formatWanRange(enterprise.financingMin, enterprise.financingMax))}</span></div>
        </div>
      </div>

      <div className="detail-purpose">
        <span className="detail-purpose-label">资金用途</span>
        <p className="detail-purpose-text">{formatDisplayValue(enterprise.financingPurpose)}</p>
      </div>
    </>
  )
}
