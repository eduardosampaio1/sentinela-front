// M42 · CFG-03 — a configuração do espaço de trabalho em BROWSER REAL.
//
// O que só o browser prova, e o vitest não alcança:
//
// - que a claim **não vence** o produtor quando as duas respondem `200` e divergem — e que a tela
//   continua no valor do produtor **depois** do rename, com a claim ainda velha (o token não é
//   reescrito, e esse é o caso que a separação entre autorização e estado de produto cria);
// - que o `PATCH` sai **uma vez**, contra o caminho certo, e que nenhum `POST`/`DELETE` de
//   Workspace existe em lugar nenhum da tela;
// - que um `refresh` real recupera o nome do **servidor**, e não de memória local;
// - que `503` do produtor não vira nome confirmado e não derruba as seções vizinhas;
// - foco, teclado, viewport e axe, que jsdom não computa.

import { expect, test, type Page, type Request } from "@playwright/test";

// Bloqueia service worker pela MESMA razão registrada no spec da M41: um worker responde antes da
// camada que o Playwright intercepta, `page.route` nunca dispara, e o sintoma chega como
// "elemento não encontrado" — que parece defeito de UI e é a rede fora de controle.
test.use({ serviceWorkers: "block" });

const ROTA = "/dashboard/settings";
const WS_ID = "ws-8f3a1c47-6b20-4e11-9d05-2a7c8e4f1b63";

/** O nome que a CLAIM carrega. Desatualizado de propósito. */
const NOME_NA_CLAIM = "Suporte Regional";
/** O nome que o PRODUTOR carrega. É o canônico. */
const NOME_DO_PRODUTOR = "Atendimento Norte";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: WS_ID, name: NOME_NA_CLAIM, role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

interface Rede {
  pedidos: { metodo: string; url: string; corpo: string | null }[];
  de: (metodo: string, fragmento: string) => number;
}

async function montar(
  page: Page,
  opts: { indisponivel?: boolean; falharEscrita?: boolean; invisivel?: boolean } = {},
): Promise<Rede> {
  const rede: Rede = {
    pedidos: [],
    de: (metodo, fragmento) =>
      rede.pedidos.filter((p) => p.metodo === metodo && p.url.includes(fragmento)).length,
  };
  // O nome VIVE no handler: é ele que faz o `PATCH` ser observável por uma leitura posterior.
  let nome = NOME_DO_PRODUTOR;

  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });

  page.on("request", (r: Request) => {
    if (!r.url().includes("/v1/")) return;
    rede.pedidos.push({ metodo: r.method(), url: r.url(), corpo: r.postData() });
  });

  // A claim responde SEMPRE 200, inclusive quando o produtor está fora. É essa convivência que
  // torna o cenário perigoso: há um nome disponível na tela, e ele é o errado.
  await page.route("**/v1/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  await page.route("**/v1/me/language", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ stored_language: null, effective_language: "en" }),
    }),
  );

  await page.route("**/v1/workspaces/**", async (route) => {
    const pedido = route.request();
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
    if (pedido.method() === "PATCH") {
      if (opts.falharEscrita) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
        });
      }
      const corpo = JSON.parse(pedido.postData() ?? "{}") as { name?: string };
      if (corpo.name) nome = corpo.name;
    }
    // A resposta é a LINHA persistida: `workspace_id` sai do estado do handler, nunca do caminho.
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        workspace_id: WS_ID,
        name: nome,
        created_at: "2026-03-11T08:42:00Z",
      }),
    });
  });

  return rede;
}

const campo = (page: Page) => page.getByLabel(/^Name$|^Nome$/);
const salvar = (page: Page) => page.getByRole("button", { name: /^Save name$|^Salvar nome$/ });

// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M42 · CFG-03 no browser", () => {
  test("A/B · o nome vem do produtor, e a claim desatualizada NÃO vence", async ({ page }) => {
    const rede = await montar(page);
    await page.goto(ROTA);

    await expect(campo(page)).toHaveValue(NOME_DO_PRODUTOR);
    // A claim está na página (é ela que lista o espaço na identidade), e mesmo assim o campo de
    // configuração não a usa. É a prova de que a divergência não colapsa.
    expect(await page.getByText(NOME_NA_CLAIM).count()).toBeGreaterThan(0);
    expect(rede.de("GET", "/v1/workspaces/")).toBe(1);
  });

  test("C/D · rename: UM PATCH, identidade preservada, e a claim velha não volta", async ({ page }) => {
    const rede = await montar(page);
    await page.goto(ROTA);
    await expect(campo(page)).toHaveValue(NOME_DO_PRODUTOR);

    await campo(page).fill("Atendimento Nacional");
    await salvar(page).click();
    await expect(page.getByText(/Workspace name saved|Nome do espaço salvo/)).toBeVisible();

    expect(rede.de("PATCH", "/v1/workspaces/")).toBe(1);
    expect(rede.de("POST", "/v1/workspaces")).toBe(0);
    expect(rede.de("DELETE", "/v1/workspaces")).toBe(0);

    // D — a claim continua dizendo "Suporte Regional", porque o token não é reescrito. A tela NÃO
    // pode voltar para ela depois da escrita.
    await expect(campo(page)).toHaveValue("Atendimento Nacional");
    await expect(page.getByText(WS_ID)).toBeVisible();
  });

  test("E · refresh recupera do SERVIDOR, não de memória local", async ({ page }) => {
    await montar(page);
    await page.goto(ROTA);
    await campo(page).fill("Nome Persistido");
    await salvar(page).click();
    await expect(page.getByText(/Workspace name saved|Nome do espaço salvo/)).toBeVisible();

    await page.reload();
    await expect(campo(page)).toHaveValue("Nome Persistido");
  });

  test("F · 503 do produtor não vira nome confirmado, e não derruba a página", async ({ page }) => {
    await montar(page, { indisponivel: true });
    await page.goto(ROTA);

    await expect(
      page.getByText(/Workspace settings are unavailable|configurações do espaço estão indisponíveis/),
    ).toBeVisible();
    // Nenhum campo editável: não há valor confirmado para editar. E o nome da claim não aparece
    // como valor de campo em lugar nenhum.
    await expect(campo(page)).toHaveCount(0);
    expect(await page.locator(`input[value="${NOME_NA_CLAIM}"]`).count()).toBe(0);

    // O resto da página continua utilizável — a seção de idioma é de outro dono.
    await expect(page.getByRole("radio", { name: /English/ })).toBeVisible();
  });

  test("G · invisível respeita o anti-oracle na copy", async ({ page }) => {
    await montar(page, { invisivel: true });
    await page.goto(ROTA);

    const secao = page.getByText(/Workspace settings are unavailable|configurações do espaço estão indisponíveis/);
    await expect(secao).toBeVisible();
    // A copy NÃO afirma "você não tem permissão" nem "não existe": o produtor colapsa os três
    // motivos de propósito, e revelá-los seria a tela virando oráculo de existência.
    const texto = (await page.locator("main").innerText()).toLowerCase();
    expect(texto).not.toMatch(/permiss|não existe|does not exist|not found|forbidden/);
  });

  test("H/I · nenhuma ação de criar ou excluir espaço, nem desabilitada", async ({ page }) => {
    await montar(page);
    await page.goto(ROTA);
    await expect(campo(page)).toHaveValue(NOME_DO_PRODUTOR);

    const main = page.locator("main");
    await expect(main.getByRole("button", { name: /create|criar|new workspace|novo espa/i })).toHaveCount(0);
    await expect(main.getByRole("button", { name: /delete|excluir|remover/i })).toHaveCount(0);
    await expect(main.getByRole("button", { name: /member|membro|invite|convite/i })).toHaveCount(0);
    expect((await main.innerText()).toLowerCase()).not.toMatch(/coming soon|em breve/);
  });

  test("write failure NÃO aparece como salvo, e o rascunho fica", async ({ page }) => {
    await montar(page, { falharEscrita: true });
    await page.goto(ROTA);
    await campo(page).fill("Nome Que Falha");
    await salvar(page).click();

    await expect(page.getByText(/could not save the workspace name|salvar o nome do espaço/i)).toBeVisible();
    await expect(page.getByText(/Workspace name saved|Nome do espaço salvo/)).toHaveCount(0);
    await expect(campo(page)).toHaveValue("Nome Que Falha");
  });

  test("Q · teclado: chega ao campo e ao botão, e salva sem mouse", async ({ page }) => {
    const rede = await montar(page);
    await page.goto(ROTA);
    await expect(campo(page)).toHaveValue(NOME_DO_PRODUTOR);

    await campo(page).focus();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("Pelo Teclado");
    await page.keyboard.press("Tab");
    await expect(salvar(page)).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.getByText(/Workspace name saved|Nome do espaço salvo/)).toBeVisible();
    expect(rede.de("PATCH", "/v1/workspaces/")).toBe(1);
  });

  for (const vp of [
    { nome: "desktop", width: 1280, height: 800 },
    { nome: "tablet", width: 768, height: 1024 },
    { nome: "mobile", width: 375, height: 812 },
  ] as const) {
    test(`S/T · ${vp.nome}: sem overflow horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await montar(page);
      await page.goto(ROTA);
      await expect(campo(page)).toHaveValue(NOME_DO_PRODUTOR);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${vp.nome} tem rolagem horizontal`).toBeLessThanOrEqual(0);
    });
  }
});
