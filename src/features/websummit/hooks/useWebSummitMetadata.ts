import { useEffect } from "react";

const metadata = {
  title: "Sentinela - Control how AI is used | Web Summit 2026",
  description: "Experience how Sentinela understands, decides and controls how AI is used.",
};

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

export function useWebSummitMetadata() {
  useEffect(() => {
    const previousTitle = document.title;
    const previousCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
    const canonicalUrl = `${window.location.origin}/websummit`;
    document.title = metadata.title;
    upsertMeta('meta[name="description"]', { name: "description", content: metadata.description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: metadata.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: metadata.description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: "/websummit/social-card.svg" });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="theme-color"]', { name: "theme-color", content: "#07090d" });
    upsertCanonical(canonicalUrl);

    return () => {
      document.title = previousTitle;
      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (canonical && previousCanonical) canonical.href = previousCanonical;
      if (canonical && !previousCanonical) canonical.remove();
    };
  }, []);
}
