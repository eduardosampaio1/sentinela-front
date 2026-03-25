import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import Login from "@/pages/Login";
import AuthCallbackPage from "@/pages/AuthCallbackPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";

const signInWithPasswordMock = vi.fn();
const signUpMock = vi.fn();
const signInWithOAuthMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const exchangeCodeForSessionMock = vi.fn();
const setSessionMock = vi.fn();
const getSessionMock = vi.fn();
const verifyOtpMock = vi.fn();
const resendMock = vi.fn();
const updateUserMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: (...args: unknown[]) => signInWithPasswordMock(...args),
      signUp: (...args: unknown[]) => signUpMock(...args),
      signInWithOAuth: (...args: unknown[]) => signInWithOAuthMock(...args),
      resetPasswordForEmail: (...args: unknown[]) => resetPasswordForEmailMock(...args),
      exchangeCodeForSession: (...args: unknown[]) => exchangeCodeForSessionMock(...args),
      setSession: (...args: unknown[]) => setSessionMock(...args),
      getSession: (...args: unknown[]) => getSessionMock(...args),
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
      resend: (...args: unknown[]) => resendMock(...args),
      updateUser: (...args: unknown[]) => updateUserMock(...args),
      signOut: (...args: unknown[]) => signOutMock(...args),
    },
  },
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}));

describe("auth flows", () => {
  beforeEach(() => {
    vi.useRealTimers();
    signInWithPasswordMock.mockReset().mockResolvedValue({ error: null });
    signUpMock.mockReset().mockResolvedValue({ data: { session: null }, error: null });
    signInWithOAuthMock.mockReset().mockResolvedValue({ error: null });
    resetPasswordForEmailMock.mockReset().mockResolvedValue({ error: null });
    exchangeCodeForSessionMock.mockReset().mockResolvedValue({ error: null });
    setSessionMock.mockReset().mockResolvedValue({ error: null });
    getSessionMock.mockReset().mockResolvedValue({ data: { session: null } });
    verifyOtpMock.mockReset().mockResolvedValue({ error: null });
    resendMock.mockReset().mockResolvedValue({ error: null });
    updateUserMock.mockReset().mockResolvedValue({ error: null });
    signOutMock.mockReset().mockResolvedValue({ error: null });
  });

  it("requests password reset with the frontend reset URL", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "security@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Forgot your password?" }));

    await waitFor(() =>
      expect(resetPasswordForEmailMock).toHaveBeenCalledWith(
        "security@example.com",
        expect.objectContaining({
          redirectTo: expect.stringMatching(/\/auth\/reset-password$/),
        }),
      ),
    );

    expect(
      screen.getByText("Password reset e-mail sent. Check your inbox for the recovery link or code."),
    ).toBeInTheDocument();
  });

  it("completes the auth callback and redirects to the requested path", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/callback?code=test-code&next=/dashboard"]}>
        <Routes>
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/dashboard" element={<div>dashboard target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => expect(exchangeCodeForSessionMock).toHaveBeenCalled());
    expect(await screen.findByText("dashboard target", {}, { timeout: 2000 })).toBeInTheDocument();
  }, 7000);

  it("verifies recovery code and updates the password", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/reset-password"]}>
        <Routes>
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>login target</div>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Account e-mail"), {
      target: { value: "security@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Recovery code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Use recovery code" }));

    await waitFor(() =>
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: "security@example.com",
        token: "123456",
        type: "recovery",
      }),
    );

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "Sentinela!Reset12345" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Sentinela!Reset12345" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Update password" }).closest("form")!);

    await waitFor(() =>
      expect(updateUserMock).toHaveBeenCalledWith({
        password: "Sentinela!Reset12345",
      }),
    );
    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
  });

  it("resends verification e-mail through the auth callback route", async () => {
    render(
      <MemoryRouter initialEntries={["/auth/verify-email?email=security@example.com"]}>
        <Routes>
          <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Send new verification e-mail" }));

    await waitFor(() =>
      expect(resendMock).toHaveBeenCalledWith({
        type: "signup",
        email: "security@example.com",
        options: expect.objectContaining({
          emailRedirectTo: expect.stringMatching(/\/auth\/callback(\?|$)/),
        }),
      }),
    );

    expect(
      screen.getByText("Verification e-mail sent. Use the new link or code from the inbox."),
    ).toBeInTheDocument();
  });
});
