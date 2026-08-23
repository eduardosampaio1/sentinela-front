// A LARGURA da barra e proporcional ao valor — provado por medida, nao por olhar a captura.
//
// A captura de Medidas mostrou `web 60` com barra curta e `app 30` com barra longa. Era artefato
// da animacao de revelacao, e nenhuma asercao existente pegaria: todas leem TEXTO, e o texto
// estava certo. Uma imagem pode mentir sobre o dado sem que uma unica frase da tela minta.
//
// Este caso le a largura que o componente escreveu e compara as duas. Ele falharia se a ordem
// das larguras se invertesse de verdade — que e a unica coisa que a captura sugeriu.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { vistaAnalytics } from "../src/test/fixtures/canonical-result/analyticsSnapshot";

const AQUI = dirname(fileURLToPath(import.meta.url));
const DOC = () =>
  JSON.parse(readFileSync(resolve(AQUI, "../src/test/fixtures/canonical-result/argos-v3-homol.json"), "utf-8"));

async function semear(page: Page, id: string) {
  await page.addInitScript(([i, d, a]) => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    sessionStorage.setItem(
      "__sentinela_journey__",
      JSON.stringify({ [i as string]: { seq: ["completed"], idx: 0, retryAllowed: false } }),
    );
    sessionStorage.setItem("__sentinela_result_v3__", JSON.stringify({ [i as string]: d }));
    sessionStorage.setItem("__sentinela_analytics__", JSON.stringify({ [i as string]: a }));
  }, [id, DOC(), vistaAnalytics(id)] as const);
}

test("a barra maior pertence ao valor maior", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await semear(page, "an-larg");
  await page.goto("/analyses/an-larg/analytics");

  // A massa publica `web: 60` e `app: 30` na distribuicao `canal`.
  const linhas = page.locator(".grupos li").filter({ hasText: /web|app/ });
  await expect(linhas.first()).toBeVisible({ timeout: 15_000 });

  const largura = async (rotulo: string) => {
    const li = page.locator(".grupos li").filter({ hasText: rotulo }).first();
    const preenchida = li.locator(".barra-g > *").first();
    const caixa = await preenchida.boundingBox();
    expect(caixa, `barra de ${rotulo} nao foi encontrada`).not.toBeNull();
    return caixa!.width;
  };

  const web = await largura("web");
  const app = await largura("app");
  // 60 contra 30: a de web tem de ser MAIOR, e com folga — nao apenas diferente.
  expect(web, `web=60 deveria desenhar mais largo que app=30 (web ${web}, app ${app})`)
    .toBeGreaterThan(app * 1.5);
});
