// M45 — a matriz transversal das journeys da V1.
//
// ## A pergunta que esta suíte faz, e que nenhuma missão anterior fez
//
// As missões perguntaram *"esta feature passou?"*. Esta pergunta é outra: **as features que já
// passaram formam uma experiência coerente quando vistas juntas?**
//
// Por isso ela não reprova regra de negócio — isso é das suítes por missão, e elas continuam
// verdes. Ela mede o que só aparece atravessando o produto:
//
// * **navegabilidade** (gate 1): toda superfície REAL alcança um estado TERMINAL. Um esqueleto
//   permanente não é uma superfície navegável, e foi assim que a página da Instância passou
//   despercebida até a M42;
// * **erro/vazio/carregando distintos** (gate 11): três estados, três telas. Colapsar dois deles é
//   o defeito recorrente do programa inteiro — `503` virando "não existe", ausência virando falha;
// * **teclado e axe** (gate 7): em cada superfície, não só nas duas que a M42/M44 cobriram;
// * **responsive** (gate 5): sem rolagem horizontal em três larguras;
// * **PT/EN** (gate 6): provados pelo CONTEÚDO renderizado, nunca por `localStorage` — foi a
//   dívida da M40.
//
// ## Por que uma montagem só
//
// Cada superfície tinha a sua, e nenhuma media a vizinhança. Um `montar` transversal serve o
// produto inteiro de uma vez, e é isso que permite navegar de uma rota para outra dentro do mesmo
// documento — que é como a pessoa usa.

import axe from "axe-core";
import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const ESCOPO = "e2e-workspace-0000";
const ANALISE = "an-5c2f8e13-7a04-4b69-9d81-3e0a6c47fb02";
const INSTANCIA = "inst-4d92e0b8-1f34-4c7a-8e56-90ab3d7f2c15";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: ESCOPO, name: "Atendimento Norte", role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

/** O produto inteiro respondendo — uma montagem, todas as superfícies. */
async function montarProduto(page: Page, idioma: "pt" | "en" = "en") {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });

  const json = (corpo: unknown, status = 200) => ({
    status,
    contentType: "application/json",
    body: JSON.stringify(corpo),
  });

  await page.route("**/v1/me", (r) => r.fulfill(json(IDENTIDADE)));
  await page.route("**/v1/me/language", (r) =>
    r.fulfill(json({ stored_language: idioma, effective_language: idioma })),
  );
  await page.route("**/v1/workspaces/**", (r) =>
    r.fulfill(json({ workspace_id: ESCOPO, name: "Atendimento Norte", created_at: "2026-03-11T08:42:00Z" })),
  );
  await page.route("**/v1/subscriptions**", (r) => r.fulfill(json({ items: [] })));

  // A ORDEM importa: o Playwright casa a ÚLTIMA rota registrada primeiro, então as gerais entram
  // antes das específicas. Invertendo, a listagem engole o detalhe e a tela fica em "Preparing"
  // para sempre — o sintoma chega como "a rota não abre".
  await page.route("**/v1/analyses**", (r) => r.fulfill(json({ items: [], next_cursor: null })));
  await page.route("**/v1/instances**", (r) => r.fulfill(json({ items: [], next_cursor: null })));
  await page.route("**/v1/instances/*/baseline**", (r) =>
    r.fulfill(json({ baseline_analysis_id: null, baseline_set_at: null })),
  );
  await page.route("**/v1/instances/*", (r) =>
    r.fulfill(json({ instance_id: INSTANCIA, name: "Suporte", created_at: "2026-05-02T11:15:00Z" })),
  );
  await page.route("**/v1/analyses/*", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        status: "completed",
        record_count: 1240,
        result_available: true,
        retry_allowed: false,
        created_at: "2026-08-03T17:12:44Z",
        updated_at: "2026-08-03T17:13:02Z",
        instance_id: null,
      }),
    ),
  );
}

/**
 * As journeys da V1, com o estado TERMINAL de cada uma.
 *
 * A âncora não é "a página respondeu": é uma frase que só existe quando a superfície terminou de
 * decidir o que mostrar. É o que separa navegável de montado.
 */
const JOURNEYS = [
  { id: "J1", nome: "análises", rota: "/analyses", terminal: /No analyses yet|Nenhuma análise ainda/ },
  { id: "J2", nome: "análise", rota: `/analyses/${ANALISE}`, terminal: /Analysis completed|Análise concluída/ },
  { id: "J3", nome: "instâncias", rota: "/instances", terminal: /instance|Instância/i },
  { id: "J4", nome: "instância", rota: `/instances/${INSTANCIA}`, terminal: /Reference analysis|Análise de referência/ },
  { id: "J5", nome: "configurações", rota: "/dashboard/settings", terminal: /Notifications|Notificações/ },
  { id: "J6", nome: "workspaces", rota: "/workspaces", terminal: /workspace|espaço/i },
  // `/./` casava qualquer coisa — um gate que mede a existência de um caractere. Trocado por uma
  // âncora REAL: a frase que a Home só imprime depois de decidir o que mostrar.
  { id: "J7", nome: "home", rota: "/home", terminal: /What needs you in this workspace|O que precisa de você/ },
] as const;

// ══════════════════════════════════════════════════════════════════════════════════════════
// G1 · navegabilidade — toda superfície alcança estado TERMINAL
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G1 · superfícies navegáveis", () => {
  for (const j of JOURNEYS) {
    test(`${j.id} · ${j.nome} alcança estado terminal`, async ({ page }) => {
      await montarProduto(page);
      await page.goto(j.rota);

      // Terminal, e não "montou": `main` com conteúdo real, e a âncora da superfície.
      await expect(page.locator("main")).toBeVisible({ timeout: 15_000 });
      await expect(page.locator("main")).toContainText(j.terminal, { timeout: 15_000 });

      const texto = await page.locator("main").innerText();
      expect(texto.trim().length, `${j.id} ficou em esqueleto`).toBeGreaterThan(10);

      // Nenhuma superfície pode terminar mostrando vocabulário interno.
      for (const interno of ["job_id", "lease_token", "object_key", "stack_trace", "presigned"]) {
        expect(texto.toLowerCase(), `${j.id} vazou vocabulário interno: ${interno}`)
          .not.toContain(interno);
      }
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G11 · erro, vazio e carregando são TRÊS telas distintas
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G11 · os três estados não colapsam", () => {
  test("vazio ≠ erro na listagem de análises", async ({ page }) => {
    await montarProduto(page);
    await page.goto("/analyses");
    await expect(page.locator("main")).toContainText(/No analyses yet/, { timeout: 15_000 });

    const vazio = await page.locator("main").innerText();
    expect(vazio.length).toBeGreaterThan(20);
    // A tela de vazio NÃO pode falar em falha: ausência é estado legítimo.
    expect(vazio, "vazio apresentado como erro").not.toMatch(/couldn't load|unavailable|error/i);
  });

  test("erro ≠ vazio: `503` na listagem não vira 'nenhuma análise'", async ({ page }) => {
    await montarProduto(page);
    await page.route("**/v1/analyses**", (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      }),
    );
    await page.goto("/analyses");

    // ÂNCORA POSITIVA antes da negativa — sem ela, "não diz vazio" valeria sobre um esqueleto.
    await expect(page.locator("main")).toContainText(/couldn't load|Try again/i, { timeout: 20_000 });
    const texto = await page.locator("main").innerText();
    expect(texto.length).toBeGreaterThan(20);
    expect(texto, "outage virou ausência").not.toMatch(/No analyses yet/);
  });

  test("indisponível ≠ inexistente na Instância", async ({ page }) => {
    await montarProduto(page);
    await page.route("**/v1/instances/*", (r) =>
      r.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      }),
    );
    await page.goto(`/instances/${INSTANCIA}`);

    await expect(page.locator("main")).toContainText(/unavailable right now/, { timeout: 20_000 });
    const texto = (await page.locator("main").innerText()).toLowerCase();
    expect(texto.length).toBeGreaterThan(20);
    expect(texto, "503 virou 'não encontrada'").not.toMatch(/couldn't find|not found/);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G7 · a11y — axe e teclado em CADA superfície
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G7 · acessibilidade transversal", () => {
  for (const j of JOURNEYS) {
    test(`${j.id} · axe sem violação aplicável`, async ({ page }) => {
      await montarProduto(page);
      await page.goto(j.rota);
      await expect(page.locator("main")).toContainText(j.terminal, { timeout: 15_000 });

      await page.addScriptTag({ content: axe.source });
      const resultado = await page.evaluate(async () => {
        const a = (window as unknown as { axe: { run: (o: unknown) => Promise<unknown> } }).axe;
        return (await a.run({ runOnly: ["wcag2a", "wcag2aa"] })) as {
          violations: { id: string; nodes: unknown[] }[];
        };
      });
      const graves = resultado.violations.map((v) => `${v.id} (${v.nodes.length})`);
      expect(graves, `${j.id} · violações axe: ${graves.join(", ")}`).toEqual([]);
    });
  }

  test("teclado: o foco atravessa a navegação sem mouse", async ({ page }) => {
    await montarProduto(page);
    await page.goto("/dashboard/settings");
    await expect(page.locator("main")).toContainText(/Notifications/, { timeout: 15_000 });

    // Dez tabulações a partir do topo têm de alcançar algo focável e VISÍVEL — um foco que cai
    // em elemento oculto é armadilha de teclado, e não aparece em captura nenhuma.
    const alcançados: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press("Tab");
      const alvo = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const r = el.getBoundingClientRect();
        return { tag: el.tagName, visivel: r.width > 0 && r.height > 0 };
      });
      if (alvo) {
        expect(alvo.visivel, `foco caiu em elemento invisível (${alvo.tag})`).toBe(true);
        alcançados.push(alvo.tag);
      }
    }
    expect(alcançados.length, "o teclado não alcançou nada").toBeGreaterThan(3);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G5 · responsive — três larguras, sem rolagem horizontal
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G5 · responsive", () => {
  for (const vp of [
    { nome: "desktop", width: 1280, height: 800 },
    { nome: "tablet", width: 768, height: 1024 },
    { nome: "mobile", width: 375, height: 812 },
  ] as const) {
    test(`${vp.nome}: nenhuma superfície estoura a largura`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await montarProduto(page);

      const estouram: string[] = [];
      for (const j of JOURNEYS) {
        await page.goto(j.rota);
        await expect(page.locator("main")).toContainText(j.terminal, { timeout: 15_000 });
        // Medido pela GEOMETRIA dos elementos, e não por `scrollWidth` do documento.
        //
        // O `AppShell` tem `overflow-x-hidden`: um elemento mais largo que a viewport é CLIPADO,
        // não vira rolagem, e `scrollWidth - clientWidth` fica em zero para sempre. O gate escrito
        // assim não podia falhar — a mutação 7 da campanha o provou, injetando `min-w-[2000px]` no
        // frame e passando verde. Medir a caixa de cada elemento pega o estouro real, que é o que
        // a pessoa vê: conteúdo cortado na borda.
        const excesso = await page.evaluate(() => {
          const largura = document.documentElement.clientWidth;
          let pior = 0;
          for (const el of Array.from(document.querySelectorAll("main *"))) {
            const r = el.getBoundingClientRect();
            if (r.width === 0) continue;
            pior = Math.max(pior, Math.round(r.right - largura));
          }
          return pior;
        });
        if (excesso > 1) estouram.push(`${j.id} (${excesso}px)`);
      }
      expect(estouram, `${vp.nome} com rolagem horizontal`).toEqual([]);
    });
  }
});

// ══════════════════════════════════════════════════════════════════════════════════════════
// G6 · PT e EN, provados pelo CONTEÚDO
// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M45 · G6 · idioma provado pelo conteúdo", () => {
  for (const idioma of ["en", "pt"] as const) {
    test(`${idioma}: a preferência da CONTA decide, e o conteúdo prova`, async ({ page }) => {
      await montarProduto(page, idioma);
      await page.goto("/dashboard/settings");

      // Frases que existem em UM locale só. Nada de `localStorage` — foi a dívida da M40: doze
      // capturas rotuladas EN que renderizaram em inglês por acidente de setup.
      const marca = idioma === "en" ? /Password and sign-in/ : /Senha e acesso/;
      const oposta = idioma === "en" ? /Senha e acesso/ : /Password and sign-in/;

      await expect(page.locator("main")).toContainText(marca, { timeout: 15_000 });
      expect(await page.locator("main").getByText(oposta).count(), "os dois idiomas na mesma tela")
        .toBe(0);
    });
  }
});
