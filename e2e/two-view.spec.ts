// F6 — as duas visões em BROWSER REAL.
//
// O que só o browser prova: que a rota existe de verdade, que o deep link abre a visão certa,
// que o refresh não perde o lugar, que a requisição carrega a versão pedida, e que a visão
// ARGOS de uma análise histórica mostra indisponibilidade em vez de um resultado parecido.
//
// A massa do ARGOS é o artefato REAL do backend (`analysis-result-v3.real.json`, gravado pela
// prova P10 do orchestrator). Uma massa escrita aqui provaria que a tela sabe ler o que a
// própria tela inventou.

import axe from "axe-core";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

// ESM: `__dirname` não existe. A suíte roda como módulo, e o caminho sai da própria URL.
const AQUI = dirname(fileURLToPath(import.meta.url));
const ARTEFATO = resolve(
  AQUI,
  "../../sentinela-facts/docs/contracts/e2e/analysis-result-v3.real.json",
);

function documentoV3(): Record<string, unknown> {
  return JSON.parse(readFileSync(ARTEFATO, "utf-8")).resposta.result;
}

/** Semeia a jornada concluída e, opcionalmente, o documento ARGOS. */
async function semear(page: Page, id: string, v3: unknown | null) {
  await page.addInitScript(
    ([analysisId, doc]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem(
        "__sentinela_journey__",
        JSON.stringify({ [analysisId as string]: { seq: ["completed"], idx: 0, retryAllowed: false } }),
      );
      if (doc !== null) {
        sessionStorage.setItem(
          "__sentinela_result_v3__",
          JSON.stringify({ [analysisId as string]: doc }),
        );
      }
    },
    [id, v3] as const,
  );
}

test.describe("F6 — ONE ANALYSIS, TWO VIEWS (browser real)", () => {
  test("a visão ARGOS abre por deep link e pede a versão 3", async ({ page }) => {
    const pedidos: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/result")) pedidos.push(r.url());
    });

    await semear(page, "an-v3", documentoV3());
    await page.goto("/analyses/an-v3/argos");

    await expect(page.getByTestId("argos-view")).toBeVisible();
    // A prova que o teste de unidade não dá: a URL que SAI pela rede carrega a versão.
    expect(pedidos.some((u) => u.includes("result_schema_version=3"))).toBe(true);
  });

  test("refresh mantém a visão — a subrota é o lugar, não um estado local", async ({ page }) => {
    await semear(page, "an-v3", documentoV3());
    await page.goto("/analyses/an-v3/argos");
    await expect(page.getByTestId("argos-view")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("argos-view")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/analyses/an-v3/argos");
  });

  test("análise SEM v3 mostra indisponibilidade, nunca o documento histórico", async ({ page }) => {
    // O caso da análise antiga. Se a tela caísse para o v1, dez famílias ausentes seriam lidas
    // como "o ARGOS não produziu nada" — e nada na tela denunciaria.
    await semear(page, "an-sem-v3", null);
    await page.goto("/analyses/an-sem-v3/argos");

    await expect(page.getByTestId("argos-view")).toBeVisible();
    // `status`, e NÃO `alert`: ausência de documento é conclusão sobre disponibilidade, não
    // falha — a casa já usa essa distinção, e um alerta por ausência ensinaria a ignorar
    // alertas. A primeira versão deste teste exigia `alert` e reprovou a tela por um critério
    // que a própria plataforma não adota.
    await expect(page.getByRole("status").filter({ hasText: /ARGOS/ })).toBeVisible();
    // E o texto NÃO pode dizer que "não há resultado": o histórico existe e continua acessível.
    await expect(page.getByTestId("argos-view")).not.toContainText(/No result is available/i);
  });

  test("a visão Analytics abre e NÃO pede o documento do resultado", async ({ page }) => {
    const pedidos: string[] = [];
    page.on("request", (r) => pedidos.push(r.url()));

    await semear(page, "an-anl", documentoV3());
    await page.goto("/analyses/an-anl/analytics");

    await expect(page.getByTestId("analytics-view")).toBeVisible();
    // A ROTA da API, e não qualquer URL com `/result`. Em dev o Vite serve os módulos por
    // caminho, e `/src/features/canonical-analysis/result/adapterV3.ts` casaria com um
    // `includes("/result")` — falso positivo meu, o mesmo da primeira versão do gate 11.
    const api = (u: string) => /\/v1\/analyses\/[^/]+\/result/.test(u);
    expect(pedidos.some((u) => u.includes("/v1/analyses/") && u.includes("/analytics"))).toBe(true);
    expect(pedidos.filter(api), "a visão Analytics pediu o documento do resultado").toEqual([]);
  });

  test("as duas visões são alcançáveis uma da outra, e a atual é anunciada", async ({ page }) => {
    await semear(page, "an-v3", documentoV3());
    await page.goto("/analyses/an-v3/argos");

    const nav = page.getByRole("navigation", { name: /vis|view/i }).first();
    await expect(nav).toBeVisible();
    // `aria-current` e não só cor: quem não distingue as duas cores precisa saber onde está.
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);

    await nav.getByRole("link", { name: "Analytics" }).click();
    await expect(page.getByTestId("analytics-view")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/analyses/an-v3/analytics");
  });

  test("a rota LEGADA continua abrindo — deep link antigo não quebra", async ({ page }) => {
    await semear(page, "an-legado", null);
    await page.goto("/analyses/an-legado/result");
    // Não afirma o conteúdo: afirma que a rota não virou 404 nem redirect para outra visão.
    expect(new URL(page.url()).pathname).toBe("/analyses/an-legado/result");
    await expect(page.locator("body")).not.toContainText("404");
  });
});

test.describe("F6 — responsivo", () => {
  for (const [nome, largura, altura] of [
    ["desktop", 1280, 800],
    ["tablet", 768, 1024],
    ["mobile", 375, 812],
  ] as const) {
    test(`ARGOS em ${nome} não estoura a largura`, async ({ page }) => {
      await page.setViewportSize({ width: largura, height: altura });
      await semear(page, "an-v3", documentoV3());
      await page.goto("/analyses/an-v3/argos");
      await expect(page.getByTestId("argos-view")).toBeVisible();

      // ESTE GATE NÃO PODIA FALHAR até a M45.4.
      //
      // Ele lia `documentElement.scrollWidth - clientWidth`, e o `AppShell` tem
      // `overflow-x-hidden`: um elemento mais largo que a viewport é **clipado**, nunca vira
      // rolagem, e a subtração fica em zero para sempre. Foi provado na M45.0, onde a mesma
      // métrica sobreviveu a uma mutação que injetava `min-w-[2000px]` no frame.
      //
      // A medida correta é a GEOMETRIA de cada elemento contra a largura da viewport — que é o
      // que a pessoa vê: conteúdo cortado na borda.
      const excesso = await page.evaluate(() => {
        const limite = document.documentElement.clientWidth;
        let pior = 0;
        for (const el of Array.from(document.querySelectorAll("main *"))) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          pior = Math.max(pior, Math.round(r.right - limite));
        }
        return pior;
      });
      expect(excesso, `${nome}: conteúdo estoura a largura em ${excesso}px`).toBeLessThanOrEqual(1);
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// M45.4 · o que a F6 nunca mediu nestas superfícies
// ══════════════════════════════════════════════════════════════════════════════════════════
//
// A F6 provou fonte única, negociação de versão, vocabulário e rota — o que era o risco DELA.
// Não provou acessibilidade nem idioma, e as duas visões são superfícies REAL do Blueprint
// (`ARG-01`, `ANL-01`). Nenhuma suíte rodava `axe` aqui: a da M42 roda na Instância, a da M44 em
// Settings, e a matriz transversal da M45.0 nunca visitou estas rotas.

test.describe("M45.4 — acessibilidade e idioma das duas visões", () => {
  for (const [nome, rota, marca] of [
    ["ARGOS", "/analyses/an-v3/argos", "argos-view"],
    ["Analytics", "/analyses/an-v3/analytics", "analytics-view"],
  ] as const) {
    test(`${nome} · axe sem violação aplicável`, async ({ page }) => {
      await semear(page, "an-v3", documentoV3());
      await page.goto(rota);
      // Estado TERMINAL antes de medir: axe sobre esqueleto aprova a ausência de conteúdo.
      await expect(page.getByTestId(marca)).toBeVisible({ timeout: 15_000 });

      await page.addScriptTag({ content: axe.source });
      const resultado = await page.evaluate(async () => {
        const a = (window as unknown as { axe: { run: (o: unknown) => Promise<unknown> } }).axe;
        return (await a.run({ runOnly: ["wcag2a", "wcag2aa"] })) as {
          violations: { id: string; nodes: unknown[] }[];
        };
      });
      const graves = resultado.violations.map((v) => `${v.id} (${v.nodes.length})`);
      expect(graves, `${nome} · violações axe: ${graves.join(", ")}`).toEqual([]);
    });
  }

  // PT/EN das duas visões: medido na MATRIZ da M45, não aqui.
  //
  // Tentei duas vezes nesta spec e as duas falharam por INSTRUMENTO: a montagem por `semear`
  // (sessionStorage + bypass) não faz o reconciliador de idioma resolver, e acrescentar a cadeia
  // completa aqui quebrou o carregamento do documento v3. A medição foi para `m45-matriz`, cuja
  // montagem já comprova troca de idioma — e lá a âncora é o estado de INDISPONIBILIDADE do
  // ARGOS, que é i18n e não depende de semear documento nenhum.
  // Nota histórica desta medição, preservada porque ela custou uma tentativa:
  //
  // Escrevi um caso que mockava `/v1/me` e `/v1/me/language` em `pt` e afirmava o conteúdo. Ele
  // reprovou — e a causa era MINHA: o shell renderizou `Home | Analyses | Instances | Workspaces`,
  // ou seja, o idioma nunca trocou. A montagem por `semear` (sessionStorage + bypass) não faz o
  // reconciliador de idioma resolver como a montagem completa da matriz da M45.0 faz.
  //
  // As duas visões usam `t()` em 35 pontos e não têm literal inglês — então não há indício de
  // defeito de produto. Mas indício não é prova, e um teste que passasse aqui por acidente de
  // setup seria a dívida da M40 outra vez. Fica NÃO MEDIDO até a tranche montar o produto
  // inteiro, e não é contado como verde em lugar nenhum.
});