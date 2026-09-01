import { Link } from "react-router-dom";

export function EventFooter() {
  return (
    <footer className="ws-footer">
      <strong>SENTINELA</strong>
      <nav aria-label="Event page footer">
        <Link to="/privacy">Privacy</Link>
        <a href="mailto:hello@sentinela.ai">Contact</a>
      </nav>
      <p>Control how AI is used.</p>
    </footer>
  );
}
