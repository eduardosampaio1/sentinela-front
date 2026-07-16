import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getAuthClient } from "@/lib/auth/index";
import { KeycloakRedirect } from "./KeycloakRedirect";
import { AuthShell } from "@/shell/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/shared/states/ErrorState";
import { isValidEmail } from "@/lib/utils";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }
    if (!isValidEmail(email)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setError(null);
    setEmailError(undefined);
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        setError(resetError.message || "Failed to send reset instructions. Please try again.");
        return;
      }

      setSentTo(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Modo keycloak: reset de senha é hospedado pelo Keycloak (realm com resetPasswordAllowed).
  if (!getAuthClient().supportsPasswordForms()) {
    return <KeycloakRedirect mode="reset" />;
  }

  if (sent) {
    return (
      <AuthShell showValueProp={false}>
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.15)] flex items-center justify-center mx-auto mb-6">
            <svg className="w-7 h-7 text-[#34D399]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>

          <h1 className="text-2xl font-semibold text-[#F1F5F9]">Check your inbox</h1>
          <p className="text-sm text-[#94A3B8] max-w-sm mx-auto leading-relaxed">
            We sent password reset instructions to{" "}
            <span className="text-[#F1F5F9] font-medium">{sentTo}</span>.
            Check your inbox and spam folder.
          </p>

          <div className="pt-4 space-y-3">
            <Button
              onClick={() => { setSent(false); setEmail(""); }}
              variant="outline"
              className="w-full h-10 rounded-xl border-[rgba(255,255,255,0.08)] text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.06)]"
            >
              Try a different email
            </Button>
            <Link
              to="/login"
              className="block text-center text-sm text-[#94A3B8] hover:text-[#94A3B8] transition-colors"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell showValueProp={false}>
      <div className="space-y-2 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F1F5F9]">
          Reset your password
        </h1>
        <p className="text-sm text-[#94A3B8]">
          Enter your email and we'll send you reset instructions.
        </p>
      </div>

      {error && (
        <InlineError
          message={error}
          onDismiss={() => setError(null)}
          className="mb-5"
        />
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-[#94A3B8]">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(undefined);
            }}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            disabled={loading}
            className={`bg-[#0D1525] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#4F5AE8] rounded-xl h-11 ${
              emailError ? "border-[#F87171]" : ""
            }`}
          />
          {emailError && <p className="text-xs text-[#F87171]">{emailError}</p>}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#4F5AE8] text-white font-semibold hover:bg-[#3E48C4] transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 spinner" />
              Sending...
            </span>
          ) : (
            "Send reset instructions"
          )}
        </Button>

        <div className="text-center">
          <Link
            to="/login"
            className="text-sm text-[#94A3B8] hover:text-[#94A3B8] transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
