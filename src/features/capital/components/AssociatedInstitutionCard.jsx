import { Icons } from '../../../shared/components/Icons'

export default function AssociatedInstitutionCard({
  partner,
}) {
  return (
    <div className="associated-investor-card">
      <div className="associated-investor-head">
        <div className="associated-investor-title">
          <div className="associated-investor-icon">{Icons.building}</div>
          <div>
            <span className="partner-level-badge">合作机构</span>
            <strong>{partner.name || '未命名机构'}</strong>
          </div>
        </div>
      </div>
      <div className="associated-investor-meta">
        <div><span>邀请码</span><b>{partner.invitationCode || '暂无邀请码'}</b></div>
      </div>
    </div>
  )
}
