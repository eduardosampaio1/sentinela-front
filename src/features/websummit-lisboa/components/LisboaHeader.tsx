export function LisboaHeader() {
  return (
    <header className="lx-header">
      <a
        className="lx-brand"
        href="/websummitlisboa"
        aria-label="Sentinela Web Summit Lisbon home"
      >
        <img src="/sentinela-icon.svg" alt="" width="28" height="28" />
        <span>SENTINELA</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#experience">Experience</a>
        <a href="#meet">Meet us</a>
        <a className="lx-login" href="/login">
          Sign in
        </a>
      </nav>
    </header>
  );
}
