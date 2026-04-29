import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "pt";

interface TranslationBranch {
  [key: string]: string | TranslationBranch;
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const STORAGE_KEY = "sentinela:language";
const translations: Record<Language, TranslationBranch> = {
  en: en as TranslationBranch,
  pt: pt as TranslationBranch,
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function resolveKey(language: Language, key: string): string {
  const segments = key.split(".");
  let current: string | TranslationBranch | undefined = translations[language];

  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      current = undefined;
      break;
    }
    current = current[segment];
  }

  if (typeof current === "string") {
    return current;
  }

  current = translations.en;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return key;
    }
    current = current[segment];
  }

  return typeof current === "string" ? current : key;
}

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;

  return Object.entries(params).reduce(
    (message, [name, value]) => message.split(`{{${name}}}`).join(String(value)),
    template,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(
    () => (window.localStorage.getItem(STORAGE_KEY) as Language) || "en",
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (key: string, params?: Record<string, string | number>) =>
        interpolate(resolveKey(language, key), params),
    }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
