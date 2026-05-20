import { Icons } from './Icons'

export default function Topbar({ role, theme, setTheme, onLogout, leftSlot }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        {leftSlot || (
          <>
            <span className="topbar-brand">CFO-Agent</span>
            <span className="topbar-role">{role}</span>
          </>
        )}
      </div>
      <div className="topbar-right">
        <button className="topbar-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? Icons.dark : Icons.light}</button>
        <button className="topbar-btn" onClick={onLogout}>{Icons.logout}</button>
      </div>
    </header>
  )
}

