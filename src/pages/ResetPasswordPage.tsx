import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthExperienceShell from "@/components/auth/AuthExperienceShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearTransientAuthLocation } from "@/lib/authFlow";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [email, setEmail] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [status, setStatus] = useState("Validating your recovery session...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const hasRecoveryLink = useMemo(() => {
    if (searchParams.get("code")) return true;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return Boolean(hashParams.get("access_token") && hashParams.get("refresh_token"));
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapRecoverySession() {
      try {
        if (!hasRecoveryLink) {
          setStatus("Enter the recovery code from your e-mail if the recovery link did not open.");
          return;
        }

        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const authCode = searchParams.get("code");

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw error;
          clearTransientAuthLocation();
        } else if (authCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          clearTransientAuthLocation({ removeCode: true });
        }

        if (cancelled) return;
        setSessionReady(true);
        setErrorMessage(null);
        setStatus("Recovery session confirmed. You can choose a new password.");
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Recovery link is invalid or expired.",
        );
        setStatus("Use the e-mail recovery code below to continue.");
      }
    }

    void bootstrapRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [hasRecoveryLink, searchParams]);

  async function handleUseRecoveryCode() {
    if (!email.trim() || !recoveryCode.trim()) {
      setErrorMessage("Enter the account e-mail and the recovery code from the e-mail.");
      return;
    }

    setVerifyingCode(true);
    setErrorMessage(null);
    setStatus("Validating recovery code...");
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: recoveryCode.trim(),
        type: "recovery",
      });
      if (error) throw error;
      setSessionReady(true);
      setStatus("Recovery code accepted. You can now update the password.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Recovery code validation failed.",
      );
      setStatus("Recovery code validation failed.");
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!sessionReady) {
      setErrorMessage("Validate the recovery link or recovery code before updating the password.");
      return;
    }
    if (password.length < 10) {
      setErrorMessage("Password must be at least 10 characters long.");
      return;
    }
    if (password !== confirmation) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    setErrorMessage(null);
    setStatus("Updating password...");
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setStatus("Password updated. Redirecting to login...");
      window.setTimeout(() => {
        navigate("/login?passwordReset=1", { replace: true });
      }, 900);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Password update failed.");
      setStatus("Password update failed.");
    } finally {
      setUpdatingPassword(false);
    }
  }

  return (
    <AuthExperienceShell
      eyebrow="Password Recovery"
      title="Recover account access without opening a security gap."
      description="Sentinela accepts the signed reset session when available and falls back to a recovery OTP when the link expires or the browser blocks the redirect."
      status={status}
      error={errorMessage}
      highlights={[
        {
          title: "Signed recovery",
          description: "Recovery links bootstrap a temporary session before any password change is allowed.",
        },
        {
          title: "OTP fallback",
          description: "Users can continue with the one-time code from the e-mail if the link fails.",
        },
        {
          title: "Session reset",
          description: "The user is signed out after the password update to force a clean re-entry.",
        },
      ]}
      cardClassName="max-w-none"
    >
      <div className="space-y-6">
        <div>
          <div className="dashboard-kicker">Access restoration</div>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Set a new password</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Password changes require a valid recovery session. Use the link from the e-mail first,
            or validate the recovery code below before setting the new password.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-border/60 bg-background/45 p-5"
        >
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!sessionReady || updatingPassword}>
            {updatingPassword ? "Updating..." : "Update password"}
          </Button>
        </form>

        <div className="rounded-3xl border border-border/60 bg-background/45 p-5">
          <div className="dashboard-kicker">Fallback path</div>
          <div className="mt-2 text-lg font-semibold text-foreground">
            Use the recovery code from the e-mail
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            If the recovery link expired or did not open correctly, validate the one-time code sent
            to the same inbox.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="recovery-email">Account e-mail</Label>
              <Input
                id="recovery-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recovery-code">Recovery code</Label>
              <Input
                id="recovery-code"
                type="text"
                autoComplete="one-time-code"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleUseRecoveryCode}
              disabled={verifyingCode}
            >
              {verifyingCode ? "Validating..." : "Use recovery code"}
            </Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          <Link to="/login" className="text-primary underline underline-offset-4">
            Back to login
          </Link>
        </div>
      </div>
    </AuthExperienceShell>
  );
}
