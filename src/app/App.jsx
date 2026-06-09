import { useState, useEffect } from 'react'
import { AppProvider } from '../store'
import LoginPage from '../features/auth/LoginPage'
import EnterprisePortal from '../features/enterprise/EnterprisePortal'
import AdminPortal from '../features/admin/AdminPortal'
import CapitalPortal from '../features/capital/CapitalPortal'
import { clearAuthSession, getAuthSession } from '../services/authSession'

function AppInner() {
  const [currentRole, setCurrentRole] = useState(() => getAuthSession()?.role || null)
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const handleLogin = (session) => setCurrentRole(session.role)
  const handleLogout = () => {
    clearAuthSession()
    setCurrentRole(null)
  }

  if (!currentRole) return <LoginPage onLogin={handleLogin} />
  if (currentRole === 'enterprise') return <EnterprisePortal onLogout={handleLogout} theme={theme} setTheme={setTheme} />
  if (currentRole === 'admin') return <AdminPortal onLogout={handleLogout} theme={theme} setTheme={setTheme} />
  if (currentRole === 'capital') return <CapitalPortal onLogout={handleLogout} theme={theme} setTheme={setTheme} />
  return null
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
