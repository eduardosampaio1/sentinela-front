import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthExperienceShell from "@/components/auth/AuthExperienceShell";
import { clearTransientAuthLocation, normalizeNextPath } from "@/lib/authFlow";
import { supabase } from "@/lib/supabase";
import { getAuthClient } from "@/lib/auth/index";

// O StrictMode (React 18 dev) dispara o effect 2×; o authorization code OIDC é single-use,
// então a 2ª troca falharia com "Code not valid". Compartilhamos UMA troca por carregamento
// de página (reseta a cada novo callback, pois cada callback é uma navegação/reload completo).
let authExchangePromise: Promise<void> | null = null;

async function exchangeAuthArtifact(): Promise<void> {
  const authClient = getAuthClient();
  if (authClient.provider === "keycloak") {
    const session = await authClient.completeLoginCallback();
    if (!session) {
      throw new Error("Authentication callback did not return a session.");
    }
    clearTransientAuthLocation({ removeCode: true });
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const authCode = params.get("code");
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
    if (error) throw error;
    clearTransientAuthLocation({ removeCode: true });
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    clearTransientAuthLocation();
  } else {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Authentication callback is missing a valid session.");
    }
  }
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Validating your secure session...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeAuth() {
      const nextPath = normalizeNextPath(searchParams.get("next"));
      try {
        // Uma única troca por carregamento de página (guarda contra o double-invoke do StrictMode).
        if (!authExchangePromise) {
          authExchangePromise = exchangeAuthArtifact();
        }
        await authExchangePromise;

        if (cancelled) return;
        setStatus("Authentication completed. Redirecting...");
        window.setTimeout(() => {
          if (!cancelled) navigate(nextPath, { replace: true });
        }, 800);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Authentication callback failed.",
        );
        setStatus("Session validation failed.");
      }
    }

    void completeAuth();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams]);

  return (
    <AuthExperienceShell
      eyebrow="Secure Callback"
      title="Complete the signed Sentinela session and return to the workspace."
      description="This callback validates the auth artifact from Supabase, removes transient tokens from the URL, and restores the session before forwarding you."
      status={status}
      error={errorMessage}
      highlights={[
        {
          title: "Signed exchange",
          description: "The callback exchanges the auth code for a session before entering the app.",
        },
        {
          title: "Token cleanup",
          description: "Transient recovery and callback artifacts are removed from the browser URL after validation.",
        },
        {
          title: "Scoped continuation",
          description: "Users are redirected only to internal Sentinela routes after the session is restored.",
        },
      ]}
      cardClassName="max-w-none"
    >
      <div className="space-y-5">
        <div>
          <div className="dashboard-kicker">Authentication state</div>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Callback checkpoint</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            If this page does not complete automatically, the callback link may have expired. Return
            to login and trigger a new secure sign-in flow.
          </p>
        </div>

        <div className="rounded-3xl border border-border/60 bg-background/45 p-5">
          <div className="text-sm font-medium text-foreground">Need to restart the flow?</div>
          <div className="mt-3 text-sm text-muted-foreground">
            <Link to="/login" className="text-primary underline underline-offset-4">
              Return to login
            </Link>
          </div>
        </div>
      </div>
    </AuthExperienceShell>
  );
}
