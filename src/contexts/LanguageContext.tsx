// O idioma da INTERFACE — e, desde a M41, quem manda nele muda conforme quem está olhando.
//
// ## Duas coisas diferentes que tinham o mesmo nome
//
// Antes, este contexto era a autoridade do idioma, e a fonte era `localStorage`:
//
//     useState(() => (localStorage.getItem(KEY) as Language) || "en")
//
// Esse `|| "en"` colapsava **não escolheu** com **escolheu inglês** — exatamente a distinção que a
// BD11 fez o backend preservar. Enquanto ninguém lia o backend, o colapso era invisível.
//
// Agora há duas coisas, e elas não são a mesma:
//
//   • **idioma em uso na tela** — o que este contexto guarda. Existe para usuário anônimo também,
//     porque a Landing e as páginas legais precisam de um idioma sem ninguém ter entrado;
//   • **preferência da CONTA** — mora no `sentinela-account`, chega por `GET /v1/me/language`, e
//     este arquivo **não a possui**. Ele nem sabe se ela existe.
//
// ## O papel do `localStorage` depois da M41
//
// Ele continua, e continua útil: sem ele a interface pisca em inglês a cada carregamento antes de
// a resposta do backend chegar. Mas ele é **cache visual, não autoridade**:
//
//   • ele NUNCA decide `stored_language`. Nada aqui afirma que o usuário escolheu alguma coisa;
//   • ele NUNCA provoca escrita. Entrar na conta com `pt` no navegador não persiste preferência —
//     a preferência da conta continua sendo o que o backend disser, inclusive "nenhuma";
//   • quando o backend responde, **o backend vence**, e é isso que `aplicarPreferenciaDaConta` faz.
//
// Quem reconcilia é o `ReconciliadorDeIdioma`, montado só na árvore autenticada.

import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "pt";

/** De onde veio o idioma que está na tela. A tela não usa isto; os gates e o diagnóstico usam. */
export type OrigemDoIdioma = "cache" | "escolha-local" | "conta";

interface TranslationBranch {
  [key: string]: string | TranslationBranch;
}

interface LanguageContextValue {
  language: Language;
  /** Troca o idioma da TELA. Não persiste preferência de conta — quem faz isso é a CFG-02. */
  setLanguage: (language: Language) => void;
  /**
   * Aplica o idioma que o **backend** confirmou. Separado de `setLanguage` de propósito: são
   * intenções diferentes, e um nome só faria "o servidor disse" e "o usuário clicou" virarem a
   * mesma coisa no código.
   */
  aplicarPreferenciaDaConta: (language: Language) => void;
  origem: OrigemDoIdioma;
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

/**
 * O idioma inicial da TELA, vindo do cache.
 *
 * Repare no que isto NÃO é: não é `stored_language`, não é uma escolha, e não é entrada para
 * nenhuma escrita. É só com que idioma pintar a primeira tela enquanto o backend não responde —
 * e, para usuário anônimo, é o único idioma que existe.
 */
function idiomaDoCache(): Language {
  const bruto = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
  return bruto === "pt" || bruto === "en" ? bruto : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(idiomaDoCache);
  const [origem, setOrigem] = useState<OrigemDoIdioma>("cache");

  // A conta, uma vez conhecida, não é derrubada por cache. Sem esta trava, um remount do provider
  // reabriria em `cache` e a tela poderia voltar ao idioma antigo por um instante.
  const contaMandou = useRef(false);

  const setLanguage = useCallback((novo: Language) => {
    setLanguageState(novo);
    setOrigem(contaMandou.current ? "conta" : "escolha-local");
  }, []);

  const aplicarPreferenciaDaConta = useCallback((novo: Language) => {
    contaMandou.current = true;
    setLanguageState(novo);
    setOrigem("conta");
  }, []);

  useEffect(() => {
    // Cache visual, e só. Gravar aqui não afirma escolha nenhuma sobre a conta — é o que evita a
    // interface piscar em inglês no próximo carregamento.
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      aplicarPreferenciaDaConta,
      origem,
      t: (key: string, params?: Record<string, string | number>) =>
        interpolate(resolveKey(language, key), params),
    }),
    [language, origem, setLanguage, aplicarPreferenciaDaConta],
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
