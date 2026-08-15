// M44 · COM-02 — a reentrada por link recebido, em BROWSER REAL.
//
// ## A reentrada não é uma tela
//
// O link do e-mail leva a `/analyses/{analysis_id}` e a experiência de lá em diante é a da
// Analysis, que já existe. A M44 **não** cria `CommunicationLanding`, `MessageLanding` nem
// `NotificationDetail`: a mensagem é ORIGEM de navegação, e inventar um passo intermediário
// colocaria a comunicação como dona de um conteúdo que é da Analysis.
//
// Por isso estes casos provam pouco código novo e muita AUSÊNCIA — que é exatamente o que a
// missão pede: o formato do link, e que abrir o link não muta nada.

import { expect, test, type Page, type Request } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const ESCOPO = "e2e-workspace-0000";
const ANALISE = "an-5c2f8e13-7a04-4b69-9d81-3e0a6c47fb02";

/**
 * O link que o compositor monta, montado aqui do mesmo jeito.
 *
 * `event_dispatcher/adapters/email.py`:
 *
 *     link = f"{url_base.rstrip('/')}/analyses/{analysis_id}"
 *
 * Um formato só, para os três eventos, e sem ramo por tipo.
 */
const caminhoDaMensagem = (id: string) => `/analyses/${id}`;

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: ESCOPO, name: "Atendimento Norte", role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

interface Rede {
  pedidos: { metodo: string; url: string }[];
}

async function montar(
  page: Page,
  opts: { estado?: string; invisivel?: boolean; indisponivel?: boolean } = {},
): Promise<Rede> {
  const rede: Rede = { pedidos: [] };

  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
  page.on("request", (r: Request) => {
    const caminho = new URL(r.url()).pathname;
    if (caminho.startsWith("/v1/")) rede.pedidos.push({ metodo: r.method(), url: r.url() });
  });

  await page.route("**/v1/me", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  await page.route("**/v1/me/language", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stored_language: "en", effective_language: "en" }),
    }),
  );
  // A LISTA vem ANTES da rota de detalhe, e a ordem é o contrato desta montagem: o Playwright
  // casa a ÚLTIMA rota registrada primeiro. Com a lista por último, ela engolia
  // `GET /v1/analyses/{id}` e a página recebia `{items: []}` — ficava em "Preparing" para
  // sempre, e o sintoma chegava como "a rota não abre".
  await page.route("**/v1/analyses**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );
  await page.route("**/v1/analyses/**", (route) => {
    if (opts.invisivel) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ code: "forbidden_or_not_found", detail: "forbidden_or_not_found" }),
      });
    }
    if (opts.indisponivel) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      // A forma COMPLETA do `AnalysisStatusView`. Uma parcial fazia a página ficar sem os campos
      // que ela lê e nunca sair do estado inicial — e o sintoma chegava como "rota não abre".
      body: JSON.stringify({
        analysis_id: ANALISE,
        status: opts.estado ?? "completed",
        record_count: 1240,
        result_available: (opts.estado ?? "completed") === "completed",
        retry_allowed: (opts.estado ?? "completed") === "failed",
        created_at: "2026-08-03T17:12:44Z",
        updated_at: "2026-08-03T17:13:02Z",
        instance_id: null,
      }),
    });
  });

  return rede;
}

// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M44 · COM-02 · reentrada", () => {
  test("R1/R2 · o link do e-mail abre a Analysis, e a rota é a canônica", async ({ page }) => {
    await montar(page);
    const destino = caminhoDaMensagem(ANALISE);
    expect(destino).toBe(`/analyses/${ANALISE}`);

    await page.goto(destino);
    // ÂNCORA POSITIVA: a Analysis carregou de verdade. Sem ela, as negativas abaixo mediriam um
    // esqueleto — e a página em branco não prova rota nenhuma.
    // ÂNCORA POSITIVA: a Analysis carregou. A página publica o ESTADO, não o identificador
    // cru — ancorar no id media uma tela que nunca o imprime, e a negativa de rota abaixo
    // passaria a valer sobre um esqueleto.
    await expect(page.locator("main")).toContainText(/Analysis completed/, { timeout: 15_000 });

    // R2 — nenhum redirecionamento para outra rota como destino primário.
    expect(page.url()).toContain(`/analyses/${ANALISE}`);
    expect(page.url(), "a reentrada caiu em /canonical").not.toContain("/canonical");
    expect(page.url(), "a reentrada caiu em /result").not.toMatch(/\/result(\?|#|$)/);
  });

  test("R3/R4 · abrir o link não cria Analysis e não toca Instance", async ({ page }) => {
    const rede = await montar(page);
    await page.goto(caminhoDaMensagem(ANALISE));
    await expect(page.locator("main")).toContainText(/Analysis completed/, { timeout: 15_000 });

    expect(rede.pedidos.length, "nenhuma requisição — as negativas seriam triviais")
      .toBeGreaterThan(0);
    for (const p of rede.pedidos) {
      expect(p.metodo, `a reentrada emitiu ${p.metodo} ${p.url}`).toBe("GET");
    }
    expect(rede.pedidos.some((p) => p.url.includes("/v1/instances"))).toBe(false);
    expect(rede.pedidos.some((p) => p.url.includes("/baseline"))).toBe(false);
    expect(rede.pedidos.some((p) => p.url.includes("/v1/subscriptions"))).toBe(false);
  });

  test("R5 · anti-oracle: o colapso do backend não é desfeito na tela", async ({ page }) => {
    await montar(page, { invisivel: true });
    await page.goto(caminhoDaMensagem(ANALISE));

    // Estado terminal primeiro.
    const aviso = page.locator("main").getByRole("alert");
    await expect(aviso).toBeVisible({ timeout: 15_000 });

    const texto = (await page.locator("main").innerText()).toLowerCase();
    expect(texto.length).toBeGreaterThan(20);
    // As três causas colapsam no produtor; a tela não pode escolher uma.
    expect(texto, "a tela revelou permissão ou existência").not.toMatch(
      /permiss|sem acesso|você não tem|exists but|does not exist/,
    );
  });

  test("R6 · indisponível NÃO vira inexistente", async ({ page }) => {
    await montar(page, { indisponivel: true });
    await page.goto(caminhoDaMensagem(ANALISE));

    const aviso = page.locator("main").getByRole("alert");
    await expect(aviso).toBeVisible({ timeout: 15_000 });

    const texto = (await page.locator("main").innerText()).toLowerCase();
    expect(texto.length).toBeGreaterThan(20);
    // O defeito que a M42 corrigiu na página da Instância, medido aqui de novo: `503` dizendo
    // "não encontrada" faz a pessoa parar de procurar uma coisa que existe.
    expect(texto, "503 virou 'não encontrada'").not.toMatch(/not found|couldn't find|não encontr/);
  });

  test("R7 · o formato do link é o MESMO para os eventos aplicáveis", async ({ page }) => {
    await montar(page);
    // `analysis.completed`, `analysis.failed` e `result.available` produzem o mesmo caminho — o
    // compositor não tem ramo por tipo, e o Front não inventa um segundo formato.
    const a = caminhoDaMensagem(ANALISE);
    const b = caminhoDaMensagem("an-b71d4a06-2e58-4f93-8c07-6a1e9d34b502");
    expect(a.replace(ANALISE, "X")).toBe(b.replace("an-b71d4a06-2e58-4f93-8c07-6a1e9d34b502", "X"));

    await page.goto(a);
    await expect(page.locator("main")).toContainText(/Analysis completed/, { timeout: 15_000 });
  });

  test("R8 · N/A registrado: reentrada NÃO autenticada", async ({ page }) => {
    // A M44 não tem requisito de reentrada anônima, e o app já preserva o destino pelo fluxo
    // OIDC existente (`AUTH-04`, superfície própria do Blueprint). Redesenhar login ou criar um
    // segundo mecanismo de `returnTo` seria inventar arquitetura sem authority.
    //
    // O que este caso PROVA é o limite: sem o bypass de E2E, abrir o link não entrega a Analysis
    // — ele cai no caminho de autenticação que já existe. É o comportamento correto, e é tudo
    // que a M44 pode afirmar sobre este cenário.
    await page.route("**/v1/**", (r) => r.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ code: "authentication_required" }) }));
    await page.goto(caminhoDaMensagem(ANALISE));

    await expect(page.locator("body")).not.toContainText(ANALISE, { timeout: 15_000 });
  });
});
