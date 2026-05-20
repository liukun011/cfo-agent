export const USER_ROLES = {
  ENTERPRISE: 'investee',
  ADMIN: 'cfo',
  INVESTOR: 'investor',
}

export const CONTACT_VIEW_STATUS = {
  NOT_APPLIED: 'NOT_APPLIED',
  PENDING_PLATFORM_REVIEW: 'PENDING_PLATFORM_REVIEW',
  PLATFORM_REJECTED: 'PLATFORM_REJECTED',
  PENDING_INVESTOR_CONFIRM: 'PENDING_INVESTOR_CONFIRM',
  INVESTOR_REJECTED: 'INVESTOR_REJECTED',
  APPROVED: 'APPROVED',
}

export const STATUS_COLORS = {
  待处理: 'badge-warning',
  待生成方案: 'badge-warning',
  资料检测中: 'badge-info',
  待补充: 'badge-warning',
  方案生成中: 'badge-info',
  方案已生成: 'badge-success',
  待审核: 'badge-warning',
  待确认: 'badge-warning',
  已推送: 'badge-info',
  已确认: 'badge-success',
  已完成: 'badge-success',
  暂不推送: 'badge-default',
  暂不接收: 'badge-default',
}
