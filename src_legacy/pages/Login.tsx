import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthExperienceShell from "@/components/auth/AuthExperienceShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { buildAuthCallbackUrl, buildPasswordResetUrl, normalizeNextPath } from "@/lib/authFlow";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemoFlow = searchParams.get("demo") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { t } = useLanguage();

  const fallbackPath = isDemoFlow ? "/home?demo=1" : "/home";
  const nextPath = normalizeNextPath(searchParams.get("next"), fallbackPath);
  const verificationPath = email.trim()
    ? `/auth/verify-email?email=${encodeURIComponent(email.trim())}`
    : "/auth/verify-email";
  const authNotice = useMemo(() => {
    if (searchParams.get("passwordReset") === "1") {
      return "Password updated. Sign in with your new password.";
    }
    if (searchParams.get("reason") === "session-expired") {
      return "Your session expired. Sign in again to continue.";
    }
    return null;
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setNotice(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        navigate(nextPath);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: buildAuthCallbackUrl(nextPath),
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate(nextPath);
          return;
        }
        setNotice("Account created. Check your e-mail to verify the account before signing in.");
        setMode("login");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unexpected authentication error.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setOauthLoading("google");
      setErrorMessage(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: buildAuthCallbackUrl(nextPath),
        },
      });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Google sign-in failed.");
      setOauthLoading(null);
    }
  }

  async function handleGithubLogin() {
    try {
      setOauthLoading("github");
      setErrorMessage(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: buildAuthCallbackUrl(nextPath),
        },
      });
      if (error) throw error;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "GitHub sign-in failed.");
      setOauthLoading(null);
    }
  }

  async function handlePasswordReset() {
    if (!email.trim()) {
      setErrorMessage("Enter your account e-mail to receive the reset link.");
      return;
    }

    setResetLoading(true);
    setErrorMessage(null);
    setNotice(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: buildPasswordResetUrl(),
      });
      if (error) throw error;
      setNotice("Password reset e-mail sent. Check your inbox for the recovery link or code.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Password reset request failed.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <AuthExperienceShell
      eyebrow="Workspace Authentication"
      title="Enter Sentinela through verified identity, scoped sessions, and controlled recovery."
      description="This entry point restores sessions, routes recovery safely, and keeps users inside validated Sentinela paths instead of loose public redirects."
      status={notice ?? authNotice}
      error={errorMessage}
      highlights={[
        {
          title: "Workspace-bound sessions",
          description: "The app expects authenticated sessions before reaching protected routes and preserves the intended internal destination.",
        },
        {
          title: "Signed recovery flow",
          description: "Password reset uses Supabase recovery tokens and falls back to an inbox OTP when necessary.",
        },
        {
          title: "Verified access",
          description: "New accounts can verify the inbox manually or through the auth callback without opening cross-origin redirects.",
        },
      ]}
      cardClassName="max-w-none"
    >
      <div className="space-y-6">
        <div className="text-left">
          <Link to="/" className="font-display text-2xl font-semibold text-foreground">
            Sentinela
          </Link>
          <h2 className="mt-6 text-2xl font-semibold text-foreground">
            {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {mode === "login" ? t("auth.loginBody") : t("auth.signupBody")}
          </p>
        </div>

        {isDemoFlow ? (
          <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5 text-left">
            <div className="text-sm font-medium text-foreground">{t("auth.demoTitle")}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("auth.demoBody")}</p>
          </div>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-border/60 bg-background/45 p-5"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <Button type="submit" disabled={loading || oauthLoading !== null} className="w-full">
            {loading
              ? "Loading..."
              : mode === "login"
                ? isDemoFlow
                  ? t("auth.continueToDemo")
                  : t("auth.signIn")
                : t("auth.createAccount")}
          </Button>
        </form>

        {mode === "login" ? (
          <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-background/45 p-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="text-left text-sm text-primary underline underline-offset-4"
              onClick={handlePasswordReset}
              disabled={loading || resetLoading || oauthLoading !== null}
            >
              {resetLoading ? "Sending reset..." : "Forgot your password?"}
            </button>
            <Link to={verificationPath} className="text-sm text-muted-foreground underline underline-offset-4">
              Verify e-mail
            </Link>
          </div>
        ) : null}

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            {t("auth.orContinue")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="flex w-full items-center gap-2"
            onClick={handleGoogleLogin}
            disabled={loading || oauthLoading !== null}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 48 48"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.6-6 7.1l6.2 5.2C39.1 36.7 44 31 44 24c0-1.2-.1-2.3-.4-3.5z"
              />
            </svg>
            {oauthLoading === "google" ? "Redirecting..." : t("auth.continueGoogle")}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="flex w-full items-center gap-2"
            onClick={handleGithubLogin}
            disabled={loading || oauthLoading !== null}
          >
            <img
              src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
              alt="GitHub"
              className="h-5 w-5"
            />
            {oauthLoading === "github" ? "Redirecting..." : t("auth.continueGitHub")}
          </Button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              {t("auth.noAccount")} {" "}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setMode("signup")}
              >
                {t("auth.createOne")}
              </button>
            </>
          ) : (
            <>
              {t("auth.hasAccount")} {" "}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setMode("login")}
              >
                {t("auth.signInLink")}
              </button>
            </>
          )}
        </p>
      </div>
    </AuthExperienceShell>
  );
}
