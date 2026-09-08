import type { UtmParams } from "../hooks/useUtmParams";
import type { PublicExperienceLocale } from "../content/copy";

export interface LeadPayload {
  email: string;
  name?: string;
  company?: string;
  role?: string;
  consent: boolean;
  website?: string;
  source: "websummit_2026";
  utm: UtmParams;
  referrer?: string;
  locale?: string;
}

export interface LeadErrors {
  email?: string;
  consent?: string;
}

export function validateLead(payload: Pick<LeadPayload, "email" | "consent">, locale: PublicExperienceLocale = "en"): LeadErrors {
  const errors: LeadErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    errors.email = locale === "pt-BR" ? "Digite um e-mail profissional válido." : "Enter a valid work email.";
  }
  if (!payload.consent) errors.consent = locale === "pt-BR" ? "O consentimento é necessário para entrarmos em contato." : "Consent is required so we can contact you.";
  return errors;
}

export async function submitLead(payload: LeadPayload, signal?: AbortSignal) {
  const baseUrl = String(import.meta.env.VITE_WEBSUMMIT_API_URL ?? "").replace(/\/+$/, "");
  if (!baseUrl) throw new Error("Lead API is not configured");
  const response = await fetch(`${baseUrl}/api/websummit/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });
  if (!response.ok) throw new Error(`Lead API returned ${response.status}`);
  return (await response.json()) as { success: true };
}
