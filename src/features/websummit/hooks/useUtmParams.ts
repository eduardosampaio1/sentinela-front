import { useMemo } from "react";

export interface UtmParams {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
}

export function parseUtmParams(search: string): UtmParams {
  const params = new URLSearchParams(search);
  const pick = (key: string) => params.get(key)?.slice(0, 160) || undefined;
  return {
    source: pick("utm_source"),
    medium: pick("utm_medium"),
    campaign: pick("utm_campaign"),
    content: pick("utm_content"),
  };
}

export function useUtmParams() {
  return useMemo(() => parseUtmParams(window.location.search), []);
}
