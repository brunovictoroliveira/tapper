import { useAuth } from '../features/auth/hooks/useAuth.js'

function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'U'
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase()
}

export default function Header({ action, showAccount = true }) {
  const auth = useAuth()
  const user = auth.session?.user
  const name = auth.entitlement?.profile?.display_name || user?.user_metadata?.display_name || user?.email

  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Tapper, início">
        tapper<span>.</span>
      </a>
      <div className="topbar-actions">
        {action}
        {showAccount && (user ? (
          <a className="user-avatar" href="/account" aria-label="Abrir minha conta" title={name}>
            {initials(name)}
          </a>
        ) : (
          <a className="topbar-link" href="/login">ENTRAR</a>
        ))}
      </div>
    </header>
  )
}
