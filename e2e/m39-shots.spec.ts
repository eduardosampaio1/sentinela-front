// As capturas da comparação A×B (M39 · EVO-02).
//
// ## M45.4 · este arquivo também não tinha asserção nenhuma
//
// Mesma dívida de `shots.spec.ts`, e aqui ela cobrou caro: as três imagens `m39-sem-v3-*`
// documentavam, sob esse nome, o erro GENÉRICO — *"não conseguimos carregar uma das análises
// agora. Tente de novo."* — e não o estado "um lado não tem documento ARGOS". A tela realmente
// caía no erro genérico quando o produtor respondia `404 result_not_available`, e nada denunciava,
// porque um arquivo sem asserção não pode falhar. A correção está em `CompareAnalysesPage`.
//
// E `m39-selecao` fotografava uma lista VAZIA: nenhum item, nenhum modo de seleção, nada para
// selecionar. Uma captura chamada "seleção" que não mostra seleção documenta o contrário do que
// promete. Agora a lista é servida com massa e o modo é ABERTO antes do disparo.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const AQUI = dirname(fileURLToPath(import.meta.url));
const MASSA = JSON.parse(readFileSync(resolve(AQUI, "../src/test/fixtures/canonical-result/v3-comparacao.json"), "utf-8"));
const SAIDA = resolve(AQUI, "../docs/two-view");
const A = "an-cmp-a", B = "an-cmp-b";

async function semear(page: Page, quebra: boolean, semV3 = false) {
  await page.addInitScript(([a, b, dA, dB, faltando]) => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    sessionStorage.setItem("__sentinela_journey__", JSON.stringify({
      [a as string]: { seq: ["completed"], idx: 0, retryAllowed: false },
      [b as string]: { seq: ["completed"], idx: 0, retryAllowed: false },
    }));
    const docs: Record<string, unknown> = { [a as string]: dA };
    if (!faltando) docs[b as string] = dB;
    sessionStorage.setItem("__sentinela_result_v3__", JSON.stringify(docs));
  }, [A, B, MASSA.A, quebra ? MASSA.B_QUEBRA : MASSA.B, semV3] as const);
}

/** Prova o estado terminal e o idioma antes de disparar. Ver o cabeçalho de `shots.spec.ts`. */
async function capturar(page: Page, nome: string, ancora: RegExp, marca: RegExp) {
  const main = page.locator("main");
  await expect(
    main.getByText(ancora).first(),
    `${nome}: o estado que o nome promete não apareceu antes do disparo`,
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    main.getByText(marca).first(),
    `${nome}: a captura diz ser inglês — o conteúdo tem de provar`,
  ).toBeVisible();
  await page.screenshot({ path: `${SAIDA}/${nome}.png`, fullPage: true });
}

const TELAS = [
  // A marca é uma frase do CORPO, não o título da seção: o cabeçalho renderiza "Indicators", e
  // não a chave inteira `Indicators side by side` — uma marca escolhida do dicionário em vez da
  // tela reprovaria as três capturas por texto que nunca esteve lá.
  ["m39-comparacao", false, false, /Health dimensions/i, /Cost per useful outcome/i],
  ["m39-quebra-documental", true, false, /These analyses are not comparable/i, /measurement vocabulary changed/i],
  // A âncora que estava faltando o tempo todo. Se a página voltar a diagnosticar isto como falha
  // recuperável, esta captura fica vermelha em vez de publicar a tela errada em silêncio.
  ["m39-sem-v3", false, true, /One side has no ARGOS document/i, /historical result is still available/i],
] as const;

for (const [nome, quebra, semV3, ancora, marca] of TELAS) {
  for (const [vp, w, h] of [["desktop", 1280, 800], ["tablet", 768, 1024], ["mobile", 375, 812]] as const) {
    test(`${nome} @ ${vp}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await semear(page, quebra, semV3);
      await page.goto(`/analyses/compare/${A}/${B}`);
      await capturar(page, `${nome}-${vp}`, ancora, marca);
    });
  }
}

/** Duas análises concluídas — sem elas não há o que selecionar, e a captura não documenta nada. */
const ITENS = [
  { analysis_id: A, status: "completed", record_count: 100, result_available: true, created_at: "2026-08-02T10:00:00Z", updated_at: "2026-08-02T10:04:00Z", instance_id: null },
  { analysis_id: B, status: "completed", record_count: 240, result_available: true, created_at: "2026-08-05T14:30:00Z", updated_at: "2026-08-05T14:36:00Z", instance_id: null },
];

// O bloqueio do service worker é ESCOPADO a este bloco, e não vale para o arquivo.
//
// As capturas de comparação acima dependem do MSW do dev, que lê a massa que `semear` deixa em
// `sessionStorage`; bloquear o worker no topo do arquivo as quebraria todas. Aqui é o inverso: a
// lista precisa vir de `page.route`, e sem bloquear o worker o MSW responde primeiro — foi o que
// deixou este teste esperando 30s por um botão que a lista vazia nunca desenha.
test.describe("m39-selecao", () => {
  test.use({ serviceWorkers: "block" });

for (const [vp, w, h] of [["desktop", 1280, 800], ["mobile", 375, 812]] as const) {
  test(`m39-selecao @ ${vp}`, async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true; });
    await page.route("**/v1/analyses**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: ITENS, next_cursor: null }) }),
    );
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/analyses");

    // O modo de seleção é ABERTO: fotografar a lista em repouso documentaria a lista, não a
    // seleção. O botão só existe porque há itens — clicar antes de a massa chegar falharia aqui,
    // que é exatamente onde deve falhar.
    await page.getByRole("button", { name: /^Compare$/ }).click();
    const caixas = page.locator('input[type="checkbox"]');
    await expect(caixas, "sem caixas não há seleção para fotografar").toHaveCount(ITENS.length);
    await caixas.nth(0).check();
    await caixas.nth(1).check();

    // A seleção completa é afirmada nas PRÓPRIAS caixas, e não lendo o contador `2 of 2 selected`.
    // No mobile aquele contador vai para o menu secundário e não está na tela — ancorar nele
    // reprovava a captura mobile por onde o layout guarda o texto, não por estado errado.
    await expect(caixas.nth(0)).toBeChecked();
    await expect(caixas.nth(1)).toBeChecked();

    // A dica só existe com o modo de seleção ABERTO, e renderiza nas duas larguras: é ela que
    // distingue esta captura de uma foto da lista em repouso.
    await capturar(page, `m39-selecao-${vp}`, /Pick exactly two analyses/i, /Your analyses/i);
  });
}
});
