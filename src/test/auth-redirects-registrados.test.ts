import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Todo destino que o código de autenticação manda para o Supabase é uma rota REGISTRADA.
 *
 * O defeito que originou este cadeado: `ForgotPasswordPage` pedia ao Supabase que
 * mandasse o e-mail de recuperação para `${origin}/reset-password`, `authFlow.ts` sabia
 * montar `/auth/reset-password`, a página `src/pages/ResetPasswordPage.tsx` estava escrita
 * e testada — e o router não registrava nenhuma das duas. O usuário pedia a recuperação,
 * recebia o e-mail, clicava, e caía num 404. Nada disso aparecia em teste: a suíte de auth
 * montava a rota à mão, então provava que a PÁGINA funciona, não que ela é alcançável.
 *
 * A rota vivia em `src_legacy/App.tsx` — o router anterior — e a migração da Onda 6 não a
 * portou. A remoção do legado na Onda 8 não causou a falha; ela apenas tirou da árvore o
 * arquivo que dava a impressão de que o caso estava coberto. É a diferença entre "o código
 * existe" e "o código é alcançável", e um `git grep` não distingue as duas.
 *
 * O cadeado é sobre a CLASSE: qualquer destino novo que alguém mandar ao Supabase amanhã
 * — verificação de e-mail, convite, magic link — nasce coberto.
 */

const RAIZ = resolve(__dirname, "../..");
const ROUTER = readFileSync(`${RAIZ}/src/app/router.tsx`, "utf8");

/** Arquivos que constroem URLs de retorno para o Supabase. */
const FONTES = [
  "src/lib/authFlow.ts",
  "src/features/auth/ForgotPasswordPage.tsx",
  "src/features/auth/LoginPage.tsx",
  "src/features/auth/RegisterPage.tsx",
];

/** `new URL("/x", origin)` e `redirectTo: \`${origin}/x\`` — as duas formas usadas aqui. */
const PADROES = [
  /new URL\(\s*["'](\/[^"']*)["']/g,
  /redirectTo:\s*`\$\{[^}]+\}(\/[^`]*)`/g,
];

function destinosDeclarados(): { arquivo: string; caminho: string }[] {
  const achados: { arquivo: string; caminho: string }[] = [];
  for (const arquivo of FONTES) {
    let texto: string;
    try {
      texto = readFileSync(`${RAIZ}/${arquivo}`, "utf8");
    } catch {
      continue; // arquivo pode ter sido renomeado; o gate de rotas abaixo ainda vale
    }
    for (const padrao of PADROES) {
      for (const m of texto.matchAll(padrao)) {
        const caminho = m[1].split("?")[0].replace(/\/$/, "");
        if (caminho && caminho !== "/") achados.push({ arquivo, caminho });
      }
    }
  }
  return achados;
}

/** Caminhos literais registrados no router (`path: "/x"`). */
function rotasRegistradas(): Set<string> {
  return new Set([...ROUTER.matchAll(/path:\s*["']([^"']+)["']/g)].map((m) => m[1]));
}

describe("destinos de autenticação são rotas alcançáveis", () => {
  it("o gate encontra os destinos — senão ele passaria por não olhar nada", () => {
    // Sem esta asserção, renomear `authFlow.ts` transformaria o gate num teste vazio que
    // reporta verde. É o mesmo defeito de "pulou é diferente de passou", aplicado a um
    // conjunto vazio de entradas.
    const destinos = destinosDeclarados();
    expect(destinos.length, "nenhum destino de auth encontrado nas fontes").toBeGreaterThan(0);
    expect(destinos.map((d) => d.caminho)).toContain("/auth/reset-password");
  });

  it("todo destino mandado ao Supabase existe no router", () => {
    const registradas = rotasRegistradas();
    const orfaos = destinosDeclarados()
      .filter((d) => !registradas.has(d.caminho))
      .map((d) => `${d.arquivo} → ${d.caminho}`);
    expect(orfaos).toEqual([]);
  });

  it("a recuperação não constrói URL: ela delega ao provedor", () => {
    // Este caso exigia UM construtor de `buildPasswordResetUrl` — a URL do e-mail do Supabase,
    // que precisava casar com a rota registrada. Depois da M02 não há construtor nenhum: o link
    // de recuperação é emitido pelo Keycloak e aponta para o `action-token` dele.
    //
    // O que resta a garantir é o inverso: a página de recuperação NÃO monta URL própria.
    const pagina = readFileSync(
      resolve(RAIZ, "src/features/auth/ForgotPasswordPage.tsx"),
      "utf-8",
    );
    expect(pagina).not.toContain("buildPasswordResetUrl");
    expect(pagina).toContain("KeycloakRedirect");
  });
});
