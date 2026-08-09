// M01 — a CADEIA KEYCLOAK, provada antes de qualquer remoção.
//
// ## Por que esta prova vem ANTES da M02
//
// `/login`, `/forgot-password` e `/auth/callback` são caminho de autenticação **real**. Remover o
// equivalente Supabase sem provar o substituto tira o acesso de quem entra por ali — e o defeito
// só apareceria em produção, para quem não consegue entrar para reclamar.
//
// A ordem é lei da decisão 5 do owner: **provar, depois remover**.
//
// ## O que "sem Supabase no caminho" significa aqui
//
// Duas coisas diferentes, e esta suíte separa as duas:
//
//   • **fluxo** — com o provider `keycloak`, nenhuma função do Supabase é CHAMADA. É o que os
//     casos abaixo provam, com espião que registra qualquer acesso.
//   • **módulo** — `lib/auth/index.ts` e as três páginas ainda IMPORTAM `@/lib/supabase`
//     estaticamente, então o módulo continua sendo avaliado no carregamento. Isso **não** é
//     corrigido aqui: remover import é a M02, e esta missão não antecipa. Fica registrado como
//     pré-condição, não como suposição.

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient, AuthSession } from "./types";

// ── espião do Supabase ────────────────────────────────────────────────────────────────────
// Qualquer leitura de propriedade em `supabase.auth` é registrada. Não basta espiar as funções
// que hoje são chamadas: uma chamada NOVA em outro método passaria despercebida.
const acessosAoSupabase: string[] = [];

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: new Proxy(
      {},
      {
        get(_alvo, prop) {
          acessosAoSupabase.push(String(prop));
          return () => {
            throw new Error(
              `Supabase foi chamado no caminho do Keycloak: auth.${String(prop)}()`,
            );
          };
        },
      },
    ),
  },
}));

// ── cliente Keycloak de teste ─────────────────────────────────────────────────────────────
const chamadas: string[] = [];
const SESSAO: AuthSession = {
  accessToken: "tok",
  user: { id: "u-1", email: "quem@exemplo.test" },
};

function clienteKeycloak(overrides: Partial<AuthClient> = {}): AuthClient {
  return {
    provider: "keycloak",
    getSession: async () => null,
    getAccessToken: async () => null,
    onAuthStateChange: () => () => {},
    signOut: async () => {},
    startLogin: async (next) => {
      chamadas.push(`startLogin:${next ?? ""}`);
    },
    startRegister: async (next) => {
      chamadas.push(`startRegister:${next ?? ""}`);
    },
    startPasswordReset: async () => {
      chamadas.push("startPasswordReset");
    },
    completeLoginCallback: async () => {
      chamadas.push("completeLoginCallback");
      return SESSAO;
    },
    accountManagementUrl: () => "https://idp.test/account",
    // O discriminador que protege os três fluxos: sob Keycloak a SPA NUNCA coleta senha.
    supportsPasswordForms: () => false,
    ...overrides,
  };
}

let clienteAtual: AuthClient = clienteKeycloak();
// `./types` só tem tipos — espalhá-lo aqui devolvia `undefined` para todo o resto do módulo, e
// os componentes quebravam antes de chegar na asserção. O único símbolo de runtime que as três
// páginas importam daqui é `getAuthClient`.
vi.mock("@/lib/auth/index", () => ({ getAuthClient: () => clienteAtual }));

beforeEach(() => {
  acessosAoSupabase.length = 0;
  chamadas.length = 0;
  clienteAtual = clienteKeycloak();
});

describe("M01 · o instrumento antes da acusação", () => {
  it("o espião do Supabase registra qualquer acesso, não só os métodos conhecidos", async () => {
    const { supabase } = await import("@/lib/supabase");
    expect(() => (supabase.auth as unknown as Record<string, () => void>).metodoQueNaoExiste()).toThrow(
      /Supabase foi chamado/,
    );
    expect(acessosAoSupabase).toContain("metodoQueNaoExiste");
    acessosAoSupabase.length = 0;
  });
});

describe("M01 · LOGIN — a SPA nunca coleta senha; o provedor assume no clique", () => {
  // 🔎 **Corrigido durante a M01.** A primeira versão destes casos esperava redirect AO MONTAR, e
  // falhou. A leitura errada era minha: sob Keycloak a tela de entrada é **híbrida** — ela vive na
  // SPA com os botões sociais (`kc_idp_hint`) e o "Continue with email", e só a SENHA é digitada
  // na página do Keycloak. Isso não contraria D19, que trata de credencial, e é o comportamento
  // certo: o usuário escolhe o caminho antes de sair da aplicação.
  it("sob Keycloak, NENHUM campo de senha existe na SPA", async () => {
    const { LoginPage } = await import("@/features/auth/LoginPage");
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it("o caminho por e-mail delega ao provedor, com o destino preservado", async () => {
    const user = userEvent.setup();
    const { LoginPage } = await import("@/features/auth/LoginPage");
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /continue with email/i }));
    // `/home` é o destino padrão: entrar não pode perder para onde a pessoa ia.
    await waitFor(() => expect(chamadas).toContain("startLogin:/home"));
  });

  it("o caminho social delega ao provedor com `idpHint`", async () => {
    const user = userEvent.setup();
    clienteAtual = clienteKeycloak({
      startLogin: async (next, opts) => {
        chamadas.push(`startLogin:${next ?? ""}:${opts?.idpHint ?? "-"}`);
      },
    });
    const { LoginPage } = await import("@/features/auth/LoginPage");
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /google/i }));
    await waitFor(() => expect(chamadas).toContain("startLogin:/home:google"));
  });

  it("NENHUMA função do Supabase é tocada em nenhum dos dois caminhos", async () => {
    const user = userEvent.setup();
    const { LoginPage } = await import("@/features/auth/LoginPage");
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /continue with email/i }));
    await waitFor(() => expect(chamadas.length).toBeGreaterThan(0));
    expect(acessosAoSupabase, "o caminho do Keycloak tocou o Supabase").toEqual([]);
  });
});

describe("M01 · RECUPERAÇÃO — delegada ao provedor (D19)", () => {
  it("sob Keycloak, a página de recuperação redireciona em vez de pedir e-mail", async () => {
    const { ForgotPasswordPage } = await import("@/features/auth/ForgotPasswordPage");
    render(
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <ForgotPasswordPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(chamadas).toContain("startPasswordReset"));
    // A SPA não reproduz formulário de identidade — D19 manda delegar ao provedor canônico.
    expect(document.querySelector('input[type="email"]')).toBeNull();
    expect(acessosAoSupabase).toEqual([]);
  });
});

describe("M01 · CALLBACK — a sessão nasce do provedor", () => {
  it("o callback conclui pelo cliente canônico, sem Supabase", async () => {
    const { default: AuthCallbackPage } = await import("@/pages/AuthCallbackPage");
    render(
      <MemoryRouter initialEntries={["/auth/callback"]}>
        <AuthCallbackPage />
      </MemoryRouter>,
    );
    await waitFor(() => expect(chamadas).toContain("completeLoginCallback"));
    expect(acessosAoSupabase).toEqual([]);
  });
});

describe("M01 · o discriminador que sustenta os três fluxos", () => {
  it("`supportsPasswordForms() === false` é o que desvia os três caminhos", async () => {
    // Prova de que o desvio não é coincidência de renderização: com o mesmo cliente devolvendo
    // `true`, a página volta a montar o formulário — e é por isso que a flag é a fronteira.
    clienteAtual = clienteKeycloak({ supportsPasswordForms: () => true });
    const { LoginPage } = await import("@/features/auth/LoginPage");
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    await waitFor(() =>
      expect(document.querySelector('input[type="password"]')).not.toBeNull(),
    );
  });
});
