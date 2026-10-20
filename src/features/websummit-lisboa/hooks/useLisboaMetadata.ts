import { useEffect } from "react";

const title = "Sentinela | Web Summit Lisbon 2026";
const description =
  "Experience AI control and get a free batch analysis of 1 million conversations with AI Observability by Sentinela.";

function meta(selector: string, attributes: Record<string, string>) {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement("meta");
    document.head.appendChild(node);
  }
  Object.entries(attributes).forEach(([key, value]) =>
    node!.setAttribute(key, value),
  );
}

export function useLisboaMetadata() {
  useEffect(() => {
    const previousTitle = document.title;
    const previousLang = document.documentElement.lang;
    document.title = title;
    document.documentElement.lang = "en";
    const url = `${window.location.origin}/websummit`;
    meta('meta[name="description"]', {
      name: "description",
      content: description,
    });
    meta('meta[property="og:title"]', { property: "og:title", content: title });
    meta('meta[property="og:description"]', {
      property: "og:description",
      content: description,
    });
    meta('meta[property="og:url"]', { property: "og:url", content: url });
    meta('meta[property="og:type"]', {
      property: "og:type",
      content: "website",
    });
    meta('meta[property="og:image"]', {
      property: "og:image",
      content: `${window.location.origin}/websummitlisboa/social-card-en.png`,
    });
    meta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    meta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    meta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    meta('meta[name="twitter:image"]', { name: "twitter:image", content: `${window.location.origin}/websummitlisboa/social-card-en.png` });
    meta('meta[property="og:locale"]', { property: "og:locale", content: "en_US" });
    meta('meta[name="theme-color"]', {
      name: "theme-color",
      content: "#efefe9",
    });
    let canonical = document.head.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = url;
    return () => {
      document.title = previousTitle;
      document.documentElement.lang = previousLang;
    };
  }, []);
}
