import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getAuthClient } from "@/lib/auth/index";
import { KeycloakRedirect } from "./KeycloakRedirect";
import { AuthShell } from "@/shell/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineError } from "@/shared/states/ErrorState";
import { isValidEmail } from "@/lib/utils";

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export function RegisterPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Modo keycloak: registro é hospedado pelo Keycloak (realm com registrationAllowed).
  if (!getAuthClient().supportsPasswordForms()) {
    return <KeycloakRedirect mode="register" />;
  }

  function validate(): boolean {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = "Full name is required.";
    if (!email.trim()) errors.email = "Email is required.";
    else if (!isValidEmail(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Password is required.";
    else if (password.length < 8) errors.password = "Password must be at least 8 characters.";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your password.";
    else if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setError(null);
    setLoading(true);

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            name: name.trim(),
          },
        },
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already exists")) {
          setError("An account with this email already exists. Try signing in instead.");
        } else {
          setError(signUpError.message || "Registration failed. Please try again.");
        }
        return;
      }

      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const clearFieldError = (field: keyof FieldErrors) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const inputClass = (field: keyof FieldErrors) =>
    `bg-[#0D1525] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] placeholder:text-[#475569] focus:border-[#22D3EE] focus:ring-[#22D3EE]/20 rounded-xl h-11 ${
      fieldErrors[field] ? "border-[#F87171] focus:border-[#F87171]" : ""
    }`;

  return (
    <AuthShell>
      <div className="space-y-2 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#F1F5F9]">
          Create your workspace
        </h1>
        <p className="text-sm text-[#94A3B8]">
          Start monitoring your AI system quality in minutes.{" "}
          <Link to="/login" className="text-[#22D3EE] hover:text-[#06B6D4] transition-colors">
            Already have an account?
          </Link>
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
          <Label htmlFor="name" className="text-sm text-[#94A3B8]">Full name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); clearFieldError("name"); }}
            placeholder="Jane Doe"
            autoComplete="name"
            autoFocus
            disabled={loading}
            className={inputClass("name")}
          />
          {fieldErrors.name && <p className="text-xs text-[#F87171]">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm text-[#94A3B8]">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError("email"); }}
            placeholder="you@company.com"
            autoComplete="email"
            disabled={loading}
            className={inputClass("email")}
          />
          {fieldErrors.email && <p className="text-xs text-[#F87171]">{fieldErrors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm text-[#94A3B8]">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); clearFieldError("password"); }}
            placeholder="Min. 8 characters"
            autoComplete="new-password"
            disabled={loading}
            className={inputClass("password")}
          />
          {fieldErrors.password && <p className="text-xs text-[#F87171]">{fieldErrors.password}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-sm text-[#94A3B8]">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError("confirmPassword"); }}
            placeholder="Repeat your password"
            autoComplete="new-password"
            disabled={loading}
            className={inputClass("confirmPassword")}
          />
          {fieldErrors.confirmPassword && <p className="text-xs text-[#F87171]">{fieldErrors.confirmPassword}</p>}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-[#22D3EE] text-[#070C18] font-semibold hover:bg-[#06B6D4] transition-colors mt-2"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 spinner" />
              Creating account...
            </span>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="text-xs text-[#475569] text-center">
          By creating an account, you agree to our terms of service and privacy policy.
        </p>
      </form>
    </AuthShell>
  );
}
