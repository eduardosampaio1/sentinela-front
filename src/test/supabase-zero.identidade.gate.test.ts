import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Gate permanente da IDENTIDADE no frontend.
 *
 * A matriz congelada dá ao Keycloak a autoridade sobre usuário, roles, grupos e membership, e ao
 * Gateway a projeção e a validação. Sobra para o frontend exatamente uma coisa: a **preferência**
 * de workspace ativo — que só vale se estiver na lista projetada.
 *
 * Estes cadeados congelam as proibições explícitas da diretriz. Cada um existe porque a violação
 * correspondente é fácil de escrever, parece funcionar, e transfere autoridade sem que ninguém
 * decida transferir.
 */

const RAIZ = resolve(__dirname, "../..");

function versionados(): string[] {
  return execSync("git ls-files", { cwd: RAIZ, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
}

/** Fontes de produção: `src/`, TS/TSX, sem testes e sem o legado morto. */
function fontesVivas(): { arquivo: string; texto: string }[] {
  return versionados()
    .filter((f) => f.startsWith("src/") && /\.tsx?$/.test(f))
    .filter((f) => !/\.test\.tsx?$/.test(f) && !f.startsWith("src/test/"))
    .map((f) => ({ arquivo: f, texto: readFileSync(join(RAIZ, f), "utf8") }));
}

describe("Supabase = 0 — identidade: o frontend não é autoridade", () => {
  it("não chama a Admin API do Keycloak", () => {
    // Chamar `/admin/realms/...` do navegador exigiria credencial administrativa NO CLIENTE.
    // Não existe forma segura de fazer isso; a projeção autenticada é `GET /v1/me`.
    const re = /\/admin\/realms|admin-cli|client_secret/;
    const ofensores = fontesVivas()
      .filter(({ texto }) => re.test(texto))
      .map(({ arquivo }) => arquivo);
    expect(ofensores, "frontend tocando a Admin API / segredo de client do Keycloak").toEqual([]);
  });

  it("a lista de workspaces vem de /v1/me, e de nenhuma outra fonte", () => {
    // Uma segunda fonte de membership é uma segunda verdade: no dia em que divergirem, o
    // usuário vê um workspace que o backend nega — ou pior, o contrário.
    //
    // Este cadeado nasce VERMELHO de propósito, e a lista abaixo é a prova disso: hoje o
    // `AuthContext` busca membership no Supabase. A lista é FECHADA — some quando a Parte 5
    // reescrever o arquivo, e ninguém pode entrar nela sem editar este teste.
    const PENDENTE_ATE_PARTE5 = [
      "src/contexts/AuthContext.tsx", // usa listUserWorkspaces (Supabase) — Parte 5 troca por /v1/me
    ] as const;

    const fontes = fontesVivas().filter(({ texto }) => /\bworkspaces\s*[:=]/.test(texto));
    expect(fontes.length, "nenhum arquivo manipula workspaces — o gate não olharia nada").toBeGreaterThan(0);

    const proibido = /listUserWorkspaces|from\(\s*["'`]workspaces["'`]\)|from\(\s*["'`]workspace_members["'`]\)/;
    const encontrados = fontes
      .filter(({ arquivo }) => arquivo !== "src/lib/workspaces.ts") // o módulo a REMOVER (Parte 5)
      .filter(({ texto }) => proibido.test(texto))
      .map(({ arquivo }) => arquivo);

    const novos = encontrados.filter((f) => !(PENDENTE_ATE_PARTE5 as readonly string[]).includes(f));
    expect(novos, "membership obtida fora de /v1/me, FORA da pendência declarada").toEqual([]);

    // E o inverso: uma pendência já resolvida tem de sair da lista, senão o teto folga.
    const resolvidos = PENDENTE_ATE_PARTE5.filter((f) => !encontrados.includes(f));
    expect(resolvidos, "pendência já resolvida — remova destas linhas").toEqual([]);
  });

  it("não existe `tenant_id` livre em lugar nenhum do runtime", () => {
    // `workspace_id` é autorizado contra a membership do token; `tenant_id` livre seria um campo
    // que o cliente escolhe — exatamente a autoridade que o Gateway não pode delegar.
    //
    // O cadeado é sobre USO, não sobre menção: `client.ts` diz "nunca `tenant_id`" num comentário,
    // e proibir a palavra proibiria explicar a regra. Casa string literal, chave de objeto e
    // acesso a propriedade, em linha que não é comentário.
    const usoReal = /["'`]tenant_id["'`]|\btenant_id\s*:|\.tenant_id\b/;
    const ehComentario = (l: string) => /^\s*(\/\/|\*|\/\*)/.test(l);
    const ofensores = fontesVivas()
      .filter(({ texto }) => texto.split("\n").some((l) => !ehComentario(l) && usoReal.test(l)))
      .map(({ arquivo }) => arquivo);
    expect(ofensores).toEqual([]);
  });

  it("o workspace ativo é preferência local, nunca autoridade", () => {
    // O valor pode vir do localStorage; o que ele NÃO pode é entrar numa chamada sem ter sido
    // conferido contra a lista projetada. O cadeado é de forma: quem lê a preferência não pode
    // ser quem monta a query — a conferência tem de existir no meio.
    const leitores = fontesVivas().filter(({ texto }) =>
      /sentinela:selected_workspace_id|getStoredWorkspaceId/.test(texto),
    );
    for (const { arquivo, texto } of leitores) {
      const montaQuery = /workspace_id\s*:/.test(texto) && /fetch\(|searchParams/.test(texto);
      expect(
        montaQuery,
        `${arquivo} lê a preferência local E monta a query — falta a conferência contra a lista projetada`,
      ).toBe(false);
    }
  });

  it("nenhum provider de auth novo entra sem decisão", () => {
    // A matriz tem UM provedor de identidade. `resolveProvider` é o ponto onde isso é decidido;
    // o dia em que a lista crescer sem alguém mexer aqui é o dia em que virou dois.
    const provider = readFileSync(join(RAIZ, "src/lib/auth/resolveProvider.ts"), "utf8");
    const nomes = [...provider.matchAll(/value === "([a-z]+)"/g)].map((m) => m[1]);
    expect(new Set(nomes)).toEqual(new Set(["supabase", "keycloak"]));
  });
});
