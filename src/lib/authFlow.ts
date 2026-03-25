const DEFAULT_AUTH_NEXT_PATH = "/home";

export function normalizeNextPath(value: string | null | undefined, fallback = DEFAULT_AUTH_NEXT_PATH): string {
  const candidate = String(value ?? "").trim();
  if (!candidate) return fallback;
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  if (candidate.startsWith("/auth/")) return fallback;
  return candidate;
}

export function buildAuthCallbackUrl(nextPath?: string): string {
  const url = new URL("/auth/callback", window.location.origin);
  const safeNextPath = normalizeNextPath(nextPath);
  if (safeNextPath && safeNextPath !== DEFAULT_AUTH_NEXT_PATH) {
    url.searchParams.set("next", safeNextPath);
  }
  return url.toString();
}

export function buildPasswordResetUrl(): string {
  return new URL("/auth/reset-password", window.location.origin).toString();
}

export function clearTransientAuthLocation(options?: { removeCode?: boolean }): void {
  const url = new URL(window.location.href);
  url.hash = "";
  if (options?.removeCode) {
    url.searchParams.delete("code");
  }
  const nextUrl = `${url.pathname}${url.search}`;
  window.history.replaceState({}, document.title, nextUrl);
}

export function buildLoginPath(nextPath?: string, reason?: string): string {
  const url = new URL("/login", window.location.origin);
  const safeNextPath = normalizeNextPath(nextPath, "");
  if (safeNextPath) {
    url.searchParams.set("next", safeNextPath);
  }
  if (reason) {
    url.searchParams.set("reason", reason);
  }
  return `${url.pathname}${url.search}`;
}
