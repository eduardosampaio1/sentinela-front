// E5 — resultado em browser real (Onda 6 E5, item 17). O documento é semeado no MSW worker
// (sessionStorage) e chega pelo GET público; o validator/adapter decidem a renderização.
//
// As massas vêm de `src/test/fixtures/canonical-result/massas.ts` — as MESMAS que a suíte de
// unidade usa. Até a Onda 8 este arquivo carregava cópias locais do perfil PROVISÓRIO, que o
// frontend abandonou quando migrou para `analysis-result-v1` (integração do Assembler). O
// validator recusava, corretamente, um schema que ele não conhece — e o spec ficou vermelho sem
// ninguém rodar. Duplicar a massa foi o que permitiu as duas verdades divergirem; importar a
// fonte única é o que impede a divergência de voltar.
//
// Isolamento por workspace é provado no nível de componente/adapter (a fixture E2E injeta um
// workspace único); aqui a prova é: só /v1, deep link, refresh, indisponível, incompatível, parcial.

import { expect, test, type Page } from "@playwright/test";
import { MASSA_A, MASSA_D_PARCIAL } from "../src/test/fixtures/canonical-result/massas";

async function semear(page: Page, id: string, payload: unknown, resultAvailable = true) {
  await page.addInitScript(
    ([analysisId, corpo, disponivel]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      if (!sessionStorage.getItem("__sentinela_journey__")) {
        sessionStorage.setItem(
          "__sentinela_journey__",
          JSON.stringify({ [analysisId as string]: { seq: ["completed"], idx: 0, retryAllowed: false } }),
        );
      }
      if (!sessionStorage.getItem("__sentinela_result__")) {
        sessionStorage.setItem("__sentinela_result__", JSON.stringify({ [analysisId as string]: corpo }));
      }
      if (!disponivel) sessionStorage.setItem("__sentinela_no_result__", "1");
    },
    [id, payload, resultAvailable] as const,
  );
}

test.describe("E5 — resultado canônico (browser real)", () => {
  test("feliz: valores canônicos renderizados; só /v1; sem chamada legada", async ({ page, baseURL }) => {
    let legado = 0;
    let v1 = 0;
    page.on("request", (req) => {
      const u = new URL(req.url());
      if (baseURL && u.origin === new URL(baseURL).origin) {
        if (/^\/(api|rest|graphql|auth)\//.test(u.pathname)) legado += 1;
        if (u.pathname.startsWith("/v1/")) v1 += 1;
      }
    });
    await semear(page, "an-res", MASSA_A);
    await page.goto("/canonical/analyses/an-res/result");

    await expect(page.getByRole("heading", { name: "Analysis result", level: 1 })).toBeVisible();
    // cobertura 0.85 → 85% (nunca 8.500%)
    const cobertura = page.locator("li", { hasText: "Intent coverage" });
    await expect(cobertura).toContainText("85");
    await expect(cobertura).toContainText("%");
    await expect(cobertura).not.toContainText("8,500");
    // contagem e contagem, sem "%" -- o par do caso acima. Se a unidade viesse do rotulo em
    // vez do documento, os dois passariam (ou falhariam) juntos.
    // Âncora no INÍCIO do texto do card: "Conversations" também aparece no meio da
    // descrição de outros indicadores ("Share of ... analyzed conversations"), e um `hasText`
    // solto casava quatro cards.
    const contagem = page.locator("li", { hasText: /^Conversations/ });
    await expect(contagem).toContainText("100");
    await expect(contagem, "contagem não é formatada como taxa").not.toContainText("100%");
    // `token_waste_absolute` ("Wasted records") NAO e mais asserido: ele saiu do registro
    // canonico porque nao tinha produtor -- o numero vinha de um proxy int(round(avg_tokens)),
    // anotado como tal no proprio codigo analitico. Manter a assercao exigiria manter o
    // rotulo, e rotulo sem produtor e numero inventado com cara de medicao.
    // Ver src/features/canonical-analysis/result/descriptors.ts.
    // O "porquê" do número, visível ao lado dele. Aqui havia a asserção da marca "Provisional
    // presentation profile", que o app parou de mostrar quando o perfil provisório saiu — hoje a
    // string não existe em `src/`. Trocá-la por nada deixaria o caso sem a prova de honestidade
    // que ele carregava; a descrição do indicador é o equivalente canônico, e é ela que impede um
    // número aparecer sem dizer de onde veio.
    await expect(contagem).toContainText("It is the denominator of the rates above.");

    expect(legado, "sem chamada legada").toBe(0);
    expect(v1, "consumiu o Gateway /v1").toBeGreaterThan(0);
    await expect(page.getByRole("progressbar")).toHaveCount(0);
  });

  test("refresh: reload reconstrói por workspace + analysis_id (da URL)", async ({ page }) => {
    await semear(page, "an-res", MASSA_A);
    await page.goto("/canonical/analyses/an-res/result");
    await expect(page.getByText("Useful rate")).toBeVisible();

    await page.reload();
    await expect(page.getByTestId("canonical-result-page")).toBeVisible();
    await expect(page.getByText("Useful rate")).toBeVisible();
    await expect(page.locator("li", { hasText: "Intent coverage" })).toContainText("85");
  });

  test("schema incompatível: mensagem segura, sem interpretar e sem JSON cru", async ({ page }) => {
    await semear(page, "an-inc", { schema: "outro-schema-v9", indicators: [] });
    await page.goto("/canonical/analyses/an-inc/result");
    await expect(page.getByRole("alert")).toContainText(/doesn't support yet/i);
    await expect(page.getByText("Indicators")).toHaveCount(0);
    await expect(page.getByText(/outro-schema-v9/)).toHaveCount(0);
    // há 2 saídas para o histórico (cabeçalho + estado de incompatibilidade): ambas válidas
    await expect(page.getByRole("link", { name: "Back to history" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to history" })).toHaveCount(2);
  });

  test("parcial: seção suportada renderiza e a parcialidade é sinalizada", async ({ page }) => {
    await semear(page, "an-parc", MASSA_D_PARCIAL);
    await page.goto("/canonical/analyses/an-parc/result");
    await expect(page.getByText("Useful rate")).toBeVisible();
    await expect(page.getByText(/Some sections aren't available/i)).toBeVisible();
  });

  for (const vp of [
    { nome: "desktop", width: 1280, height: 800 },
    { nome: "mobile", width: 375, height: 812 },
  ] as const) {
    test(`responsivo (${vp.nome}): resultado sem overflow horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await semear(page, "an-res", MASSA_A);
      await page.goto("/canonical/analyses/an-res/result");
      await expect(page.getByText("Useful rate")).toBeVisible();
      const excesso = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(excesso).toBeLessThanOrEqual(1);
    });
  }
});
