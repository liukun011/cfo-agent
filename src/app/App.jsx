import { useEffect } from 'react'
import { AppProvider } from '../store'
import LoginPage from '../features/auth/LoginPage'
import { clearAuthSession } from '../services/authSession'

function AppInner() {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light')
  }, [])

  useEffect(() => {
    clearAuthSession()
  }, [])

  return <LoginPage />
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  )
}
