import { useState } from "react";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAuthClient } from "@/lib/auth/index";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card-base p-6">
      <div className="mb-5 pb-5 border-b border-[rgba(255,255,255,0.05)]">
        <h2 className="text-base font-semibold text-[#F1F5F9]">{title}</h2>
        {description && <p className="text-sm text-[#94A3B8] mt-1">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, email }: { name?: string; email?: string }) {
  const text = name ?? email ?? "?";
  const parts = text.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : text.slice(0, 2).toUpperCase();

  return (
    <div className="w-16 h-16 rounded-2xl bg-[rgba(79,90,232,0.10)] border border-[rgba(79,90,232,0.18)] flex items-center justify-center flex-shrink-0">
      <span className="text-xl font-bold text-[#4F5AE8]">{initials}</span>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { user } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "—";

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    // Modo keycloak: credenciais são geridas no Account Console do Keycloak.
    const authClient = getAuthClient();
    if (!authClient.supportsPasswordForms()) {
      const url = authClient.accountManagementUrl();
      if (url) window.location.href = url;
      return;
    }
    if (!newPassword) { setPasswordError("New password is required."); return; }
    if (newPassword.length < 8) { setPasswordError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match."); return; }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      // Aqui ficava `supabase.auth.updateUser({ password })`. Trecho MORTO desde que o Keycloak
      // assumiu: o guarda acima já desvia para o Account Console (D19), e a SPA não troca
      // credencial. Removido na M02 sem tocar na aparência desta tela.
      const error = new Error("unreachable: credential change is delegated to the provider");
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Password update failed. Try again."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <AppShell topBarTitle="Profile">
      <PageFrame maxWidth="lg">
        <PageHeader
          title="Profile"
          description="Your account identity and security settings."
        />

        <div className="space-y-6">

          {/* Identity card */}
          <Section
            title="Account identity"
            description="Your profile as it appears across Sentinela."
          >
            <div className="flex items-center gap-5 mb-6">
              <Avatar name={displayName !== "—" ? displayName : undefined} email={user?.email} />
              <div>
                <p className="text-base font-semibold text-[#F1F5F9]">{displayName}</p>
                <p className="text-sm text-[#94A3B8]">{user?.email ?? "—"}</p>
                {memberSince && (
                  <p className="text-xs text-[#71809A] mt-1">Member since {memberSince}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest font-semibold text-[#71809A]">Full name</p>
                <p className="text-sm text-[#94A3B8]">{displayName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest font-semibold text-[#71809A]">Email address</p>
                <p className="text-sm text-[#94A3B8]">{user?.email ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest font-semibold text-[#71809A]">User ID</p>
                <p className="text-xs font-mono text-[#71809A] break-all">{user?.id ?? "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-widest font-semibold text-[#71809A]">Auth provider</p>
                <p className="text-sm text-[#94A3B8]">
                  {(user?.app_metadata?.provider as string | undefined) ?? "email"}
                </p>
              </div>
            </div>
          </Section>

          {/* Security */}
          <Section
            title="Password"
            description="Change your login password. Your current session will remain active."
          >
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-sm text-[#94A3B8]">
                  New password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Minimum 8 characters"
                  className="bg-[#111D30] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] placeholder:text-[#71809A] rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm text-[#94A3B8]">
                  Confirm new password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordError(null);
                  }}
                  placeholder="Repeat the new password"
                  className="bg-[#111D30] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] placeholder:text-[#71809A] rounded-xl h-11"
                />
              </div>

              {passwordError && (
                <p className="text-xs text-[#F87171]" role="alert">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-xs text-[#34D399]" role="status">
                  Password updated. Use your new password on your next login.
                </p>
              )}

              <Button
                type="submit"
                disabled={passwordLoading}
                size="sm"
                className="rounded-xl bg-[#4F5AE8] text-white font-semibold hover:bg-[#3E48C4]"
              >
                {passwordLoading ? "Updating password…" : "Update password"}
              </Button>
            </form>
          </Section>

        </div>
      </PageFrame>
    </AppShell>
  );
}
