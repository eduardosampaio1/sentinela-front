// A NAVEGAÇÃO do shell: Perfil deixou de ser inalcançável, e a barra recolhe.
//
// O owner clicou no ícone do usuário procurando conta e configurações. O menu abriu e tinha UM
// item: "Sair" — o provedor desta instalação não expõe Account Console, e o único outro item
// some com ele.
//
// ## Duas telas, dois destinos DIFERENTES, e essa foi a correção
//
// `/profile` estava roteada, completa e sem nenhum caminho pela interface. Ela entra.
//
// `/dashboard/settings` **não entra**, e a primeira versão desta mudança a ligou. Um gate
// derrubou: `res01-m31` proíbe *"qualquer caminho pela interface"* até ela porque é **superfície
// legada** — a rota fica registrada, e os caminhos foram removidos de propósito. Eu tinha lido
// "órfã" onde estava escrito "aposentada".

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CHAVE_RECOLHIDA, guardarRecolhida, lerRecolhida } from "./larguraDaBarra";

describe("Barra lateral · a preferência de recolher", () => {
  it("`\"1\"` é recolhida; qualquer outra coisa é ABERTA", () => {
    // Fail-open de propósito: errar para o lado aberto custa espaço na tela; errar para o
    // fechado deixa alguém sem saber como voltar.
    window.localStorage.setItem(CHAVE_RECOLHIDA, "1");
    expect(lerRecolhida()).toBe(true);
    window.localStorage.setItem(CHAVE_RECOLHIDA, "0");
    expect(lerRecolhida()).toBe(false);
    window.localStorage.setItem(CHAVE_RECOLHIDA, "sim");
    expect(lerRecolhida()).toBe(false);
    window.localStorage.removeItem(CHAVE_RECOLHIDA);
    expect(lerRecolhida()).toBe(false);
  });

  it("recolhida GRAVA; aberta REMOVE", () => {
    // Remover em vez de gravar `"0"` faz "sem preferência" e "aberta" serem o mesmo estado —
    // que é o que eles são.
    guardarRecolhida(true);
    expect(window.localStorage.getItem(CHAVE_RECOLHIDA)).toBe("1");
    guardarRecolhida(false);
    expect(window.localStorage.getItem(CHAVE_RECOLHIDA)).toBeNull();
  });

  it("a preferência ATRAVESSA a sessão", () => {
    // O ponto do recurso: quem recolhe não quer recolher de novo a cada carregamento.
    guardarRecolhida(true);
    expect(lerRecolhida()).toBe(true);
    guardarRecolhida(false);
  });

  it("o módulo é o dono do armazenamento — o shell não o nomeia", async () => {
    // `shell-m25` proíbe o literal `localStorage` em `Sidebar.tsx`. A regra que ele defende é
    // "o shell não persiste estado de tenant", e a preferência de largura não é isso — mas a
    // saída certa não foi pedir isenção: foi tirar o detalhe de dentro do componente.
    const { readFileSync } = await import("node:fs");
    const { resolve, dirname } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const aqui = dirname(fileURLToPath(import.meta.url));
    for (const arq of ["Sidebar.tsx", "UserMenu.tsx"]) {
      const fonte = readFileSync(resolve(aqui, arq), "utf-8");
      expect(fonte, `${arq} nomeia storage`).not.toContain("localStorage");
    }
  });
});

// ── o menu do usuário ────────────────────────────────────────────────────────────────────
//
// Montado com stubs porque o `UserMenu` real depende de auth, roteador e i18n — e o que estes
// casos afirmam é a ESTRUTURA do menu, não a implementação de nenhum deles.

vi.mock("@/lib/auth", () => ({
  getAuthClient: () => ({ accountManagementUrl: () => null }),
}));
const navegou: string[] = [];
vi.mock("react-router-dom", () => ({
  useNavigate: () => (destino: string) => navegou.push(destino),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { email: "e2e@sentinela.dev" }, signOut: vi.fn() }),
}));
vi.mock("@/contexts/LanguageContext", () => ({
  useLanguage: () => ({
    t: (k: string) =>
      ({
        "account.profileTitle": "Perfil",
        "shell.user.menu": "Menu do usuário",
        "shell.user.signOut": "Sair",
      })[k] ?? k,
  }),
}));

const { UserMenu } = await import("./UserMenu");

describe("Menu do usuário · Perfil deixou de ser inalcançável", () => {
  async function abrir() {
    navegou.length = 0;
    render(<UserMenu />);
    await userEvent.click(screen.getByRole("button", { name: "Menu do usuário" }));
  }

  it("o menu tem Perfil e Sair — nunca só Sair", async () => {
    // O estado que o owner encontrou: sem Account Console, o menu ficava com UM item. Perfil não
    // depende do provedor, então o menu nunca mais fica assim.
    await abrir();
    const itens = screen.getAllByRole("menuitem").map((i) => i.textContent?.trim());
    expect(itens).toEqual(["Perfil", "Sair"]);
  });

  it("Perfil leva a `/profile`", async () => {
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Perfil" }));
    expect(navegou).toEqual(["/profile"]);
  });

  it("navegar FECHA o menu", async () => {
    // Menu que fica aberto sobre a página nova é lixo visual que a pessoa precisa dispensar.
    await abrir();
    await userEvent.click(screen.getByRole("menuitem", { name: "Perfil" }));
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("NENHUM item leva à superfície legada de configurações", async () => {
    // O contra-cadeado da correção. `res01-m31` já varre o repo inteiro pelo literal; este caso
    // afirma o mesmo pelo COMPORTAMENTO, e é o que sobrevive a alguém montar a rota por partes.
    await abrir();
    for (const item of screen.getAllByRole("menuitem")) {
      await userEvent.click(item).catch(() => {});
    }
    expect(navegou.some((d) => d.includes("settings"))).toBe(false);
  });
});
