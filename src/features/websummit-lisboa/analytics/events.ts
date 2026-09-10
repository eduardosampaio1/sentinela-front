export type LisboaEvent =
  | "page_view"
  | "prompt_focus"
  | "prompt_submit"
  | "analysis_complete"
  | "trace_open"
  | "scroll_chapter"
  | "comparison_interaction"
  | "lead_open"
  | "lead_submit"
  | "lead_success";

export function trackLisboaEvent(
  action: LisboaEvent,
  detail: Record<string, unknown> = {},
) {
  window.dispatchEvent(
    new CustomEvent("sentinela:analytics", {
      detail: {
        name: `lisboa_${action}`,
        surface: "websummit_lisboa",
        ...detail,
      },
    }),
  );
}
