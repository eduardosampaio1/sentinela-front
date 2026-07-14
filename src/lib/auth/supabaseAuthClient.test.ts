import { describe, expect, it, vi } from "vitest";
import { createSupabaseAuthClient } from "./supabaseAuthClient";

function fakeAuth(session: unknown, unsubscribe = vi.fn()) {
  return {
    getSession: vi.fn(async () => ({ data: { session }, error: null })),
    onAuthStateChange: vi.fn((_cb: unknown) => ({ data: { subscription: { unsubscribe } } })),
    signOut: vi.fn(async () => ({ error: null })),
  };
}

const SESSION = { access_token: "sb-tok", user: { id: "sb-uid", email: "sb@x.com" } };

describe("supabaseAuthClient", () => {
  it("provider/flags: supabase, forms=true, sem account console", () => {
    const c = createSupabaseAuthClient(fakeAuth(null) as never);
    expect(c.provider).toBe("supabase");
    expect(c.supportsPasswordForms()).toBe(true);
    expect(c.accountManagementUrl()).toBeNull();
  });

  it("getSession mapeia sessão do supabase -> AuthSession", async () => {
    const c = createSupabaseAuthClient(fakeAuth(SESSION) as never);
    const session = await c.getSession();
    expect(session?.accessToken).toBe("sb-tok");
    expect(session?.user.id).toBe("sb-uid");
    expect(session?.user.email).toBe("sb@x.com");
  });

  it("getSession null sem sessão; getAccessToken devolve token", async () => {
    expect(await createSupabaseAuthClient(fakeAuth(null) as never).getSession()).toBeNull();
    expect(await createSupabaseAuthClient(fakeAuth(SESSION) as never).getAccessToken()).toBe("sb-tok");
  });

  it("onAuthStateChange assina e devolve unsubscribe", () => {
    const unsub = vi.fn();
    const off = createSupabaseAuthClient(fakeAuth(null, unsub) as never).onAuthStateChange(() => {});
    off();
    expect(unsub).toHaveBeenCalled();
  });

  it("signOut delega ao supabase", async () => {
    const auth = fakeAuth(null);
    await createSupabaseAuthClient(auth as never).signOut();
    expect(auth.signOut).toHaveBeenCalled();
  });

  it("startLogin rejeita (supabase usa formulários, não redirect)", async () => {
    await expect(createSupabaseAuthClient(fakeAuth(null) as never).startLogin()).rejects.toThrow();
  });
});
