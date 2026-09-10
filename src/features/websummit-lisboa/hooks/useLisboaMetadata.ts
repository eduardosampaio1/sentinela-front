import { useEffect } from "react";

const title = "Sentinela | AI control, experienced | Web Summit Lisbon 2026";
const description =
  "Experience how Sentinela evaluates, routes and controls AI before an answer reaches your customer.";

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
    const url = `${window.location.origin}/websummitlisboa`;
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
      content: "/websummitlisboa/social-card.svg",
    });
    meta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
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
