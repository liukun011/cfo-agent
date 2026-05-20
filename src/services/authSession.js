const AUTH_KEY = 'cfo-agent-auth'

export const BACKEND_ROLE_TO_PORTAL = {
  investee: 'enterprise',
  investor: 'capital',
  cfo: 'admin',
}

export const PORTAL_ROLE_TO_BACKEND = {
  enterprise: 'investee',
  capital: 'investor',
  admin: 'cfo',
}

export function getAuthSession() {
  try {
    const raw = window.localStorage.getItem(AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setAuthSession(session) {
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session))
}

export function clearAuthSession() {
  window.localStorage.removeItem(AUTH_KEY)
}

export function getAuthToken() {
  return getAuthSession()?.token || ''
}

export function getCurrentUserId() {
  const session = getAuthSession()
  return String(
    session?.user?.userId ||
    session?.user?.id ||
    session?.login?.userId ||
    session?.login?.id ||
    session?.login?.user?.userId ||
    session?.login?.user?.id ||
    session?.user?.username ||
    session?.user?.mobile ||
    session?.login?.mobile ||
    ''
  )
}

export function resolvePortalRole(roles = [], preferredRoleCode = '') {
  if (preferredRoleCode && roles.includes(preferredRoleCode)) return BACKEND_ROLE_TO_PORTAL[preferredRoleCode]
  const matched = roles.find(role => BACKEND_ROLE_TO_PORTAL[role])
  return matched ? BACKEND_ROLE_TO_PORTAL[matched] : ''
}
