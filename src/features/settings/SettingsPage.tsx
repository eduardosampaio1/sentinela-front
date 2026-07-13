import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { PageHeader } from "@/shared/layout/PageHeader";
import { ConfirmDialog } from "@/shared/feedback/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { getAuthClient } from "@/lib/auth/index";
import { cn } from "@/lib/utils";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
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

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "—";

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
    if (newPassword !== confirmNewPassword) { setPasswordError("Passwords do not match."); return; }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <AppShell topBarTitle="Settings">
      <PageFrame maxWidth="lg">
        <PageHeader title="Settings" description="Manage your account and preferences." />

        <div className="space-y-6">
          {/* Profile */}
          <Section title="Profile" description="Your account information.">
            <div className="space-y-4">
              <div>
                <Label className="text-sm text-[#94A3B8]">Full name</Label>
                <p className="text-sm text-[#F1F5F9] mt-1">{displayName}</p>
              </div>
              <div>
                <Label className="text-sm text-[#94A3B8]">Email</Label>
                <p className="text-sm text-[#F1F5F9] mt-1">{user?.email ?? "—"}</p>
              </div>
              <div>
                <Label className="text-sm text-[#94A3B8]">User ID</Label>
                <p className="text-xs font-mono text-[#475569] mt-1">{user?.id ?? "—"}</p>
              </div>
            </div>
          </Section>

          {/* Security */}
          <Section title="Security" description="Change your password or manage sessions.">
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-sm text-[#94A3B8]">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="bg-[#111D30] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmNewPassword" className="text-sm text-[#94A3B8]">Confirm new password</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="bg-[#111D30] border-[rgba(255,255,255,0.08)] text-[#F1F5F9] rounded-xl"
                />
              </div>

              {passwordError && <p className="text-xs text-[#F87171]">{passwordError}</p>}
              {passwordSuccess && <p className="text-xs text-[#34D399]">Password updated successfully.</p>}

              <Button type="submit" disabled={passwordLoading} size="sm" className="rounded-xl bg-[#22D3EE] text-[#070C18] font-semibold hover:bg-[#06B6D4]">
                {passwordLoading ? "Updating..." : "Update password"}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-[rgba(255,255,255,0.05)]">
              <Button onClick={handleSignOut} variant="ghost" size="sm" className="rounded-xl text-[#94A3B8] hover:text-[#94A3B8] hover:bg-[rgba(255,255,255,0.04)]">
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15M12 9l3 3m0 0-3 3m3-3H2.25" />
                </svg>
                Sign out
              </Button>
            </div>
          </Section>

          {/* Danger zone */}
          <Section title="Danger zone">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#F87171]">Delete account</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-xl border border-[rgba(248,113,113,0.2)] text-[#F87171] hover:bg-[rgba(248,113,113,0.08)] flex-shrink-0"
              >
                Delete account
              </Button>
            </div>
          </Section>
        </div>

        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete your account?"
          description="This is permanent and irreversible. All your workspaces, analyses, and data will be deleted immediately. You cannot undo this action."
          confirmLabel="Delete my account permanently"
          variant="destructive"
          onConfirm={async () => {
            // Account deletion requires backend support
            window.alert("Account deletion requires contacting support. Please email support@sentinela.ai");
            setShowDeleteConfirm(false);
          }}
        />
      </PageFrame>
    </AppShell>
  );
}
