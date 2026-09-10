export function ConvergenceHeader() {
  return (
    <header className="wsl-nav">
      <a className="wsl-brand" href="/websummitlisboa" aria-label="Sentinela Web Summit Lisbon home">
        <img src="/sentinela-icon.svg" alt="" width="26" height="26" />
        <span>SENTINELA</span>
      </a>
      <span>AI CONTROL · LIVE</span>
      <nav aria-label="Primary navigation">
        <a href="#meet">LISBON / 2026</a>
        <a className="wsl-login" href="/login">SIGN IN</a>
      </nav>
    </header>
  );
}
