// M45.3 — as capturas de RES-01, a superfície CONGELADA.
//
// ## Por que uma superfície congelada ganha evidência agora
//
// O Blueprint §4.6 a mantém *"funcional e servindo deep link antigo"*, sem feature nova. Ela é a
// única superfície REAL do produto sem uma imagem sequer — e a que ninguém olha é justamente a que
// apodrece sem aviso. A evidência aqui não pede mudança; ela registra o que existe, para que uma
// regressão futura tenha contra o que ser comparada.
//
// ## O provador é o mesmo das outras tranches
//
// Toda imagem afirma, ANTES de disparar, (1) a âncora do estado que o NOME promete e (2) uma frase
// que só existe naquele idioma.

import { expect, test, type Page } from "@playwright/test";
import { MASSA_A } from "@/test/fixtures/canonical-result/massas";
import { V2_READY } from "@/test/fixtures/canonical-result/massasV2";

test.use({ serviceWorkers: "block" });

const SAIDA = "docs/m45-3";
const ESCOPO = "e2e-workspace-0000";
const ANALISE = "an-5c2f8e13-7a04-4b69-9d81-3e0a6c47fb02";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: ESCOPO, name: "Atendimento Norte", role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

/** O ENVELOPE público embrulha o documento — as massas são o documento. */
const envelope = (doc: Record<string, unknown>) => ({
  analysis_id: ANALISE,
  result_schema_version: String(doc.result_schema_version),
  indicator_registry_version: "indicator-registry-1.0",
  result: doc,
});

interface Opcoes {
  readonly idioma?: "pt" | "en";
  readonly doc?: unknown;
  /** `404` = o produtor não tem documento · `503` = o serviço caiu. Nunca a mesma tela. */
  readonly recusa?: 404 | 503;
  /** A regiao Analytics de RES-01 le o ENDPOINT VIVO, nao o bloco do documento (Blueprint 4.6). */
  readonly analyticsRetido?: boolean;
}

async function montar(page: Page, o: Opcoes = {}) {
  const idioma = o.idioma ?? "en";
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
  // Predicado de caminho: `**/v1/analyses**` engoliria `/result` e `/timeline`.
  await page.route(
    (url) => url.pathname === "/v1/analyses",
    (r) => r.fulfill(json({ items: [], next_cursor: null })),
  );
  // `result_available: true` COM `/result` em 404 nao e massa impossivel: e o caso de RETENCAO.
  // O documento existiu, o status ainda o anuncia, e a purga o levou. Eu tinha trocado isto por
  // `result_available: false` achando que corrigia uma incoerencia -- e so troquei o estado
  // medido: com `false`, a tela diz que o resultado ainda esta sendo preparado, que e outra coisa.
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
  await page.route("**/v1/analyses/*/timeline**", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        events: [
          { event_id: "ev-1", event_schema_version: "v1", analysis_id: ANALISE, workspace_id: ESCOPO, sequence: 1, event_type: "analysis.started", occurred_at: "2026-08-03T17:12:44Z" },
          { event_id: "ev-2", event_schema_version: "v1", analysis_id: ANALISE, workspace_id: ESCOPO, sequence: 2, event_type: "analysis.completed", occurred_at: "2026-08-03T17:13:02Z" },
          { event_id: "ev-3", event_schema_version: "v1", analysis_id: ANALISE, workspace_id: ESCOPO, sequence: 3, event_type: "result.available", occurred_at: "2026-08-03T17:13:05Z" },
        ],
      }),
    ),
  );
  await page.route("**/v1/analyses/*/progress**", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        axes: [
          { axis: "engine", state: "ready" },
          { axis: "analytics", state: "ready" },
          { axis: "export", state: "ready" },
          { axis: "final_result", state: "ready" },
        ],
      }),
    ),
  );
  await page.route("**/v1/analyses/*/analytics**", (r) =>
    r.fulfill(
      json({
        analysis_id: ANALISE,
        component_status: o.analyticsRetido ? "withheld" : "ready",
        snapshot_contract_version: "analytics-snapshot-v9",
        snapshot_digest: "sd",
        snapshot: o.analyticsRetido
          ? null
          : { snapshot_contract_version: "analytics-snapshot-v9", record_count: 1240, numeric: [], distributions: [], dimensions: [], concentrations: [], time_series: [] },
        disclosure_rule_version: "dr-1",
        projection_digest: "pd",
        withheld: o.analyticsRetido ? { reason_code: "min_group_size" } : null,
        generated_at: "2026-08-01T00:00:00Z",
      }),
    ),
  );
  await page.route("**/v1/analyses/*/result**", (r) =>
    o.recusa
      ? r.fulfill(
          json(
            {
              code: o.recusa === 404 ? "result_not_available" : "temporarily_unavailable",
              retryable: o.recusa === 503,
            },
            o.recusa,
          ),
        )
      : r.fulfill(json(o.doc ?? envelope(V2_READY as Record<string, unknown>))),
  );
}

/** Frases que existem em UM idioma só. */
const MARCA = { en: /Back to history/, pt: /Voltar ao histórico/ } as const;

async function capturar(page: Page, nome: string, idioma: "pt" | "en", ancora: RegExp) {
  const main = page.locator("main");
  await expect(
    main.getByText(ancora).first(),
    `${nome}: o estado que o nome promete não apareceu antes do disparo`,
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    main.getByText(MARCA[idioma]).first(),
    `${nome}: a captura diz ser ${idioma} — o conteúdo tem de provar`,
  ).toBeVisible();
  await page.screenshot({ path: `${SAIDA}/${nome}.png`, fullPage: true });
}

interface Tela {
  readonly nome: string;
  readonly w: number;
  readonly h: number;
  readonly opts: Opcoes;
  readonly ancora: RegExp;
}

const TELAS: readonly Tela[] = [
  { nome: "01-desktop-v2-en", w: 1280, h: 1400, opts: {}, ancora: /Why trust this result/ },
  { nome: "02-desktop-v1-legado-en", w: 1280, h: 1400, opts: { doc: envelope(MASSA_A as Record<string, unknown>) }, ancora: /Why trust this result/ },
  // AQUI FICAVA `03-desktop-analytics-retido-en`, REMOVIDA na M45.6.
  //
  // Ela saía byte a byte idêntica a `01-desktop-v2-en`, e o gate de evidência da M45.6 acusou.
  // Tentei duas causas — a âncora era a MESMA da 01, e depois servir o `withheld` pelo endpoint
  // vivo que o Blueprint §4.6 declara como fonte da região, em vez do bloco do documento. As duas
  // continuaram produzindo a MESMA imagem, com a âncora do estado retido passando nas duas.
  //
  // Não sei explicar, e evidência que eu não sei explicar não vai para `docs/`. O estado fica
  // registrado como NÃO MEDIDO, com a pergunta aberta: por que a região Analytics de RES-01
  // renderiza igual com `component_status` `ready` e `withheld`.
  { nome: "04-desktop-sem-resultado-en", w: 1280, h: 900, opts: { recusa: 404 }, ancora: /No result is available/ },
  { nome: "05-desktop-fora-do-ar-en", w: 1280, h: 900, opts: { recusa: 503 }, ancora: /temporarily unavailable/ },
  { nome: "06-mobile-v2-en", w: 375, h: 1400, opts: {}, ancora: /Why trust this result/ },
  { nome: "07-desktop-v2-pt", w: 1280, h: 1400, opts: { idioma: "pt" }, ancora: /Por que confiar/ },
];

for (const tela of TELAS) {
  test(`captura ${tela.nome}`, async ({ page }) => {
    await page.setViewportSize({ width: tela.w, height: tela.h });
    await montar(page, tela.opts);
    await page.goto(`/analyses/${ANALISE}/result`);
    await capturar(page, tela.nome, tela.opts.idioma ?? "en", tela.ancora);
  });
}
