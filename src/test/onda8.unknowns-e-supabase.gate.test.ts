import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Dois cadeados que fecham as pendências que a Onda 8 deixou nomeadas.
 *
 * ## 1. Nenhum UNKNOWN vivo em silêncio
 *
 * A regra da onda preserva UNKNOWN — nada aqui apaga nada. O que não pode existir é um
 * artefato classificado como desconhecido que, na prática, participa da jornada: chega ao
 * navegador do usuário, registra rota ou acessa dados. Isso não é dívida, é caminho de
 * produção sem dono.
 *
 * A prova de "chega ao usuário" é o SOURCEMAP do build, não grep em minificado.
 *
 * ## 2. A superfície de acesso direto ao Supabase não cresce
 *
 * Quatro módulos acessam dados por Supabase fora do `/v1`. Migrá-los é uma onda inteira —
 * o contrato público só tem operações de ANÁLISE, e não existe endpoint de workspaces nem
 * de registry para onde migrar. O que dá para fazer agora, e é o que este cadeado faz, é
 * congelar a lista: a dívida para de crescer enquanto não é paga.
 *
 * E a camada canônica não pode importar nenhum deles — a fronteira `/v1` é o ponto.
 */

const RAIZ = resolve(__dirname, "../..");
const CLASSIFICACAO = resolve(
  RAIZ,
  "../sentinela-event-dispatcher/docs/onda8/ARTIFACT-CLASSIFICATION.json",
);

/** Os quatro módulos que acessam dados por Supabase. Lista FECHADA e congelada. */
const ACESSO_DIRETO_CONGELADO = [
  "src/lib/analysisRuns.ts",
  "src/lib/analysisJobs.ts",
  "src/lib/workspaces.ts",
  "src/lib/systemRegistry.ts",
] as const;

/** `.from()`, `.rpc()`, `storage.from()`. `supabase.auth.*` NÃO conta: Auth é preservado. */
const RE_SUPABASE_DADOS = /\.from\(\s*["'`]|\.rpc\(\s*["'`]|storage\s*\.\s*from\(/;

function versionados(): string[] {
  return execSync("git ls-files", { cwd: RAIZ, encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
}

/** Módulos do projeto presentes nos sourcemaps de `dist/`. Vazio = build não medido. */
function modulosNoBundle(): Set<string> {
  const dir = join(RAIZ, "dist", "assets");
  const modulos = new Set<string>();
  if (!existsSync(dir)) return modulos;
  for (const arquivo of readdirSync(dir).filter((f) => f.endsWith(".map"))) {
    let mapa: { sources?: string[] };
    try {
      mapa = JSON.parse(readFileSync(join(dir, arquivo), "utf8"));
    } catch {
      continue;
    }
    for (const origem of mapa.sources ?? []) {
      const limpo = origem.replace(/\\/g, "/");
      if (limpo.includes("node_modules")) continue;
      const corte = limpo.indexOf("/src/");
      if (corte >= 0) modulos.add("src" + limpo.slice(corte + 4));
    }
  }
  return modulos;
}

describe("Onda 8 — nenhum UNKNOWN vivo em silêncio", () => {
  it("todo módulo que acessa dados por Supabase está na lista congelada", () => {
    // Um arquivo novo com `.from("tabela")` é dívida NOVA, e dívida nova precisa de decisão
    // — não de um commit que a acrescenta ao monte sem ninguém notar.
    const encontrados = versionados()
      .filter((f) => f.startsWith("src/") && /\.tsx?$/.test(f) && !f.includes("/test/"))
      .filter((f) => !f.endsWith(".test.ts") && !f.endsWith(".test.tsx"))
      .filter((f) => RE_SUPABASE_DADOS.test(readFileSync(join(RAIZ, f), "utf8")));
    const novos = encontrados.filter(
      (f) => !(ACESSO_DIRETO_CONGELADO as readonly string[]).includes(f),
    );
    expect(novos, "acesso direto a dados por Supabase FORA da lista congelada").toEqual([]);
  });

  it("a camada canônica não importa nenhum módulo de acesso direto", () => {
    // A jornada canônica fala com o Gateway `/v1`. Se ela importar um destes, o dado passa a
    // ter duas fontes de verdade, e a divergência aparece como bug de leitura muito depois.
    const canonicos = versionados().filter(
      (f) => f.startsWith("src/features/canonical-analysis/") || f.startsWith("src/lib/v1/"),
    );
    expect(canonicos.length, "nenhum arquivo canônico encontrado — o gate não olharia nada").toBeGreaterThan(0);
    const ofensores: string[] = [];
    for (const f of canonicos) {
      const txt = readFileSync(join(RAIZ, f), "utf8");
      for (const alvo of ACESSO_DIRETO_CONGELADO) {
        const mod = alvo.replace(/^src\/lib\//, "").replace(/\.ts$/, "");
        if (new RegExp(`from\\s+["'][^"'\\n]*\\b${mod}["']`).test(txt)) {
          ofensores.push(`${f} → ${alvo}`);
        }
      }
    }
    expect(ofensores).toEqual([]);
  });

  it("nenhum artefato UNKNOWN do frontend chega ao bundle do usuário", () => {
    // Chegar ao bundle é a definição operacional de "está vivo": o navegador baixa e executa.
    // Um UNKNOWN aqui não deve ser apagado — deve ser PROMOVIDO a CANONICAL_ACTIVE, porque
    // deixou de ser desconhecido no momento em que a medição respondeu.
    if (!existsSync(CLASSIFICACAO)) {
      throw new Error(
        `classificação não encontrada em ${CLASSIFICACAO}. Sem ela este gate não verifica ` +
          "nada, e um teste que não verifica nada não pode reportar verde.",
      );
    }
    const bundle = modulosNoBundle();
    if (bundle.size === 0) {
      throw new Error(
        "nenhum sourcemap em dist/assets — rode `npx vite build --sourcemap` antes. " +
          "Sem bundle medido, a afirmação seria opinião.",
      );
    }
    const classificacao: { repositorio: string; arquivo: string; categoria: string }[] =
      JSON.parse(readFileSync(CLASSIFICACAO, "utf8"));
    const vivos = classificacao
      .filter((x) => x.repositorio === "front" && x.categoria === "UNKNOWN")
      .filter((x) => bundle.has(x.arquivo))
      .map((x) => x.arquivo);
    expect(
      vivos,
      "UNKNOWN presentes no bundle: promova a CANONICAL_ACTIVE (não apague)",
    ).toEqual([]);
  });
});
