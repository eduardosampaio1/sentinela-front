import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearE2EInjection,
  createE2EAuthClient,
  isE2EBypassActive,
  readE2EInjection,
  setE2EInjection,
  type E2EInjection,
} from "@/lib/auth/e2eBridge";

const INJECTION: E2EInjection = {
  session: {
    accessToken: "tok-e2e",
    user: { id: "u-e2e", email: "e2e@test", created_at: "2020-01-01T00:00:00Z" },
  },
  workspace: {
    id: "ws-e2e",
    name: "WS",
    slug: "ws",
    owner_user_id: "u-e2e",
    created_at: "2020-01-01T00:00:00Z",
    updated_at: null,
    deleted_at: null,
  },
};

afterEach(() => {
  clearE2EInjection();
  vi.restoreAllMocks();
});

describe("bypass de auth E2E — fail-closed e local", () => {
  it("sem injeção, tudo é inerte (não há bypass por padrão)", () => {
    expect(readE2EInjection()).toBeNull();
    expect(isE2EBypassActive()).toBe(false);
  });

  it("injeção inválida (sem token/workspace) é rejeitada", () => {
    (globalThis as Record<string, unknown>).__SENTINELA_E2E_BYPASS__ = { session: {}, workspace: {} };
    expect(readE2EInjection()).toBeNull();
    clearE2EInjection();
  });

  it("setE2EInjection habilita leitura; clear volta ao estado inerte", () => {
    setE2EInjection(INJECTION);
    expect(readE2EInjection()).toEqual(INJECTION);
    expect(isE2EBypassActive()).toBe(true);
    clearE2EInjection();
    expect(readE2EInjection()).toBeNull();
  });

  it("cliente E2E é 100% local: getSession/getAccessToken da injeção, sem backend", async () => {
    const client = createE2EAuthClient(INJECTION.session);
    // Era "supabase": rótulo inerte da sessão injetada. A M02 reduziu a união a um provider.
    expect(client.provider).toBe("keycloak");
    expect(await client.getSession()).toEqual(INJECTION.session);
    expect(await client.getAccessToken()).toBe("tok-e2e");
    expect(client.supportsPasswordForms()).toBe(true);
    expect(client.accountManagementUrl()).toBeNull();
    // telas de login são no-op (já autenticado)
    await expect(client.startLogin()).resolves.toBeUndefined();
  });

  it("signOut zera a sessão, notifica listeners com null e limpa a injeção", async () => {
    setE2EInjection(INJECTION);
    const client = createE2EAuthClient(INJECTION.session);
    const seen: (unknown)[] = [];
    const unsub = client.onAuthStateChange((s) => seen.push(s));

    await client.signOut();

    expect(await client.getSession()).toBeNull();
    expect(seen).toContain(null); // destrava o fluxo de logout no AuthContext
    expect(readE2EInjection()).toBeNull(); // injeção removida
    unsub();
  });

  it("gate morto em produção: sob MODE=production o helper não injeta", () => {
    // Em produção o Vite baka import.meta.env.DEV=false e o ramo é eliminado; aqui provamos
    // que setE2EInjection é inerte quando DEV é falso (defesa em profundidade do runtime).
    vi.stubEnv("DEV", false);
    setE2EInjection(INJECTION);
    expect(readE2EInjection()).toBeNull();
    vi.unstubAllEnvs();
  });
});
