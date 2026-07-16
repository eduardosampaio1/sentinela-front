import { useEffect, useRef, useState } from "react";
import { AuthShell } from "@/shell/AuthShell";
import { Button } from "@/components/ui/button";
import { getAuthClient } from "@/lib/auth/index";

type Mode = "login" | "register" | "reset";

const COPY: Record<Mode, { title: string; action: string }> = {
  login: { title: "Redirecting to secure sign-in", action: "Continue to sign in" },
  register: { title: "Redirecting to account creation", action: "Continue to create account" },
  reset: { title: "Redirecting to password reset", action: "Continue to reset password" },
};

/**
 * Painel de redirect OIDC (modo keycloak): dispara o fluxo do provider ao montar e
 * oferece um botão de fallback. A SPA nunca coleta senha — o login é hospedado no Keycloak.
 */
export function KeycloakRedirect({ mode, nextPath }: { mode: Mode; nextPath?: string }) {
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const client = getAuthClient();

  const start = async () => {
    setError(null);
    try {
      if (mode === "register") await client.startRegister(nextPath);
      else if (mode === "reset") await client.startPasswordReset();
      else await client.startLogin(nextPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reach the identity provider.");
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copy = COPY[mode];
  return (
    <AuthShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F1F5F9]">{copy.title}</h1>
        <p className="text-sm text-[#94A3B8]">
          You are being redirected to the Sentinela identity provider. If nothing happens, use the
          button below.
        </p>
        {error && <p className="text-sm text-[#F87171]">{error}</p>}
        <Button
          type="button"
          onClick={() => void start()}
          className="w-full h-11 rounded-xl bg-[#4F5AE8] text-[#070C18] font-semibold hover:bg-[#3E48C4] transition-colors"
        >
          {copy.action}
        </Button>
      </div>
    </AuthShell>
  );
}
