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

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
// As três superfícies de entrada passaram a ler o idioma do dicionário em vez de carregar a
// frase cravada. No app o provider monta acima do router, então nenhuma delas pode ficar sem
// ele; aqui o harness precisa dizer o mesmo, ou o teste mede uma árvore que não existe.
import { LanguageProvider } from "@/contexts/LanguageContext";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient, AuthSession } from "./types";

// ── o espião virou gate estático (M02) ────────────────────────────────────────────────────
// Na M01 este arquivo mockava `@/lib/supabase` e registrava qualquer acesso. O módulo não existe
// mais: a M02 o removeu. Espionar um módulo inexistente seria teatro — o que resta a provar é que
// ele **não volta**, e isso é verificação de código-fonte, feita no fim deste arquivo.

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
  chamadas.length = 0;
  clienteAtual = clienteKeycloak();
});

describe("M01 · o instrumento antes da acusação", () => {
  it("o módulo do Supabase não existe mais", () => {
    // Verificação de ARQUIVO, não `import()`: importar um módulo inexistente não compila, e o
    // teste não passaria do `tsc` para chegar a falhar em runtime.
    expect(existsSync(resolve(__dirname, "../supabase.ts"))).toBe(false);
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
      <LanguageProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </LanguageProvider>,
    );
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it("o caminho por e-mail delega ao provedor, com o destino preservado", async () => {
    const user = userEvent.setup();
    const { LoginPage } = await import("@/features/auth/LoginPage");
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </LanguageProvider>,
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
      <LanguageProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </LanguageProvider>,
    );
    await user.click(screen.getByRole("button", { name: /google/i }));
    await waitFor(() => expect(chamadas).toContain("startLogin:/home:google"));
  });

  it("NENHUMA função do Supabase é tocada em nenhum dos dois caminhos", async () => {
    const user = userEvent.setup();
    const { LoginPage } = await import("@/features/auth/LoginPage");
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </LanguageProvider>,
    );
    await user.click(screen.getByRole("button", { name: /continue with email/i }));
    await waitFor(() => expect(chamadas.length).toBeGreaterThan(0));
  });
});

describe("M01 · RECUPERAÇÃO — delegada ao provedor (D19)", () => {
  it("sob Keycloak, a página de recuperação redireciona em vez de pedir e-mail", async () => {
    const { ForgotPasswordPage } = await import("@/features/auth/ForgotPasswordPage");
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/forgot-password"]}>
          <ForgotPasswordPage />
        </MemoryRouter>
      </LanguageProvider>,
    );
    await waitFor(() => expect(chamadas).toContain("startPasswordReset"));
    // A SPA não reproduz formulário de identidade — D19 manda delegar ao provedor canônico.
    expect(document.querySelector('input[type="email"]')).toBeNull();
  });
});

describe("M01 · CALLBACK — a sessão nasce do provedor", () => {
  it("o callback conclui pelo cliente canônico, sem Supabase", async () => {
    const { default: AuthCallbackPage } = await import("@/pages/AuthCallbackPage");
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/auth/callback"]}>
          <AuthCallbackPage />
        </MemoryRouter>
      </LanguageProvider>,
    );
    await waitFor(() => expect(chamadas).toContain("completeLoginCallback"));
  });
});

describe("M01/M02 · a SPA não tem mais formulário de senha para reaparecer", () => {
  it("nem com `supportsPasswordForms() === true` o formulário volta", async () => {
    // Na M01 este caso provava que a flag DESVIAVA o caminho: com `true`, o formulário do Supabase
    // montava. A M02 removeu o formulário, então a garantia ficou mais forte — não há mais o que
    // desviar. A flag continua existindo porque Profile/Settings a leem para mandar credencial ao
    // Account Console.
    clienteAtual = clienteKeycloak({ supportsPasswordForms: () => true });
    const { LoginPage } = await import("@/features/auth/LoginPage");
    render(
      <LanguageProvider>
        <MemoryRouter initialEntries={["/login"]}>
          <LoginPage />
        </MemoryRouter>
      </LanguageProvider>,
    );
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// M02 — o Supabase não volta ao caminho de Auth
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M02 · erradicação do Supabase Auth", () => {
  const SRC = resolve(__dirname, "../..");
  const arquivos: string[] = [];
  const varrer = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = resolve(d, e);
      if (statSync(p).isDirectory()) varrer(p);
      else if ([".ts", ".tsx"].includes(extname(p))) arquivos.push(p);
    }
  };
  varrer(SRC);
  // Comentário FORA da varredura: os arquivos que a M02 limpou explicam, em comentário, o que
  // foi removido — e citam `supabase.auth` ao fazê-lo. Contar comentário faria a documentação da
  // erradicação ser acusada de reintroduzi-la, e a saída que todo mundo escolhe é parar de
  // documentar. Mesma distinção que o gate de fronteira da M04 já precisou fazer.
  const semComentarios = (t: string) =>
    t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const conteudo = arquivos.map((a) => ({ a, t: semComentarios(readFileSync(a, "utf-8")) }));
  // Exclusões estreitas, e cada uma por um motivo: os três arquivos CITAM o nome do módulo para
  // testar a própria detecção. Contá-los faria o gate acusar quem o protege.
  const semEsteArquivo = conteudo.filter((c) => !/keycloak-cadeia|authClient\.test|canonical-boundary\.test/.test(c.a));

  it("nenhum arquivo importa Supabase", () => {
    const infratores = semEsteArquivo
      .filter((c) => /from ["'][^"']*supabase[^"']*["']|@supabase\//.test(c.t))
      .map((c) => relative(SRC, c.a).split("\\").join("/"));
    expect(infratores, "import de Supabase reintroduzido no front").toEqual([]);
  });

  it("nenhum arquivo chama `supabase.auth`", () => {
    const infratores = semEsteArquivo
      // `String.raw` e nao literal de regex: a primeira versao trazia `` dentro do literal, e
      // isso o gravou como o caractere BACKSPACE. O regex passou a procurar `<BS>supabase...<BS>`,
      // que nunca existe, e a mutacao sobreviveu. Quem acusou foi o `no-control-regex` do lint,
      // nao a suite -- e e a terceira vez que este mesmo erro aparece no programa.
      .filter((c) => new RegExp(String.raw`\bsupabase\s*\.\s*auth\b`).test(c.t))
      .map((c) => relative(SRC, c.a).split("\\").join("/"));
    expect(infratores).toEqual([]);
  });

  it("o pacote saiu do package.json", () => {
    const pkg = JSON.parse(readFileSync(resolve(SRC, "../package.json"), "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })).not.toContain(
      "@supabase/supabase-js",
    );
  });

  it("Keycloak é o único provider efetivo", async () => {
    const { resolveProvider } = await import("./resolveProvider");
    expect(resolveProvider(undefined)).toBe("keycloak");
    expect(resolveProvider("keycloak")).toBe("keycloak");
    // Configuração antiga falha ALTO, com mensagem própria — não cai em silêncio.
    expect(() => resolveProvider("supabase")).toThrow(/não existe mais/);
  });
});
