import { Icons } from '../../../shared/components/Icons'
import AssociatedInstitutionCard from './AssociatedInstitutionCard'

export default function AssociatedInstitutionsTab({
  currentInstitution,
  hasConfiguredProfile,
  invitationCode,
  associatedInstitutions,
  inviteCode,
  isAssociating,
  loading,
  onRefresh,
  onConfigureLabels,
  onCopyInvitationCode,
  onInviteCodeChange,
  onAssociateInstitution,
}) {
  const inviteHint = inviteCode.length === 0
    ? '输入 5 位邀请码'
    : inviteCode.length < 5
      ? `还差 ${5 - inviteCode.length} 位`
      : '可以添加'

  return (
    <div className="page-content">
      <div className="page-intro">
        <div>
          <h2 className="page-heading">关联机构</h2>
          <p className="page-subtitle">通过邀请码添加合作机构，查看对方公开资料。</p>
        </div>
        <button className="btn-outline btn-sm" onClick={onRefresh} disabled={loading || isAssociating}>{loading ? '刷新中...' : '刷新'}</button>
      </div>

      {!currentInstitution ? (
        <div className="empty-panel investor-empty-guide">
          <strong>{hasConfiguredProfile ? '机构资料正在同步' : '暂未获取到本机构资料'}</strong>
          <p>
            {hasConfiguredProfile
              ? '资料已提交，请刷新后查看邀请码和合作机构。'
              : '请先完成本机构资料配置，再使用邀请码添加合作机构。'}
          </p>
          <div className="empty-actions">
            <button className="btn-outline btn-sm" onClick={onRefresh} disabled={loading}>{loading ? '刷新中...' : '刷新'}</button>
            {!hasConfiguredProfile && (
              <button className="btn-primary btn-sm" onClick={onConfigureLabels}>去配置资料</button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="invite-panel institution-overview-panel">
            <div className="institution-overview-top">
              <div className="institution-overview-main">
                <span className="invite-kicker">本机构</span>
                <strong className="institution-overview-name">{currentInstitution.name || '未命名机构'}</strong>
              </div>
              <div className="institution-code-box">
                <span>本机构邀请码</span>
                <b>{invitationCode || '暂无邀请码'}</b>
              <button className="btn-outline btn-sm" onClick={onCopyInvitationCode} disabled={!invitationCode}>复制</button>
              </div>
            </div>
          </div>

          <div className="associate-panel">
            <div className="associate-panel-head">
              <div>
                <strong>添加合作机构</strong>
                <p>请输入合作机构提供的 5 位邀请码。</p>
              </div>
            </div>
            <div className="invite-input-row">
              <div className="invite-input-wrap">
                <input
                  className="form-input invite-code-input"
                  value={inviteCode}
                  onChange={e => onInviteCodeChange(e.target.value)}
                  placeholder="输入邀请码"
                  disabled={isAssociating}
                />
                <span>{inviteHint}</span>
              </div>
              <button className="btn-primary btn-sm" onClick={onAssociateInstitution} disabled={isAssociating || inviteCode.length !== 5}>
                {isAssociating ? '添加中...' : '添加'}
              </button>
            </div>
          </div>

          <section className="section panel-section">
            <div className="section-title-row">
              <div>
                <h3 className="section-title" style={{ marginBottom: 0 }}>合作机构列表</h3>
                <p className="section-subtitle">已添加的合作机构。</p>
              </div>
              <span className="count-pill">{associatedInstitutions.length} 家</span>
            </div>
            {loading ? (
              <div className="inline-loading"><span className="spinner" />正在加载合作机构...</div>
            ) : associatedInstitutions.length === 0 ? (
              <div className="empty-panel">
                <strong>暂无合作机构</strong>
                <p>添加合作机构后，可查看公开资料。</p>
              </div>
            ) : (
              <div className="associated-investor-list">
                {associatedInstitutions.map(partner => (
                  <AssociatedInstitutionCard
                    key={partner.id}
                    partner={partner}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
