import { describe, expect, it, vi } from "vitest";
import { resolveProvider } from "./resolveProvider";
import { createKeycloakAuthClient } from "./keycloakAuthClient";

describe("resolveProvider (flag-gated, fail-closed)", () => {
  it("default é supabase quando ausente/vazio", () => {
    expect(resolveProvider(undefined)).toBe("supabase");
    expect(resolveProvider("")).toBe("supabase");
    expect(resolveProvider("   ")).toBe("supabase");
    expect(resolveProvider("supabase")).toBe("supabase");
  });

  it("keycloak quando setado (case-insensitive)", () => {
    expect(resolveProvider("keycloak")).toBe("keycloak");
    expect(resolveProvider("KEYCLOAK")).toBe("keycloak");
  });

  it("valor desconhecido lança (fail-closed, não cai em supabase silenciosamente)", () => {
    expect(() => resolveProvider("auth0")).toThrow();
  });
});

function fakeUserManager(user: unknown) {
  return {
    getUser: vi.fn(async () => user),
    signinRedirect: vi.fn(async () => undefined),
    signinRedirectCallback: vi.fn(async () => user),
    signoutRedirect: vi.fn(async () => undefined),
    events: {
      addUserLoaded: vi.fn(),
      removeUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
    },
  };
}

const ISSUER = "http://localhost:8081/realms/sentinela";

describe("keycloakAuthClient (mapeamento oidc User -> AuthSession)", () => {
  it("getSession mapeia sub/email/token de um usuário válido", async () => {
    const um = fakeUserManager({
      access_token: "tok-abc",
      expired: false,
      profile: { sub: "kc-sub-1", email: "user@x.com" },
    });
    const client = createKeycloakAuthClient({ userManager: um as never, issuer: ISSUER });
    const session = await client.getSession();
    expect(session?.accessToken).toBe("tok-abc");
    expect(session?.user.id).toBe("kc-sub-1");
    expect(session?.user.email).toBe("user@x.com");
  });

  it("getSession retorna null se usuário ausente ou token expirado", async () => {
    expect(await createKeycloakAuthClient({ userManager: fakeUserManager(null) as never, issuer: ISSUER }).getSession()).toBeNull();
    const expired = fakeUserManager({ access_token: "t", expired: true, profile: { sub: "s" } });
    expect(await createKeycloakAuthClient({ userManager: expired as never, issuer: ISSUER }).getSession()).toBeNull();
  });

  it("getAccessToken devolve o token da sessão (ou null)", async () => {
    const um = fakeUserManager({ access_token: "tok-xyz", expired: false, profile: { sub: "s", email: null } });
    expect(await createKeycloakAuthClient({ userManager: um as never, issuer: ISSUER }).getAccessToken()).toBe("tok-xyz");
  });

  it("metadados do provider: redirect (sem forms de senha) + Account Console", () => {
    const client = createKeycloakAuthClient({ userManager: fakeUserManager(null) as never, issuer: ISSUER });
    expect(client.provider).toBe("keycloak");
    expect(client.supportsPasswordForms()).toBe(false);
    expect(client.accountManagementUrl()).toBe(`${ISSUER}/account`);
  });

  it("startLogin dispara signinRedirect com o next no state", async () => {
    const um = fakeUserManager(null);
    await createKeycloakAuthClient({ userManager: um as never, issuer: ISSUER }).startLogin("/home");
    expect(um.signinRedirect).toHaveBeenCalledWith({ state: { next: "/home" } });
  });

  it("startLogin com idpHint passa kc_idp_hint (login social direto no IdP)", async () => {
    const um = fakeUserManager(null);
    await createKeycloakAuthClient({ userManager: um as never, issuer: ISSUER }).startLogin(
      "/home",
      { idpHint: "google" },
    );
    expect(um.signinRedirect).toHaveBeenCalledWith({
      state: { next: "/home" },
      extraQueryParams: { kc_idp_hint: "google" },
    });
  });

  it("completeLoginCallback mapeia o usuário retornado", async () => {
    const um = fakeUserManager({ access_token: "cb-tok", expired: false, profile: { sub: "cb-sub", email: "cb@x.com" } });
    const session = await createKeycloakAuthClient({ userManager: um as never, issuer: ISSUER }).completeLoginCallback();
    expect(um.signinRedirectCallback).toHaveBeenCalled();
    expect(session?.accessToken).toBe("cb-tok");
    expect(session?.user.id).toBe("cb-sub");
    expect(session?.user.email).toBe("cb@x.com");
  });
});
