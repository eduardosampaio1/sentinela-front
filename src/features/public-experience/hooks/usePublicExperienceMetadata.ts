import { useEffect } from "react";
import { usePublicExperience } from "../usePublicExperience";

const metadata = {
  official: {
    en: {
      title: "Sentinela | Control how AI serves your customers",
      description: "Understand quality, behavior and cost across real AI customer-service conversations, then control what happens next.",
    },
    "pt-BR": {
      title: "Sentinela | Controle como a IA atende seus clientes",
      description: "Entenda qualidade, comportamento e custo nas conversas reais de atendimento com IA e controle o que acontece depois.",
    },
  },
  websummit: {
    en: {
      title: "Sentinela | Control how AI is used | Web Summit 2026",
      description: "Experience how Sentinela controls AI quality, routing and token spend for customer-service teams.",
    },
    "pt-BR": {
      title: "Sentinela | Controle como a IA é usada | Web Summit 2026",
      description: "Experimente como o Sentinela controla qualidade, rotas e consumo de tokens no atendimento com IA.",
    },
  },
} as const;

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => element!.setAttribute(key, value));
}

function upsertCanonical(href: string) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
  }
  element.href = href;
}

export function usePublicExperienceMetadata() {
  const { variant, locale } = usePublicExperience();
  useEffect(() => {
    const previousTitle = document.title;
    const previousLanguage = document.documentElement.lang;
    const previousCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const current = metadata[variant][locale];
    const canonicalPath = variant === "websummit" ? "/websummit" : "/";
    const canonicalUrl = `${window.location.origin}${canonicalPath}`;
    document.title = current.title;
    document.documentElement.lang = locale;
    upsertMeta('meta[name="description"]', { name: "description", content: current.description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: current.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: current.description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    const socialCard = variant === "websummit" ? "/websummit/social-card.svg" : "/sentinela/social-card.svg";
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: socialCard });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="theme-color"]', { name: "theme-color", content: "#07090d" });
    upsertCanonical(canonicalUrl);

    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLanguage;
      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonical && previousCanonical) canonical.href = previousCanonical;
      if (canonical && !previousCanonical) canonical.remove();
    };
  }, [locale, variant]);
}
