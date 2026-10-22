export const homeProducts = [
  "ai_observability",
  "ai_control",
  "brand_radar",
] as const;
export type HomeProduct = (typeof homeProducts)[number];
export const homeProductNames: Record<HomeProduct, string> = {
  ai_observability: "AI Observability",
  ai_control: "AI Control",
  brand_radar: "Brand Radar",
};

export function createLeadRequestId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export interface HomeLeadPayload {
  request_id: string;
  email: string;
  name?: string;
  company?: string;
  products: HomeProduct[];
  consent: true;
  locale: "pt-BR" | "en";
  website: string;
}

export async function submitHomeLead(lead: HomeLeadPayload) {
  const base = String(import.meta.env.VITE_WEBSUMMIT_API_URL ?? "").replace(
    /\/+$/,
    "",
  );
  if (!base) throw new Error("Lead capture is not configured");
  const params = new URLSearchParams(window.location.search);
  const pick = (key: string) => params.get(key)?.slice(0, 160) || undefined;
  const response = await fetch(`${base}/api/website/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...lead,
      utm: {
        source: pick("utm_source"),
        medium: pick("utm_medium"),
        campaign: pick("utm_campaign"),
        content: pick("utm_content"),
      },
      referrer: document.referrer.slice(0, 500) || undefined,
    }),
  });
  if (!response.ok) throw new Error("Lead capture failed");
  const result = await response.json();
  if (result?.success !== true || result?.confirmation !== "queued")
    throw new Error("Lead capture was not confirmed");
}
