import { trackPublicExperienceEvent } from "../analytics/events";
import { usePublicExperience } from "../usePublicExperience";

export function PublicExperienceHeader() {
  const { copy, locale, setLocale, variant } = usePublicExperience();
  const nextLocale = locale === "en" ? "pt-BR" : "en";

  return (
    <header className="ws-public-header">
      <a className="ws-public-header__brand" href="/" aria-label={locale === "pt-BR" ? "Página inicial do Sentinela" : "Sentinela home"}>{copy.brand}</a>
      <nav className="ws-public-header__actions" aria-label={locale === "pt-BR" ? "Acesso e idioma" : "Access and language"}>
        <button
          type="button"
          className="ws-language-action"
          aria-label={copy.languageLabel}
          onClick={() => {
            setLocale(nextLocale);
            trackPublicExperienceEvent(variant, "language_change", { locale: nextLocale });
          }}
        >
          {locale === "en" ? "PT" : "EN"}
        </button>
        <a className="ws-sign-in-action" href="/login" onClick={() => trackPublicExperienceEvent(variant, "sign_in")}>
          {copy.signIn}
        </a>
      </nav>
    </header>
  );
}
