// Provas de storage em BROWSER REAL — o resultado não é gravado, e o refresh reconsulta.
//
// Preparação local do Big Bang. Nada aqui ativa nada.
//
// ## A distinção que este arquivo precisa fazer
//
// O harness E2E semeia o estado do MSW no próprio `sessionStorage` (`__sentinela_journey__`,
// `__sentinela_result__`, `__sentinela_no_result__`). Essas chaves são escritas pelo TESTE, via
// `addInitScript`, antes de a aplicação existir — o servidor falso mora no navegador, e é onde
// ele guarda o que vai responder.
//
// Um assert de "storage vazio" aqui seria falso por construção. A pergunta certa é outra: a
// APLICAÇÃO acrescenta alguma chave sua? E o conteúdo do cliente aparece em alguma chave que
// não seja a do servidor falso?
//
// A prova mais limpa (storage literalmente sem nada além de preferências) está na suíte de
// unidade, onde não há servidor falso morando no navegador.

import { expect, test, type Page } from "@playwright/test";
import { MASSA_A } from "../src/test/fixtures/canonical-result/massas";

/** Chaves do SERVIDOR FALSO — escritas pelo harness, nunca pela aplicação. */
const CHAVES_DO_HARNESS = ["__sentinela_journey__", "__sentinela_result__", "__sentinela_no_result__"];

/** Chaves que a aplicação pode legitimamente manter (nenhuma carrega dado do cliente). */
const CHAVES_PERMITIDAS = ["sentinela:language", "sentinela:history:", "__chunk_reload__"];

const MARCADOR = "zzq-e2e-marcador-9d4c2f";

const MASSA_MARCADA = {
  ...MASSA_A,
  analysis_id: "an-store",
  recommendations: [{ id: "rec-e2e", title: MARCADOR, detail: `contato ${MARCADOR}@exemplo-invalido.test` }],
};

async function semear(page: Page, id: string, payload: unknown) {
  await page.addInitScript(
    ([analysisId, corpo]) => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
      sessionStorage.setItem(
        "__sentinela_journey__",
        JSON.stringify({ [analysisId as string]: { seq: ["completed"], idx: 0, retryAllowed: false } }),
      );
      sessionStorage.setItem("__sentinela_result__", JSON.stringify({ [analysisId as string]: corpo }));
    },
    [id, payload] as const,
  );
}

/** Despejo dos dois storages do navegador real. */
async function despejo(page: Page) {
  return page.evaluate(() => {
    const ler = (s: Storage) => {
      const fora: Record<string, string> = {};
      for (let i = 0; i < s.length; i += 1) {
        const k = s.key(i);
        if (k !== null) fora[k] = s.getItem(k) ?? "";
      }
      return fora;
    };
    return { session: ler(sessionStorage), local: ler(localStorage) };
  });
}

test.describe("storage do navegador — o resultado não fica na máquina", () => {
  test("a aplicação não cria chave nenhuma para o resultado", async ({ page }) => {
    await semear(page, "an-store", MASSA_MARCADA);
    await page.goto("/canonical/analyses/an-store/result");
    await expect(page.getByRole("heading", { name: "Analysis result", level: 1 })).toBeVisible();

    const { session, local } = await despejo(page);
    const todas = [...Object.keys(session), ...Object.keys(local)];

    // O harness precisa estar presente — senão a página renderizou por outro caminho e o
    // resto do teste mede outra coisa.
    expect(todas).toContain("__sentinela_result__");

    const naoJustificadas = todas.filter(
      (k) => !CHAVES_DO_HARNESS.includes(k) && !CHAVES_PERMITIDAS.some((p) => k.startsWith(p)),
    );
    expect(naoJustificadas, `a aplicação criou chaves: ${naoJustificadas.join(", ")}`).toEqual([]);
  });

  test("o marcador do cliente só existe na chave do servidor falso", async ({ page }) => {
    await semear(page, "an-store", MASSA_MARCADA);
    await page.goto("/canonical/analyses/an-store/result");
    await expect(page.getByRole("heading", { name: "Analysis result", level: 1 })).toBeVisible();

    const { session, local } = await despejo(page);
    const comMarcador = [...Object.entries(session), ...Object.entries(local)]
      .filter(([, v]) => v.includes(MARCADOR))
      .map(([k]) => k);

    // Presente na chave do harness (é ela que serve a resposta) e em NENHUMA outra.
    expect(comMarcador).toEqual(["__sentinela_result__"]);
  });

  test("refresh mantém o resultado — e continua sem gravar nada", async ({ page }) => {
    await semear(page, "an-store", MASSA_MARCADA);
    await page.goto("/canonical/analyses/an-store/result");
    await expect(page.getByRole("heading", { name: "Analysis result", level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Analysis result", level: 1 })).toBeVisible();

    const { session, local } = await despejo(page);
    const todas = [...Object.keys(session), ...Object.keys(local)];
    const naoJustificadas = todas.filter(
      (k) => !CHAVES_DO_HARNESS.includes(k) && !CHAVES_PERMITIDAS.some((p) => k.startsWith(p)),
    );
    expect(naoJustificadas).toEqual([]);
  });

  test("as chaves legadas do cache são apagadas no arranque", async ({ page }) => {
    // Semeia a forma EXATA que a versão anterior deixava na máquina de quem usou o app.
    await page.addInitScript(() => {
      sessionStorage.setItem("sentinela:analysis:antigo", '{"consistency_score":99}');
      sessionStorage.setItem("sentinela:last_cache_key:ws-1:none:none", "sentinela:analysis:antigo");
      localStorage.setItem("sentinela:analysis:tambem-antigo", '{"alerts":[]}');
      // Estado legítimo, na mesma leva: precisa SOBREVIVER.
      localStorage.setItem("terceiro:preserve", "ok");
    });
    await semear(page, "an-store", MASSA_MARCADA);
    await page.goto("/canonical/analyses/an-store/result");
    await expect(page.getByRole("heading", { name: "Analysis result", level: 1 })).toBeVisible();

    const { session, local } = await despejo(page);
    expect(session["sentinela:analysis:antigo"]).toBeUndefined();
    expect(session["sentinela:last_cache_key:ws-1:none:none"]).toBeUndefined();
    expect(local["sentinela:analysis:tambem-antigo"]).toBeUndefined();
    // A limpeza é cirúrgica: `clear()` levaria isto junto e passaria nas linhas acima.
    expect(local["terceiro:preserve"]).toBe("ok");
  });
});

test.describe("as outras portas de persistência do navegador", () => {
  test("nem IndexedDB, nem Cache API, nem cookie, nem service worker, nem a URL", async ({ page }) => {
    // O despejo dos dois storages é só uma das portas. O objetivo proíbe as outras pelo nome,
    // e uma prova que só olha `sessionStorage` deixaria a proibição sem verificação em browser
    // real — que é onde IndexedDB e Cache API de fato existem.
    await semear(page, "an-store", MASSA_MARCADA);
    await page.goto("/canonical/analyses/an-store/result");
    await expect(page.getByRole("heading", { name: "Analysis result", level: 1 })).toBeVisible();

    const portas = await page.evaluate(async () => {
      const bancos = typeof indexedDB.databases === "function" ? await indexedDB.databases() : [];
      const caches_ = typeof caches !== "undefined" ? await caches.keys() : [];
      const sws = navigator.serviceWorker
        ? (await navigator.serviceWorker.getRegistrations()).map((r) => r.scope)
        : [];
      return {
        indexedDB: bancos.map((b) => b.name ?? "").filter(Boolean),
        cacheApi: caches_,
        cookie: document.cookie,
        url: location.href,
        serviceWorkers: sws,
        scriptsDeSw: navigator.serviceWorker
          ? (await navigator.serviceWorker.getRegistrations())
              .map((r) => r.active?.scriptURL ?? r.installing?.scriptURL ?? "")
              .filter(Boolean)
          : [],
      };
    });

    expect(portas.indexedDB, "a aplicação criou banco IndexedDB").toEqual([]);
    expect(portas.cacheApi, "a aplicação criou Cache API").toEqual([]);
    expect(portas.cookie, "a aplicação gravou cookie").toBe("");

    // Service worker: o ÚNICO permitido é o do MSW, que é o servidor falso deste harness.
    // Não dá para exigir zero — o próprio E2E depende dele. Dá para exigir que não haja
    // NENHUM outro, que é a pergunta real: a aplicação registrou um worker seu para guardar
    // resposta?
    const forasteiros = portas.scriptsDeSw.filter((u) => !u.includes("mockServiceWorker"));
    expect(forasteiros, `service worker não-MSW registrado: ${forasteiros.join(", ")}`).toEqual([]);

    // A URL carrega o `analysis_id` (persistível e NÃO sensível) e nada mais: sem query, sem
    // hash, e sem nenhum marcador do cliente. O endereço público perdeu o prefixo `/canonical`
    // em `f182e4b` (M24) — a navegação acima entra pelo antigo e termina no novo.
    expect(portas.url).toContain("/analyses/an-store/result");
    expect(portas.url).not.toContain("?");
    expect(portas.url).not.toContain("#");
    expect(portas.url).not.toContain(MARCADOR);
  });
});
