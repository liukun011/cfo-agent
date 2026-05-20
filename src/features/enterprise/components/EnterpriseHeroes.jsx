import { Icons } from '../../../shared/components/Icons'

export function IdleHomeHero({ isBusy, onStartChat }) {
  return (
    <div className="page-content">
      <div className="home-header-card workspace-hero enterprise-hero">
        <div className="home-kicker">融资工作台</div>
        <h2 className="home-title">融资需求采集与产品方案匹配</h2>
        <button className="btn-chat" onClick={onStartChat} disabled={isBusy}>{Icons.chat} 填写基础信息</button>
      </div>
      <div className="empty-state" style={{ paddingTop: 40 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-ter)', marginBottom: 16, opacity: 0.4 }}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        <p style={{ fontSize: 15, color: 'var(--text-sec)', marginBottom: 8 }}>尚未开始融资需求采集</p>
        <p style={{ fontSize: 13 }}>先填写基础信息，再通过 CFO-Agent 对话完成采集</p>
      </div>
    </div>
  )
}

export function CollectedHomeHero({
  companyName,
  generationActionLabel,
  isSupplementChecking,
  hasMissingFields,
  planStepClass,
  planStepLabel,
}) {
  return (
    <div className="home-header-card workspace-hero enterprise-hero enterprise-summary-hero">
      <div className="enterprise-summary-top">
        <div>
          <div className="home-kicker">企业用户</div>
          <h2 className="home-title">{companyName || '融资需求采集'}</h2>
        </div>
        <span className="enterprise-stage-pill">{generationActionLabel}</span>
      </div>
      <div className="flow-steps flow-steps-compact">
        <div className="flow-step done"><span>1</span><p>采集完成</p></div>
        <div className={`flow-step ${isSupplementChecking ? 'active' : 'done'}`}><span>2</span><p>{isSupplementChecking ? '整理中' : '资料就绪'}</p></div>
        <div className={`flow-step ${planStepClass}`}><span>3</span><p>{planStepLabel}</p></div>
      </div>
    </div>
  )
}
