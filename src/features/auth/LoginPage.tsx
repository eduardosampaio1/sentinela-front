import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/shell/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/shared/states/ErrorState";
import { isValidEmail } from "@/lib/utils";

// ─── OAuth helpers ─────────────────────────────────────────────────────────────

async function signInWithOAuth(provider: "google" | "github") {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${window.location.origin}/home` },
  });
  if (error) throw error;
}

// ─── Google icon ───────────────────────────────────────────────────────────────

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="w-4 h-4 flex-shrink-0" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.6-6 7.1l6.2 5.2C39.1 36.7 44 31 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

// ─── GitHub icon ───────────────────────────────────────────────────────────────

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

type AuthError = {
  message: string;
  type: "credentials" | "not-found" | "network" | "generic";
};

function parseAuthError(error: unknown): AuthError {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();

  if (lower.includes("invalid login") || lower.includes("invalid credentials") || lower.includes("wrong password")) {
    return { message: "Email or password is incorrect. Please check your credentials.", type: "credentials" };
  }
  if (lower.includes("user not found") || lower.includes("no user found")) {
    return { message: "No account found with this email address.", type: "not-found" };
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return { message: "Network error. Check your connection and try again.", type: "network" };
  }
  return { message: msg || "Authentication failed. Please try again.", type: "generic" };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  async function handleOAuth(provider: "google" | "github") {
    setError(null);
    setOauthLoading(provider);
    try {
      await signInWithOAuth(provider);
    } catch (err) {
      setError({ message: err instanceof Error ? err.message : `${provider === "google" ? "Google" : "GitHub"} sign-in failed. Try again.`, type: "generic" });
      setOauthLoading(null);
    }
  }

  function validate() {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        setError(parseAuthError(authError));
        return;
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="space-y-2 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F1F5F9]">
          Enter your analysis workspace
        </h1>
        <p className="text-sm text-[#475569]">
          Don't have an account?{" "}
          <Link to="/register" className="text-[#22D3EE] hover:text-[#06B6D4] transition-colors">
            Create one for free
          </Link>
        </p>
      </div>

      {error && (
        <InlineError
          message={error.message}
          onDismiss={() => setError(null)}
          className="mb-5"
        />
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-[#94A3B8]">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            disabled={loading}
            className={`bg-[#0D1525] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] placeholder:text-[#2D3748] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl h-11 ${
              fieldErrors.email ? "border-[#F87171] focus:border-[#F87171]" : ""
            }`}
          />
          {fieldErrors.email && (
            <p className="text-xs text-[#F87171]">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm text-[#94A3B8]">
              Password
            </Label>
            <Link
              to="/forgot-password"
              className="text-xs text-[#475569] hover:text-[#94A3B8] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={loading}
            className={`bg-[#0D1525] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] placeholder:text-[#2D3748] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl h-11 ${
              fieldErrors.password ? "border-[#F87171] focus:border-[#F87171]" : ""
            }`}
          />
          {fieldErrors.password && (
            <p className="text-xs text-[#F87171]">{fieldErrors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#22D3EE] text-[#070C18] font-semibold hover:bg-[#06B6D4] transition-colors mt-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 spinner" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* OAuth divider */}
      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[rgba(255,255,255,0.06)]" />
        <span className="text-xs text-[#2D3748]">or continue with</span>
        <div className="h-px flex-1 bg-[rgba(255,255,255,0.06)]" />
      </div>

      {/* OAuth buttons */}
      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("google")}
          disabled={loading || oauthLoading !== null}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-2.5 bg-[#0D1525] border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F1F5F9] transition-colors"
        >
          <GoogleIcon />
          {oauthLoading === "google" ? "Redirecting…" : "Continue with Google"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleOAuth("github")}
          disabled={loading || oauthLoading !== null}
          className="w-full h-11 rounded-xl flex items-center justify-center gap-2.5 bg-[#0D1525] border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:bg-[rgba(255,255,255,0.05)] hover:text-[#F1F5F9] transition-colors"
        >
          <GitHubIcon />
          {oauthLoading === "github" ? "Redirecting…" : "Continue with GitHub"}
        </Button>
      </div>
    </AuthShell>
  );
}
