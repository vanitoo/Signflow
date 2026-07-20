export function AppHeader() {
  return (
    <header className="app-header">
      <a href="#main" className="brand" aria-label="SignFlow, к рабочей области">
        <span className="brand-icon" aria-hidden>SF</span>
        <span>SignFlow</span>
      </a>
      <div className="header-actions">
        <span className="local-label">Файлы не отправляются на сервер</span>
        <a className="github-link" href="https://github.com/vanitoo/Signflow" target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </header>
  );
}
