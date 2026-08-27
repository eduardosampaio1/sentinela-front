// O token expirado tem uma segunda chance, e ela é deduplicada.
//
// ## O incidente
//
// Medido em homologação em 2026-08-25: um upload de 100 MB foi ABORTADO aos 121 segundos.
// `performance.getEntriesByType` registrou `responseStatus: 0` e `transferSize: 0` — requisição
// cancelada, não resposta HTTP. Nada chegou ao storage.
//
// A cadeia: o token venceu durante o upload → o polling do status pediu token → `getUser()`
// devolveu um usuário `expired` → `getAccessToken` devolveu `null` → o cliente `/v1` levantou
// `authentication_required` sem tocar a rede → o app navegou para `/session-expired` → a
// navegação matou o upload em voo.
//
// O `refresh_token` estava no `localStorage`, intacto, sem ter sido usado.

import { describe, expect, it, vi } from "vitest";

import { createKeycloakAuthClient } from "./keycloakAuthClient";

function usuario(over: Partial<{ expired: boolean; access_token: string; expires_at: number }> = {}) {
  return {
    access_token: over.access_token ?? "tok-valido",
    expired: over.expired ?? false,
    expires_at: over.expires_at,
    profile: { sub: "u-1", email: "u@x", name: "U" },
  };
}

function gerente(over: Partial<Record<string, unknown>> = {}) {
  const base = {
    getUser: vi.fn(async () => usuario()),
    signinSilent: vi.fn(async () => usuario()),
    signinRedirect: vi.fn(),
    signinRedirectCallback: vi.fn(),
    signoutRedirect: vi.fn(),
    events: {
      addUserLoaded: vi.fn(),
      removeUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
    },
  };
  return { ...base, ...over };
}

describe("keycloakAuthClient · renovação sob demanda", () => {
  it("token válido NÃO dispara renovação", async () => {
    // A renovação é o caminho de exceção. Chamá-la sempre gastaria um round-trip ao IdP em toda
    // requisição — e um upload longo faz dezenas.
    const gm = gerente();
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    expect(await cliente.getAccessToken()).toBe("tok-valido");
    expect(gm.signinSilent).not.toHaveBeenCalled();
  });

  it("token perto de expirar renova antes do upload bater no limite", async () => {
    // Upload grande não pode esperar a expiração acontecer: quando ela acontece, algum GET
    // acessório pode navegar para /session-expired e matar a requisição em voo.
    const agoraS = Math.floor(Date.now() / 1000);
    const gm = gerente({
      getUser: vi.fn(async () => usuario({ expires_at: agoraS + 30 })),
      signinSilent: vi.fn(async () => usuario({ access_token: "tok-renovado", expires_at: agoraS + 3600 })),
    });
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    expect(await cliente.getAccessToken()).toBe("tok-renovado");
    expect(gm.signinSilent).toHaveBeenCalledTimes(1);
  });

  it("se a renovação antecipada oscila, usa o token ainda válido e tenta de novo depois", async () => {
    // Este é o caso que evita expulsar o usuário durante arquivos longos: IdP indisponível por
    // instantes, mas o access token atual ainda serve para a próxima parte do multipart.
    const agoraS = Math.floor(Date.now() / 1000);
    const gm = gerente({
      getUser: vi.fn(async () => usuario({ access_token: "tok-ainda-valido", expires_at: agoraS + 30 })),
      signinSilent: vi.fn(async () => {
        throw new Error("keycloak oscilou");
      }),
    });
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    expect(await cliente.getAccessToken()).toBe("tok-ainda-valido");
    expect(gm.signinSilent).toHaveBeenCalledTimes(1);
  });

  it("token expirado renova em vez de devolver null", async () => {
    // O caso do incidente. Antes, `expired: true` virava `null` e o cliente `/v1` levantava
    // `authentication_required` SEM TOCAR A REDE — com o refresh token intacto no store.
    const gm = gerente({
      getUser: vi.fn(async () => usuario({ expired: true })),
      signinSilent: vi.fn(async () => usuario({ access_token: "tok-renovado" })),
    });
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    expect(await cliente.getAccessToken()).toBe("tok-renovado");
    expect(gm.signinSilent).toHaveBeenCalledTimes(1);
  });

  it("pedidos CONCORRENTES compartilham uma única renovação", async () => {
    // O caso que a deduplicação existe para proteger, e ele é o cenário REAL: enquanto um upload
    // longo está em voo, o polling do status continua pedindo token.
    //
    // Sem dedupe, cada pedido dispararia seu próprio `signinSilent`, e vários resgates
    // concorrentes do mesmo refresh token fazem o Keycloak invalidar a sessão quando a rotação
    // está ligada — trocando uma expiração recuperável por um logout.
    let resolver: (v: unknown) => void = () => {};
    const emCurso = new Promise((r) => {
      resolver = r;
    });
    const gm = gerente({
      getUser: vi.fn(async () => usuario({ expired: true })),
      signinSilent: vi.fn(async () => {
        await emCurso;
        return usuario({ access_token: "tok-renovado" });
      }),
    });
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    const pedidos = [cliente.getAccessToken(), cliente.getAccessToken(), cliente.getAccessToken()];
    resolver(null);
    const tokens = await Promise.all(pedidos);

    expect(tokens).toEqual(["tok-renovado", "tok-renovado", "tok-renovado"]);
    expect(gm.signinSilent).toHaveBeenCalledTimes(1);
  });

  it("uma expiração POSTERIOR tenta de novo", async () => {
    // A promise compartilhada é liberada no `finally`. Guardá-la resolvida faria a segunda
    // expiração — horas depois — reusar o resultado da primeira, e a sessão morreria por um
    // cache que ninguém pediu.
    const gm = gerente({
      getUser: vi.fn(async () => usuario({ expired: true })),
      signinSilent: vi.fn(async () => usuario({ access_token: "tok-renovado" })),
    });
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    await cliente.getAccessToken();
    await cliente.getAccessToken();

    expect(gm.signinSilent).toHaveBeenCalledTimes(2);
  });

  it("renovação que FALHA devolve null, e não explode", async () => {
    // Refresh token expirado, revogado, ou IdP fora do ar. Devolver `null` preserva o
    // comportamento anterior: quem chama trata como sessão ausente e a pessoa faz login de novo.
    //
    // Propagar a exceção seria pior — ela subiria por dentro de `getAccessToken`, que é chamado
    // no caminho de TODA requisição, e viraria erro de rede em vez de sessão expirada.
    const gm = gerente({
      getUser: vi.fn(async () => usuario({ expired: true })),
      signinSilent: vi.fn(async () => {
        throw new Error("refresh token revogado");
      }),
    });
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    expect(await cliente.getAccessToken()).toBeNull();
  });

  it("depois de uma falha, a próxima expiração tenta de novo", async () => {
    // Uma falha transitória do IdP não pode condenar a sessão para sempre.
    const gm = gerente({
      getUser: vi.fn(async () => usuario({ expired: true })),
      signinSilent: vi
        .fn()
        .mockRejectedValueOnce(new Error("indisponivel"))
        .mockResolvedValueOnce(usuario({ access_token: "tok-renovado" })),
    });
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    expect(await cliente.getAccessToken()).toBeNull();
    expect(await cliente.getAccessToken()).toBe("tok-renovado");
  });

  it("renovação que devolve usuário AINDA expirado não vira token", async () => {
    // `signinSilent` resolver não é o mesmo que a sessão ter voltado. Se o que volta continua
    // vencido, entregá-lo produziria um `Authorization` que o Gateway recusa — e o 401 chegaria
    // como falha de rede em vez de sessão expirada.
    const gm = gerente({
      getUser: vi.fn(async () => usuario({ expired: true })),
      signinSilent: vi.fn(async () => usuario({ expired: true })),
    });
    const cliente = createKeycloakAuthClient({ userManager: gm, issuer: "https://kc.test" });

    expect(await cliente.getAccessToken()).toBeNull();
  });
});
