import type { PublicExperienceVariant } from "../content/copy";

export type PublicExperienceAction =
  | "page_view"
  | "prompt_focus"
  | "prompt_submit"
  | "trace_open"
  | "example_click"
  | "comparison_interact"
  | "lead_open"
  | "lead_submit"
  | "lead_success"
  | "sign_in"
  | "language_change";

export function trackPublicExperienceEvent(
  variant: PublicExperienceVariant,
  action: PublicExperienceAction,
  detail: Record<string, unknown> = {},
) {
  const prefix = variant === "websummit" ? "websummit" : "sentinela_public";
  window.dispatchEvent(new CustomEvent("sentinela:analytics", { detail: { name: `${prefix}_${action}`, surface: variant, ...detail } }));
}
