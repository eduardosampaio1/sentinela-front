import { useMemo, useState, type ReactNode } from "react";
import { getPublicExperienceCopy, type PublicExperienceLocale, type PublicExperienceVariant } from "./content/copy";
import { PublicExperienceContext } from "./publicExperienceContextValue";
const STORAGE_KEY = "sentinela.public.locale";

export function PublicExperienceConfigProvider({ variant, children }: { variant: PublicExperienceVariant; children: ReactNode }) {
  const [locale, setLocaleState] = useState<PublicExperienceLocale>(detectLocale);
  const setLocale = (next: PublicExperienceLocale) => {
    setLocaleState(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* Storage is optional. */ }
  };
  const value = useMemo(() => ({ variant, locale, setLocale, copy: getPublicExperienceCopy(locale, variant) }), [variant, locale]);
  return <PublicExperienceContext.Provider value={value}>{children}</PublicExperienceContext.Provider>;
}

function detectLocale(): PublicExperienceLocale {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "pt-BR") return stored;
  } catch { /* Storage is optional. */ }
  return navigator.language.toLowerCase().startsWith("pt") ? "pt-BR" : "en";
}
