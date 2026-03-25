import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import AuthExperienceShell from "@/components/auth/AuthExperienceShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildAuthCallbackUrl } from "@/lib/authFlow";
import { supabase } from "@/lib/supabase";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [verificationCode, setVerificationCode] = useState("");
  const [status, setStatus] = useState(
    "Enter the verification code from your e-mail to activate the account.",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setStatus("Validating verification code...");
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: verificationCode.trim(),
        type: "signup",
      });
      if (error) throw error;
      setStatus("E-mail verified. Redirecting to the application...");
      window.setTimeout(() => {
        navigate("/home", { replace: true });
      }, 800);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "E-mail verification failed.");
      setStatus("E-mail verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setErrorMessage("Enter the account e-mail before requesting a new verification message.");
      return;
    }

    setResending(true);
    setErrorMessage(null);
    setStatus("Requesting a new verification e-mail...");
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: {
          emailRedirectTo: buildAuthCallbackUrl("/home"),
        },
      });
      if (error) throw error;
      setStatus("Verification e-mail sent. Use the new link or code from the inbox.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Verification e-mail could not be sent.",
      );
      setStatus("Verification e-mail request failed.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthExperienceShell
      eyebrow="E-mail Verification"
      title="Activate the account before it can enter a workspace."
      description="Sentinela accepts either the signed confirmation link or the manual OTP from the inbox. Users can also request a fresh verification message without leaving the flow."
      status={status}
      error={errorMessage}
      highlights={[
        {
          title: "Manual OTP",
          description: "Verification can continue even if the browser blocks the e-mail link.",
        },
        {
          title: "Fresh message",
          description: "Users can request a new verification e-mail from the same screen.",
        },
        {
          title: "Scoped entry",
          description: "The redirect after confirmation goes back through the controlled auth callback.",
        },
      ]}
      cardClassName="max-w-none"
    >
      <div className="space-y-6">
        <div>
          <div className="dashboard-kicker">Account activation</div>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Verify the inbox ownership
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Enter the code from the verification e-mail or request a fresh message if the previous
            one expired.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-border/60 bg-background/45 p-5"
        >
          <div className="space-y-2">
            <Label htmlFor="verification-email">Account e-mail</Label>
            <Input
              id="verification-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification code</Label>
            <Input
              id="verification-code"
              type="text"
              autoComplete="one-time-code"
              value={verificationCode}
              onChange={(event) => setVerificationCode(event.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify e-mail"}
          </Button>
        </form>

        <div className="rounded-3xl border border-border/60 bg-background/45 p-5">
          <div className="text-sm font-medium text-foreground">Need a new verification e-mail?</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Request a fresh verification link and OTP for the same e-mail address.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={handleResend}
            disabled={resending}
          >
            {resending ? "Sending..." : "Send new verification e-mail"}
          </Button>
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
