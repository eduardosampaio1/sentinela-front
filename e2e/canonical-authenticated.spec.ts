// Jornada canônica AUTENTICADA em browser real (Onda 6 E3 reconciliação, item 2).
//
// Usa o bypass de auth E2E fail-closed (opt-in por teste via addInitScript) + o MSW browser worker
// com a sequência stateful por analysis_id. Prova: happy path só com chamadas /v1, mesmo
// analysis_id, sem 2º upload no submit, sem indicador/percentual, ação terminal coerente; refresh
// reconstrói pelo analysis_id a partir da URL; recovering não é erro definitivo.

import { expect, test } from "@playwright/test";

/** Liga o estado autenticado ANTES do carregamento da app (survive reload). */
async function enableAuth(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
}

const JSONL = { name: "data.jsonl", mimeType: "application/x-ndjson", buffer: Buffer.from('{"a":1}\n') };

test.describe("Jornada canônica autenticada (browser real + MSW stateful)", () => {
  test("happy: prepare→upload→submit→estados→completed, só /v1, sem 2º upload", async ({ page, baseURL }) => {
    const legacy: string[] = [];
    let uploadOpens = 0;
    let uploadParts = 0;
    let uploadCompletions = 0;
    let v1Calls = 0;
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (baseURL && u.origin === new URL(baseURL).origin) {
        if (/^\/(api|rest|graphql|auth)\//.test(u.pathname)) legacy.push(`${req.method()} ${u.pathname}`);
        if (u.pathname.startsWith("/v1/")) {
          v1Calls += 1;
          if (u.pathname.endsWith("/data/uploads") && req.method() === "POST") uploadOpens += 1;
          if (/\/data\/uploads\/[^/]+\/parts\/\d+$/.test(u.pathname) && req.method() === "PUT") uploadParts += 1;
          if (/\/data\/uploads\/[^/]+\/complete$/.test(u.pathname) && req.method() === "POST") {
            uploadCompletions += 1;
          }
        }
      }
    });

    await enableAuth(page);
    await page.goto("/canonical/analyses/new");

    // Autenticado: NÃO redireciona para login. A URL já representa a intenção e a reserva é
    // automática; esperar a identidade durável prova a entrada sem uma confirmação redundante.

    // Identidade durável: navega p/ `/analyses/an-e2e`.
    //
    // Era `/canonical/analyses/an-e2e` até `f182e4b` (M24), que tirou o nome de camada interna da
    // URL pública e deixou `/canonical/*` como redirect de compatibilidade. A entrada da spec
    // segue pelo endereço antigo DE PROPÓSITO — é assim que o redirect continua coberto —, mas a
    // identidade que a app publica depois da ação é a nova. A expectativa acompanhou a autoridade.
    await page.waitForURL(/\/analyses\/an-e2e/);

    // upload sem materialização (File direto)
    await page.setInputFiles("#canonical-file", JSONL);
    await page.getByRole("button", { name: "Send dataset" }).click();

    // receiving → submit (reusa o MESMO analysis_id; não refaz upload)
    await page.getByRole("button", { name: "Submit for analysis" }).click();

    // acompanha até completed (passa por recovering; NUNCA % nem progressbar)
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 40_000 });
    // E5 mudou este contrato de propósito: na E3 a ação era um botão DESABILITADO (não existia
    // página de resultado); agora é um link real para a rota canônica, deep-linkável. A asserção
    // não foi afrouxada — ficou mais forte: exige o href EXATO do analysis_id desta jornada.
    //
    // O href também perdeu o `/canonical` em `f182e4b` (M24). Esta linha ficou anos-luz de ser
    // vista: o `waitForURL` acima matava o caso antes, e uma assertion morta não acusa nada.
    // Two-View Recovery: a acao terminal virou DUAS. O `analysis-result-v3` desfez a fusao dos
    // motores, e a jornada oferece a visao ARGOS e a visao Analytics em vez do documento
    // fundido. A rota `/result` continua servivel por deep link — o que ela deixou de ser e o
    // destino ANUNCIADO, agora que existe a visao certa para cada leitura.
    //
    // A assercao segue exigindo o href EXATO do analysis_id desta jornada, pelo mesmo motivo de
    // antes: um link certo para a analise errada passa despercebido em captura.
    // Os RÓTULOS mudaram: "ARGOS" era nome de motor e "Analytics" era categoria genérica, e
    // ninguém que abre a tela sabe o que nenhum dos dois quer dizer. Em EN viraram "Assessment" e
    // "Measures". As ROTAS não mudaram — e são elas que esta prova protege.
    const verArgos = page.getByRole("link", { name: "Assessment", exact: true });
    await expect(verArgos).toBeVisible();
    await expect(verArgos).toHaveAttribute("href", "/analyses/an-e2e/argos");

    const verAnalytics = page.getByRole("link", { name: "Measures", exact: true });
    await expect(verAnalytics).toBeVisible();
    await expect(verAnalytics).toHaveAttribute("href", "/analyses/an-e2e/analytics");

    expect(legacy, "nenhuma chamada legada (/api|/rest|/graphql|/auth)").toEqual([]);
    expect(v1Calls, "a jornada fala com o Gateway /v1").toBeGreaterThan(0);
    expect(uploadOpens, "submit NÃO reabre a sessão multipart").toBe(1);
    expect(uploadParts, "o arquivo pequeno é enviado em uma única parte").toBe(1);
    expect(uploadCompletions, "a sessão multipart é concluída uma única vez").toBe(1);
    await expect(page.getByRole("progressbar")).toHaveCount(0); // sem indicador/percentual
  });

  test("refresh: em progresso → reload reconstrói por analysis_id (da URL) → completed", async ({ page }) => {
    await enableAuth(page);
    await page.goto("/canonical/analyses/new");
    await page.waitForURL(/\/analyses\/an-e2e/); // rota pública pós-M24 — ver o comentário acima
    await page.setInputFiles("#canonical-file", JSONL);
    await page.getByRole("button", { name: "Send dataset" }).click();
    await page.getByRole("button", { name: "Submit for analysis" }).click();

    // um estado em progresso aparece
    await expect(page.getByRole("heading", { name: /Queued|Running|Recovering/ })).toBeVisible({ timeout: 20_000 });

    // RELOAD: a app monta do ZERO a partir da URL (não do Context/File em memória)
    await page.reload();
    // monta direto no acompanhamento (não na entrada nem no upload)
    await expect(page.getByTestId("canonical-analysis-page")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start analysis" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send dataset" })).toHaveCount(0);

    // e converge para completed pela sequência persistida por analysis_id
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 40_000 });
  });

  test("recovering NÃO é erro definitivo: aparece como progresso e a jornada continua", async ({ page }) => {
    // pré-semeia a sequência do analysis_id ANTES do load (determinístico, sem corrida)
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem(
        "__sentinela_journey__",
        JSON.stringify({
          "an-rec": { seq: ["recovering", "recovering", "running", "completed"], idx: 0, retryAllowed: false },
        }),
      );
    });
    await page.goto("/canonical/analyses/an-rec");

    // recovering é apresentado EM PROGRESSO (sem ação de erro/retry — não é definitivo)
    await expect(page.getByRole("heading", { name: "Recovering" })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: "Try again" })).toHaveCount(0);
    await expect(page.getByRole("progressbar")).toHaveCount(0);

    // a jornada avança (recovering é transitório, não terminal)
    await expect(page.getByRole("heading", { name: "Completed" })).toBeVisible({ timeout: 40_000 });
  });
});
