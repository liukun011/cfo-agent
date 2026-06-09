import { useEffect, useMemo, useState } from 'react'
import { fetchUserInfo, loginWithPhoneCode, sendLoginSms } from '../../api'
import { PORTAL_ROLE_TO_BACKEND, resolvePortalRole, setAuthSession } from '../../services/authSession'
import { Icons } from '../../shared/components/Icons'

const roles = [
  { key: 'enterprise', code: 'investee', label: '融资方', subLabel: '受资方', icon: Icons.building, desc: '提交融资需求，查看匹配方案' },
  { key: 'capital', code: 'investor', label: '资金方', subLabel: '投资方', icon: Icons.shield, desc: '查看对接机会' },
  { key: 'admin', code: 'cfo', label: 'CFO', subLabel: '管理端', icon: Icons.user, desc: '查看企业需求，管理平台数据' },
]

export default function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [selectedRole, setSelectedRole] = useState('enterprise')
  const [mobile, setMobile] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [smsContext, setSmsContext] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const role = useMemo(() => roles.find(item => item.key === selectedRole) || roles[0], [selectedRole])
  const isRegister = mode === 'register'
  const hasValidSmsContext = smsContext
    && smsContext.mobile === mobile
    && smsContext.mode === mode
    && (!isRegister || smsContext.role === selectedRole)
  const canSubmit = /^1[3-9]\d{9}$/.test(mobile) && /^\d{4,8}$/.test(captcha) && hasValidSmsContext && !loading

  useEffect(() => {
    if (countdown <= 0) return undefined
    const timer = window.setTimeout(() => setCountdown(value => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  const showError = (msg) => {
    setError(msg)
    setMessage('')
  }

  const showMessage = (msg) => {
    setMessage(msg)
    setError('')
  }

  const resetCaptchaState = () => {
    setCaptcha('')
    setSmsContext(null)
    setCountdown(0)
    setMessage('')
    setError('')
  }

  const handleModeChange = (nextMode) => {
    if (nextMode === mode) return
    setMode(nextMode)
    resetCaptchaState()
  }

  const handleSendSms = async () => {
    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      showError('请输入正确的手机号')
      return
    }
    try {
      setLoading(true)
      await sendLoginSms({
        mobile,
        autoRegister: isRegister,
        roleCode: isRegister ? PORTAL_ROLE_TO_BACKEND[selectedRole] : undefined,
      })
      setSmsContext({ mobile, mode, role: selectedRole })
      setCaptcha('')
      setCountdown(60)
      showMessage('验证码已发送')
    } catch (e) {
      showError(`验证码发送失败：${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return

    const roleCode = isRegister ? PORTAL_ROLE_TO_BACKEND[selectedRole] : ''
    try {
      setLoading(true)
      const login = await loginWithPhoneCode({
        mobile,
        captcha,
        autoRegister: isRegister,
        roleCode,
      })
      const token = login.accessToken || login.token || login.ticket || ''
      const user = token ? await fetchUserInfoWithToken(token, login) : await fetchUserInfo()
      const userRoles = Array.isArray(user?.roles) ? user.roles : []
      const portalRole = resolvePortalRole(userRoles, roleCode)

      if (!portalRole) {
        showError('当前账号还没有分配融资方、资金方或 CFO 角色')
        return
      }
      if (isRegister && portalRole !== selectedRole) {
        showError(`当前账号没有${role.label}角色，请切换正确入口登录`)
        return
      }

      const session = { role: portalRole, roleCode, token, login, user }
      setAuthSession(session)
      onLogin(session)
    } catch (err) {
      showError(`${isRegister ? '注册' : '登录'}失败：${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page auth-login-page">
      <div className="auth-bg-grid" />
      <div className="login-container auth-login-container">
        <div className="auth-hero">
          <div>
            <div className="auth-product-pill">AI 融资平台</div>
            <h1 className="auth-title">CFO-Agent</h1>
          </div>
          <div className="auth-brand-mark">
            {Icons.briefcase}
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-card-head">
            <div>
              <h2>{isRegister ? '创建账号' : '登录账号'}</h2>
              <p>{isRegister ? '选择身份后完成手机号验证' : '输入手机号验证码登录'}</p>
            </div>
            <span>{isRegister ? 'Register' : 'Login'}</span>
          </div>

          {isRegister && (
            <div className="auth-register-section">
              <div className="auth-section-label">注册身份</div>
              <div className="auth-role-grid">
                {roles.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    className={`auth-role-option ${selectedRole === item.key ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedRole(item.key)
                      resetCaptchaState()
                    }}
                  >
                    <span className="auth-role-icon">{item.icon}</span>
                    <span>
                      <strong>{item.label}</strong>
                      <em>{item.subLabel}</em>
                    </span>
                    <i>{item.code}</i>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span>手机号</span>
              <input
                value={mobile}
                onChange={e => {
                  setMobile(e.target.value.trim())
                  resetCaptchaState()
                }}
                inputMode="tel"
                maxLength={11}
                placeholder="请输入手机号"
                autoComplete="tel"
              />
            </label>

            <label className="auth-field">
              <span>验证码</span>
              <div className="auth-code-row">
                <input value={captcha} onChange={e => setCaptcha(e.target.value.trim())} inputMode="numeric" placeholder="请输入验证码" />
                <button type="button" className="btn-outline btn-sm" onClick={handleSendSms} disabled={loading || countdown > 0}>
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </button>
              </div>
            </label>

            {message && <div className="auth-message success">{message}</div>}
            {error && <div className="auth-message error">{error}</div>}
            {captcha && !hasValidSmsContext && <div className="auth-message error">{isRegister ? '请先获取当前注册身份的验证码' : '请先获取当前手机号的验证码'}</div>}

            <button className="btn-primary btn-full auth-submit" type="submit" disabled={!canSubmit}>
              {loading ? '处理中...' : isRegister ? `注册并进入${role.label}` : '登录'}
            </button>

            <button
              type="button"
              className="auth-switch"
              onClick={() => handleModeChange(isRegister ? 'login' : 'register')}
            >
              {isRegister ? '已有账号，返回登录' : '还没有账号？注册账号'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

async function fetchUserInfoWithToken(token, login) {
  const session = { role: '', roleCode: '', token, login, user: null }
  setAuthSession(session)
  return fetchUserInfo()
}
