import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemoFlow = searchParams.get("demo") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );
  const { t } = useLanguage();

  const nextPath = isDemoFlow ? "/dashboard?demo=1" : "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        navigate(nextPath);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        alert("Conta criada com sucesso. Agora faça login.");
        setMode("login");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro inesperado de autenticação";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    try {
      setOauthLoading("google");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${nextPath}`,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao entrar com Google";
      alert(message);
      setOauthLoading(null);
    }
  }

  async function handleGithubLogin() {
    try {
      setOauthLoading("github");

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}${nextPath}`,
        },
      });

      if (error) throw error;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao entrar com GitHub";
      alert(message);
      setOauthLoading(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-hero px-4 sm:px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>
          <Link to="/" className="text-2xl font-bold text-foreground">
            Sentinela
          </Link>

          <h1 className="mt-6 mb-2 text-xl font-semibold">
            {mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}
          </h1>

          <p className="text-sm text-muted-foreground">
            {mode === "login"
              ? t("auth.loginBody")
              : t("auth.signupBody")}
          </p>

          {isDemoFlow ? (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-left">
              <div className="text-sm font-medium text-foreground">{t("auth.demoTitle")}</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("auth.demoBody")}
              </p>
            </div>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@empresa.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || oauthLoading !== null}
            className="w-full"
          >
            {loading
              ? "Loading..."
              : mode === "login"
                ? (isDemoFlow ? t("auth.continueToDemo") : t("auth.signIn"))
                : t("auth.createAccount")}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">{t("auth.orContinue")}</span>
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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              {t("auth.noAccount")}{" "}
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
              {t("auth.hasAccount")}{" "}
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
    </div>
  );
}
