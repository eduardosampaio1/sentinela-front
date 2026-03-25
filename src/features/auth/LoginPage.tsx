import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { AuthShell } from "@/shell/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/shared/states/ErrorState";
import { isValidEmail } from "@/lib/utils";

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
  const [error, setError] = useState<AuthError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

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
    </AuthShell>
  );
}
