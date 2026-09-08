import { usePublicExperience } from "../usePublicExperience";

export function ExperienceFooter() {
  const { copy } = usePublicExperience();
  return (
    <footer className="ws-footer">
      <strong>SENTINELA</strong>
      <nav aria-label={copy.footer.nav}>
        <a href="/privacy">{copy.footer.privacy}</a>
        <a href="/terms">{copy.footer.terms}</a>
        <a href="mailto:hello@sentinela.ai">{copy.footer.contact}</a>
      </nav>
      <p>{copy.footer.tagline}</p>
    </footer>
  );
}
