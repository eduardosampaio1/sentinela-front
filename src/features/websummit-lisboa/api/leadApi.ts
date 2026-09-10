export interface LisboaLead {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  consent: boolean;
  website?: string;
}

function parseUtmParams(search: string) {
  const params = new URLSearchParams(search);
  const pick = (key: string) => params.get(key)?.slice(0, 160) || undefined;
  return {
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    campaign: pick("utm_campaign"),
    content: pick("utm_content"),
  };
}

export function validateLisboaLead(
  lead: Pick<LisboaLead, "email" | "consent">,
) {
  return {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())
      ? ""
      : "Enter a valid work email.",
    consent: lead.consent ? "" : "Consent is required so we can contact you.",
  };
}

export async function submitLisboaLead(lead: LisboaLead, signal?: AbortSignal) {
  const baseUrl = String(import.meta.env.VITE_WEBSUMMIT_API_URL ?? "").replace(
    /\/+$/,
    "",
  );
  if (!baseUrl) throw new Error("Lead API is not configured");
  const response = await fetch(`${baseUrl}/api/websummit/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...lead,
      source: "websummit_lisboa_2026",
      utm: parseUtmParams(window.location.search),
      referrer: document.referrer.slice(0, 500) || undefined,
      locale: "en",
    }),
    signal,
  });
  if (!response.ok) throw new Error(`Lead API returned ${response.status}`);
  return (await response.json()) as { success: true };
}
