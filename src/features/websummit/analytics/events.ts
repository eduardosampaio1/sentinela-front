export type WebSummitEventName =
  | "websummit_page_view"
  | "websummit_prompt_focus"
  | "websummit_prompt_submit"
  | "websummit_trace_open"
  | "websummit_example_click"
  | "websummit_comparison_interact"
  | "websummit_lead_open"
  | "websummit_lead_submit"
  | "websummit_lead_success";

export function trackWebSummitEvent(name: WebSummitEventName, detail: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent("sentinela:analytics", { detail: { name, ...detail } }));
}
