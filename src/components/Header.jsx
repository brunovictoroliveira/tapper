export default function Header({ action }) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Tapper, início">
        tapper<span>.</span>
      </a>
      {action}
    </header>
  )
}
