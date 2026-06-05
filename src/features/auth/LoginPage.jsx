import { useEffect, useMemo, useState } from 'react'
import { loginWithPhoneCode, sendLoginSms } from '../../api'
import { PORTAL_ROLE_TO_BACKEND } from '../../services/authSession'
import { Icons } from '../../shared/components/Icons'

const roles = [
  { key: 'enterprise', code: 'investee', label: '融资方', subLabel: '受资方', icon: Icons.building, desc: '提交融资需求，查看匹配方案' },
  { key: 'capital', code: 'investor', label: '资金方', subLabel: '投资方', icon: Icons.shield, desc: '查看对接机会' },
  { key: 'admin', code: 'cfo', label: 'CFO', subLabel: '管理端', icon: Icons.user, desc: '查看企业需求，管理平台数据' },
]

export default function LoginPage() {
  const [mode] = useState('register')
  const [selectedRole] = useState('capital')
  const [mobile, setMobile] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [smsContext, setSmsContext] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [registeredMobile, setRegisteredMobile] = useState('')

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

  const handleSendSms = async () => {
    if (!/^1[3-9]\d{9}$/.test(mobile)) {
      showError('请输入正确的手机号')
      return
    }
    try {
      setLoading(true)
      await sendLoginSms({
        mobile,
        autoRegister: true,
        roleCode: PORTAL_ROLE_TO_BACKEND[selectedRole],
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

    const roleCode = PORTAL_ROLE_TO_BACKEND[selectedRole]
    try {
      setLoading(true)
      await loginWithPhoneCode({
        mobile,
        captcha,
        autoRegister: true,
        roleCode,
      })
      setRegisteredMobile(mobile)
    } catch (err) {
      showError(`注册失败：${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (registeredMobile) {
    return (
      <div className="login-page auth-login-page investor-register-only">
        <div className="auth-bg-grid" />
        <div className="login-container auth-login-container">
          <div className="auth-success-card">
            <div className="auth-success-icon">{Icons.check}</div>
            <span className="auth-success-kicker">资金方注册</span>
            <h1>注册成功</h1>
            <p>账号 {maskMobile(registeredMobile)} 已完成资金方注册，请等待后续开通或使用已配置入口进入资金方工作台。</p>
          </div>
        </div>
      </div>
    )
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
              <h2>资金方注册</h2>
              <p>使用手机号完成验证，注册成为平台资金方用户。</p>
            </div>
            <span>Register</span>
          </div>

          <div className="auth-register-section investor-invite-section">
            <div className="auth-section-label">注册入口</div>
            <div className="auth-role-option active investor-invite-role">
              <span className="auth-role-icon">{role.icon}</span>
              <span>
                <strong>{role.label}</strong>
                <em>{role.subLabel}</em>
              </span>
              <i>{role.code}</i>
            </div>
          </div>

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
            {captcha && !hasValidSmsContext && <div className="auth-message error">请先获取当前手机号的验证码</div>}

            <button className="btn-primary btn-full auth-submit" type="submit" disabled={!canSubmit}>
              {loading ? '注册中...' : '注册资金方账号'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

function maskMobile(value) {
  const text = String(value || '')
  if (text.length !== 11) return text
  return `${text.slice(0, 3)}****${text.slice(7)}`
}
