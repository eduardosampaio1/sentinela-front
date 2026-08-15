// M25 — o shell canônico: IA, escopo de tenant, papel e conta.
//
// ## O que esta missão consertou, e que estava na tela
//
// O shell imprimia `{workspace.role}` sob o nome do workspace. D3: "não mostrar 'Admin' em badge,
// chip, seletor ou texto". Não era risco — era o estado do produto.
//
// E o que ele chamava de troca de contexto era `navigate("/workspaces")`: mudar de página, não de
// tenant. O seam que descarta o cache do workspace anterior (`onWorkspaceSwitch`) existia, estava
// testado, e **nenhum caminho de produção o alcançava**. Agora o seletor o alcança.
//
// ## Compatibilidade não é navegação canônica
//
// `/dashboard`, `/dashboard/history` e `/dashboard/settings` continuam registradas e resolvendo —
// a M24 as manteve, e 404 em URL que já circulou é defeito silencioso. Mas nenhuma delas é
// destino do shell novo.
//
// ## As 4 combinações
//
// D37 pede `{pt-BR, en} × {light, dark} × {mobile, desktop}`; enquanto P31 não for autorizada o
// eixo de tema tem UM valor, e a matriz é `2 × 1 × 2 = 4`. Mobile e desktop compartilham
// `SidebarContent` por construção — o drawer é o mesmo conteúdo —, então as duas montagens são
// provadas, e o valor único de tema é provado no CSS.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { workspaceKeys } from "@/lib/v1";
import { CanonicalClientProvider } from "@/features/canonical-analysis/data/client";
import { LanguageProvider, type Language } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import en from "@/i18n/en.json";

const RAIZ = resolve(__dirname, "../../..");

/**
 * Remove comentários antes de medir. Dois casos deste arquivo nasceram reprovando pelo texto
 * EXPLICATIVO — "senha" no comentário que cita a D19, `prefers-color-scheme` no comentário que diz
 * por que ele não é usado. Um cadeado que lê a prosa mede a explicação, não o código.
 */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
}

const authMock = vi.fn();
vi.mock("@/contexts/AuthContext", async () => {
  const real = await vi.importActual<typeof import("@/contexts/AuthContext")>(
    "@/contexts/AuthContext",
  );
  return { ...real, useAuth: () => authMock() };
});

const contaUrlMock = vi.fn<() => string | null>();
vi.mock("@/lib/auth", async () => {
  const real = await vi.importActual<Record<string, unknown>>("@/lib/auth");
  return { ...real, getAuthClient: () => ({ accountManagementUrl: () => contaUrlMock() }) };
});

const { SidebarContent, Sidebar } = await import("@/shell/Sidebar");

const WS_A = { id: "ws-a", name: "Alfa", role: "admin" };
const WS_B = { id: "ws-b", name: "Beta", role: "viewer" };

const switchWorkspaceMock = vi.fn<(id: string) => boolean>();

function auth(over: Record<string, unknown> = {}) {
  return {
    user: { email: "a@b.test", user_metadata: { full_name: "Ana Braga" } },
    memberships: [WS_A, WS_B],
    workspace: WS_A,
    switchWorkspace: switchWorkspaceMock,
    signOut: vi.fn().mockResolvedValue(undefined),
    ...over,
  };
}

/**
 * Cliente que RECUSA. Desde a microcorreção da M42 o `WorkspaceSwitcher` lê o nome do produtor
 * (`useNomeDoWorkspace`) e só cai na claim enquanto ele não resolveu — então o shell agora exige
 * `<CanonicalClientProvider>`, que este arquivo não montava. Recusar mantém os casos deste arquivo
 * medindo o que eles sempre mediram (o nome de BOOTSTRAP, "Alfa"), e de quebra exercita o ramo de
 * fallback. Quem prova o ramo do produtor é o browser, onde a composição real existe.
 */
const clienteQueRecusa = {
  getWorkspace: () => Promise.reject(new Error("sem produtor neste teste")),
} as unknown as Parameters<typeof CanonicalClientProvider>[0]["client"];

function montar(
  ui: React.ReactElement,
  { lang = "en" as Language, qc = new QueryClient() } = {},
) {
  window.localStorage.setItem("sentinela:language", lang);
  return {
    qc,
    ...render(
      <QueryClientProvider client={qc}>
        <CanonicalClientProvider client={clienteQueRecusa}>
          <LanguageProvider>
            <MemoryRouter initialEntries={["/home"]}>{ui}</MemoryRouter>
          </LanguageProvider>
        </CanonicalClientProvider>
      </QueryClientProvider>,
    ),
  };
}

beforeEach(() => {
  authMock.mockReset().mockReturnValue(auth());
  switchWorkspaceMock.mockReset().mockReturnValue(true);
  contaUrlMock.mockReset().mockReturnValue("https://idp.test/account");
  window.localStorage.clear();
});
afterEach(() => window.localStorage.clear());

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. IA do shell canônico
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M25 · 1. a IA do shell", () => {
  it("navega para `/home`, `/analyses` e `/workspaces` — e só", () => {
    montar(<SidebarContent />);
    const nav = screen.getByRole("navigation");
    const destinos = within(nav)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(destinos).toEqual(["/home", "/analyses", "/workspaces"]);
  });

  it("NENHUM link do shell aponta para `/dashboard*` — compatibilidade não é IA canônica", () => {
    montar(<SidebarContent />);
    for (const a of screen.getAllByRole("link")) {
      expect(a.getAttribute("href"), "endereço legado promovido a navegação canônica").not.toMatch(
        /^\/dashboard/,
      );
    }
    // E o cadeado no FONTE: um item novo apontando para lá reprova mesmo se não renderizar.
    const fonte = readFileSync(resolve(RAIZ, "src/shell/Sidebar.tsx"), "utf-8");
    const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(semComentarios).not.toMatch(/to:\s*"\/dashboard/);
  });

  it("não inventa rota pública nova — `/settings` não existe no shell", () => {
    montar(<SidebarContent />);
    const hrefs = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain("/settings");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. D3 — o papel governa, não rotula
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M25 · 2. o papel não vira texto", () => {
  it("nem `admin`, nem `viewer`, nem 'Admin' aparecem na tela", () => {
    const { container } = montar(<SidebarContent />);
    const texto = container.textContent ?? "";
    expect(texto).toContain("Alfa"); // o NOME do workspace aparece
    expect(texto, "papel renderizado como texto viola D3").not.toMatch(/admin/i);
    expect(texto).not.toMatch(/viewer/i);
  });

  it("nem depois de abrir a lista de workspaces", async () => {
    const u = userEvent.setup();
    const { container } = montar(<SidebarContent />);
    await u.click(screen.getByRole("button", { name: en.shell.workspace.switch }));
    expect(within(screen.getByRole("listbox")).getByText("Beta")).toBeTruthy();
    expect(container.textContent ?? "").not.toMatch(/admin|viewer/i);
  });

  it("o FONTE do shell não lê `.role` para exibir", () => {
    for (const f of ["src/shell/Sidebar.tsx", "src/shell/WorkspaceSwitcher.tsx"]) {
      const fonte = readFileSync(resolve(RAIZ, f), "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      expect(fonte, `${f} voltou a tocar em role`).not.toMatch(/\.role\b/);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Escopo de tenant e a troca que descarta
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M25 · 3. WorkspaceSwitcher", () => {
  it("o escopo ativo está SEMPRE visível", () => {
    montar(<SidebarContent />);
    expect(screen.getByText(en.shell.workspace.label)).toBeTruthy();
    expect(screen.getByText("Alfa")).toBeTruthy();
  });

  it("sem workspace ativo, o escopo continua visível e diz 'nenhum'", () => {
    authMock.mockReturnValue(auth({ workspace: null, memberships: [] }));
    montar(<SidebarContent />);
    expect(screen.getByText(en.shell.workspace.none)).toBeTruthy();
  });

  it("trocar chama `switchWorkspace` e DESCARTA a raiz do workspace anterior", async () => {
    const u = userEvent.setup();
    const qc = new QueryClient();
    qc.setQueryData(workspaceKeys.status("ws-a", "an-1"), { analysis_id: "an-1" });
    qc.setQueryData(workspaceKeys.status("ws-b", "an-9"), { analysis_id: "an-9" });

    montar(<SidebarContent />, { qc });
    await u.click(screen.getByRole("button", { name: en.shell.workspace.switch }));
    await u.click(screen.getByRole("option", { name: "Beta" }));

    expect(switchWorkspaceMock).toHaveBeenCalledWith("ws-b");
    await waitFor(() =>
      expect(
        qc.getQueryData(workspaceKeys.status("ws-a", "an-1")),
        "o cache do workspace anterior sobreviveu à troca",
      ).toBeUndefined(),
    );
    // O do NOVO permanece: o descarte é da raiz antiga, não do cache inteiro.
    expect(qc.getQueryData(workspaceKeys.status("ws-b", "an-9"))).toBeTruthy();
  });

  it("uma resposta tardia do tenant ANTERIOR não contamina o novo", async () => {
    const u = userEvent.setup();
    const qc = new QueryClient();
    montar(<SidebarContent />, { qc });
    await u.click(screen.getByRole("button", { name: en.shell.workspace.switch }));
    await u.click(screen.getByRole("option", { name: "Beta" }));
    await waitFor(() => expect(switchWorkspaceMock).toHaveBeenCalled());

    // A resposta atrasada do workspace A chega DEPOIS da troca. Ela só pode pousar na chave de
    // A — toda chave começa por `["workspace", id]`, então contaminar B é impossível por
    // construção, e é isso que se prova aqui.
    qc.setQueryData(workspaceKeys.status("ws-a", "an-1"), { analysis_id: "tardio" });
    expect(qc.getQueryData(workspaceKeys.status("ws-b", "an-1"))).toBeUndefined();
  });

  it("`switchWorkspace` recusando (id fora da projeção) NÃO descarta nada", async () => {
    const u = userEvent.setup();
    const qc = new QueryClient();
    qc.setQueryData(workspaceKeys.status("ws-a", "an-1"), { analysis_id: "an-1" });
    switchWorkspaceMock.mockReturnValue(false); // id de storage/URL que não está em `/v1/me`

    montar(<SidebarContent />, { qc });
    await u.click(screen.getByRole("button", { name: en.shell.workspace.switch }));
    await u.click(screen.getByRole("option", { name: "Beta" }));

    // Pedir não é pertencer: a recusa preserva o escopo e o cache atuais.
    expect(qc.getQueryData(workspaceKeys.status("ws-a", "an-1"))).toBeTruthy();
  });

  it("com UM workspace não há botão de troca — lista de um item é CTA que não leva a lugar nenhum", () => {
    authMock.mockReturnValue(auth({ memberships: [WS_A] }));
    montar(<SidebarContent />);
    expect(screen.queryByRole("button", { name: en.shell.workspace.switch })).toBeNull();
    expect(screen.getByText("Alfa")).toBeTruthy();
  });

  it("o switcher usa o seam CANÔNICO — nenhum segundo mecanismo de invalidação", () => {
    const fonte = readFileSync(resolve(RAIZ, "src/shell/WorkspaceSwitcher.tsx"), "utf-8");
    expect(fonte).toContain("onWorkspaceSwitch");
    for (const paralelo of ["invalidateQueries", "resetQueries", "queryClient.clear()"]) {
      expect(fonte, `mecanismo paralelo de invalidação: ${paralelo}`).not.toContain(paralelo);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. WS-01 e WS-02/WS-04 — nada de CTA sem operação
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M25 · 4. sem operação, sem botão", () => {
  it("sem workspace não nasce 'Criar Workspace' nem 'Configurar Workspace'", () => {
    authMock.mockReturnValue(auth({ workspace: null, memberships: [] }));
    const { container } = montar(<SidebarContent />);
    const texto = (container.textContent ?? "").toLowerCase();
    for (const promessa of ["criar workspace", "create workspace", "configurar", "configure"]) {
      expect(texto, `CTA sem owner funcional: ${promessa}`).not.toContain(promessa);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Conta — fora da SPA (D19)
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M25 · 5. menu do usuário", () => {
  it("o link de conta aponta para o provedor, em nova aba e sem opener", async () => {
    const u = userEvent.setup();
    montar(<SidebarContent />);
    await u.click(screen.getByRole("button", { name: en.shell.user.menu }));

    const conta = screen.getByRole("menuitem", { name: en.shell.user.account });
    expect(conta.getAttribute("href")).toBe("https://idp.test/account");
    expect(conta.getAttribute("target")).toBe("_blank");
    expect(conta.getAttribute("rel") ?? "").toContain("noopener");
  });

  it("sem Account Console no provedor, o item NÃO aparece — link morto é pior que ausência", async () => {
    const u = userEvent.setup();
    contaUrlMock.mockReturnValue(null);
    montar(<SidebarContent />);
    await u.click(screen.getByRole("button", { name: en.shell.user.menu }));
    expect(screen.queryByRole("menuitem", { name: en.shell.user.account })).toBeNull();
  });

  it("a SPA não reproduz formulário de credencial", () => {
    // A 1ª versão lia o arquivo BRUTO e reprovou na palavra "senha" — que está no COMENTÁRIO,
    // citando a própria D19 que o componente obedece. O cadeado media a prosa, não o código.
    const codigo = semComentarios(readFileSync(resolve(RAIZ, "src/shell/UserMenu.tsx"), "utf-8"));
    // Controle positivo: sem ele, um erro no strip tornaria o laço abaixo vácuo.
    expect(semComentarios('const a = 1; // senha\n/* senha */')).not.toContain("senha");
    expect(semComentarios('const s = "senha";')).toContain("senha");

    for (const proibido of ["password", "senha", "<form", "<input"]) {
      expect(
        codigo.toLowerCase(),
        `gestão de credencial dentro da SPA: ${proibido}`,
      ).not.toContain(proibido.toLowerCase());
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. As 4 combinações + teclado
// ═══════════════════════════════════════════════════════════════════════════════════════════

const MONTAGENS = [
  ["desktop", () => <Sidebar />],
  ["mobile", () => <SidebarContent onNavClick={() => {}} />],
] as const;
const IDIOMAS = [
  ["en", en],
  ["pt", pt],
] as const;

describe("M25 · 6. as 4 combinações", () => {
  for (const [nomeMontagem, Montagem] of MONTAGENS) {
    for (const [lang, dic] of IDIOMAS) {
      it(`${lang} × ${nomeMontagem}: rótulos traduzidos e escopo visível`, () => {
        const { container } = montar(<Montagem />, { lang: lang as Language });
        const texto = container.textContent ?? "";
        expect(texto).toContain(dic.shell.nav.home);
        expect(texto).toContain(dic.shell.nav.analyses);
        expect(texto).toContain(dic.shell.workspace.label);
        expect(texto).not.toMatch(/admin|viewer/i);
      });
    }
  }

  it("pt e en produzem rótulos DIFERENTES — senão a matriz é decorativa", () => {
    expect(pt.shell.nav.home).not.toBe(en.shell.nav.home);
    expect(pt.shell.nav.analyses).not.toBe(en.shell.nav.analyses);
    expect(pt.shell.workspace.label).not.toBe(en.shell.workspace.label);
  });

  it("o eixo de tema tem UM valor, e ele foi lido da base visual", () => {
    // Mesma correção do caso da credencial: a 1ª versão reprovou em `prefers-color-scheme`
    // porque a expressão está no COMENTÁRIO que explica por que ela NÃO é usada.
    const globals = semComentarios(readFileSync(resolve(RAIZ, "src/styles/globals.css"), "utf-8"));
    const decls = [...globals.matchAll(/color-scheme:\s*([a-z ]+);/g)].map((m) => m[1].trim());
    expect(decls, "`color-scheme` declarado em nenhum ou em mais de um lugar").toEqual(["dark"]);
    // Nada de segundo tema entrando pela porta dos fundos.
    expect(globals).not.toContain("prefers-color-scheme");
    // E a coerência com os tokens: superfície escura, texto claro.
    const tokens = readFileSync(resolve(RAIZ, "src/design/tokens/tokens.css"), "utf-8");
    const lum = (t: string) => Number(tokens.match(new RegExp(`${t}:\\s*[\\d.]+ [\\d.]+% ([\\d.]+)%`))![1]);
    expect(lum("--ds-surface-base")).toBeLessThan(lum("--ds-text-primary"));
  });
});

describe("M25 · 7. teclado", () => {
  it("navegação, switcher, menu e link de conta são alcançáveis por Tab", async () => {
    const u = userEvent.setup();
    montar(<SidebarContent />);

    await u.tab(); // switcher
    expect(document.activeElement?.getAttribute("aria-label")).toBe(en.shell.workspace.switch);
    await u.tab();
    expect(document.activeElement?.getAttribute("href")).toBe("/home");
    await u.tab();
    expect(document.activeElement?.getAttribute("href")).toBe("/analyses");
    await u.tab();
    expect(document.activeElement?.getAttribute("href")).toBe("/workspaces");
    await u.tab(); // menu do usuário
    expect(document.activeElement?.getAttribute("aria-label")).toBe(en.shell.user.menu);
  });

  it("o switcher abre pelo teclado e expõe `aria-expanded`", async () => {
    const u = userEvent.setup();
    montar(<SidebarContent />);
    const botao = screen.getByRole("button", { name: en.shell.workspace.switch });
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    botao.focus();
    await u.keyboard("{Enter}");
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("o menu do usuário abre pelo teclado e o link de conta recebe foco", async () => {
    const u = userEvent.setup();
    montar(<SidebarContent />);
    const botao = screen.getByRole("button", { name: en.shell.user.menu });
    botao.focus();
    await u.keyboard("{Enter}");
    await u.tab();
    expect(document.activeElement?.getAttribute("href")).toBe("https://idp.test/account");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 8. Nada local vira verdade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M25 · 8. membership não se guarda", () => {
  it("o shell não lê nem escreve membership/role em storage", () => {
    for (const f of [
      "src/shell/Sidebar.tsx",
      "src/shell/WorkspaceSwitcher.tsx",
      "src/shell/UserMenu.tsx",
    ]) {
      const fonte = readFileSync(resolve(RAIZ, f), "utf-8");
      for (const p of ["localStorage", "sessionStorage", "indexedDB", "document.cookie"]) {
        expect(fonte, `${f} persiste estado de tenant em ${p}`).not.toContain(p);
      }
    }
  });

  it("a lista exibida vem da PROJEÇÃO, não de um cache próprio do shell", () => {
    authMock.mockReturnValue(auth({ memberships: [WS_B], workspace: WS_B }));
    montar(<SidebarContent />);
    expect(screen.getByText("Beta")).toBeTruthy();
    expect(screen.queryByText("Alfa"), "workspace fora da projeção apareceu").toBeNull();
  });
});
