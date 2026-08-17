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

/**
 * O id do espaço ATIVO da sessão, semeado pelo bypass de E2E (`src/e2e/bypass.ts`).
 *
 * A claim precisa apontar para ESTE id, e não para o `workspace_id` que o produtor devolve. Em
 * produção claim e escopo falam do mesmo espaço; deixá-los divergentes aqui faria a reconciliação
 * da lista "You can open" nunca casar — e o gate passaria de verde sem medir nada.
 */
const ESCOPO_ATIVO = "e2e-workspace-0000";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: ESCOPO_ATIVO, name: NOME_NA_CLAIM, role: "owner" }],
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

/**
 * O bloco de escopo da lateral — o rótulo "Active workspace" e o nome logo abaixo.
 *
 * Ancorado no RÓTULO e subindo um nível, e não numa classe: classe utilitária muda com o desenho
 * e o gate viraria falso-verde por seletor que não casa mais.
 */
const lateral = (page: Page) => page.getByText(/^Active workspace$|^Espaço ativo$/i).locator("..");

/**
 * O nome que o BYPASS de E2E semeia na sessão (`src/e2e/bypass.ts`). Ele é a projeção de
 * bootstrap deste ambiente: chega antes de qualquer rede, exatamente como a claim faz em
 * produção. É o "A" dos cenários — o nome que NÃO pode vencer o produtor.
 */
const NOME_DE_BOOTSTRAP = "E2E Workspace";

// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M42 · CFG-03 no browser", () => {
  test("A/B · o nome vem do produtor, e a claim desatualizada NÃO vence", async ({ page }) => {
    const rede = await montar(page);
    await page.goto(ROTA);

    await expect(campo(page)).toHaveValue(NOME_DO_PRODUTOR);

    // A claim FOI servida, e com o nome velho — a divergência existe de verdade nesta sessão.
    // Até a microcorreção, a prova era que o nome velho aparecia em algum lugar da página; agora
    // a prova é a inversa, e é mais forte: ele foi entregue pela rede e não está em pixel nenhum.
    expect(rede.de("GET", "/v1/me")).toBeGreaterThan(0);
    expect(await page.getByText(NOME_NA_CLAIM).count()).toBe(0);
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

    await expect(page.getByText(/couldn't save the workspace name|salvar o nome do espaço/i)).toBeVisible();
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

  // ════════════════════════════════════════════════════════════════════════════════════════
  // RECONCILIAÇÃO DO NOME NO SHELL — a microcorreção.
  //
  // Até aqui a CFG-03 lia o produtor e o shell continuava imprimindo a projeção de bootstrap.
  // Depois de um rename o MESMO espaço aparecia com dois nomes na mesma tela. Estes casos
  // provam que a precedência é a congelada, e que ela não custou nem token nem storage.
  // ════════════════════════════════════════════════════════════════════════════════════════

  test("W1 · bootstrap A e produtor B: a lateral mostra B", async ({ page }) => {
    await montar(page);
    await page.goto(ROTA);

    // ÂNCORA POSITIVA primeiro: o produtor tem de ter resolvido antes de qualquer negativa.
    await expect(lateral(page)).toContainText(NOME_DO_PRODUTOR);
    await expect(lateral(page)).not.toContainText(NOME_DE_BOOTSTRAP);
  });

  test("W2 · rename com token velho: Configurações e lateral vão juntas para o nome novo", async ({
    page,
  }) => {
    const rede = await montar(page);
    await page.goto(ROTA);
    await expect(campo(page)).toHaveValue(NOME_DO_PRODUTOR);
    await expect(lateral(page)).toContainText(NOME_DO_PRODUTOR);

    await campo(page).fill("Atendimento Nacional");
    await salvar(page).click();
    await expect(page.getByText(/Workspace name saved|Nome do espaço salvo/)).toBeVisible();

    // As DUAS superfícies, no mesmo nome — que é a violação que esta correção fecha.
    await expect(campo(page)).toHaveValue("Atendimento Nacional");
    await expect(lateral(page)).toContainText("Atendimento Nacional");
    // E sem uma segunda ida à rede: o `PATCH` devolve a linha persistida e ela entra na MESMA
    // chave que o shell lê. Um `GET` extra aqui seria sincronização artificial entre as duas.
    expect(rede.de("GET", "/v1/workspaces/")).toBe(1);
    // A identidade não se move num rename.
    await expect(page.getByText(WS_ID)).toBeVisible();
  });

  test("W3 · reentrada: o reload volta a resolver o produtor, e não a claim", async ({ page }) => {
    await montar(page);
    await page.goto(ROTA);
    await campo(page).fill("Nome Depois Do Reload");
    await salvar(page).click();
    await expect(page.getByText(/Workspace name saved|Nome do espaço salvo/)).toBeVisible();

    await page.reload();

    // Depois do reload o bootstrap chega ANTES da rede — e perde assim que o produtor responde.
    await expect(lateral(page)).toContainText("Nome Depois Do Reload");
    await expect(lateral(page)).not.toContainText(NOME_DE_BOOTSTRAP);
    await expect(campo(page)).toHaveValue("Nome Depois Do Reload");
  });

  test("W4 · a reconciliação não toca token, storage nem identidade", async ({ page }) => {
    const rede = await montar(page);
    await page.goto(ROTA);
    await expect(lateral(page)).toContainText(NOME_DO_PRODUTOR);

    await campo(page).fill("Nome Sem Efeito Colateral");
    await salvar(page).click();
    await expect(page.getByText(/Workspace name saved|Nome do espaço salvo/)).toBeVisible();
    await expect(lateral(page)).toContainText("Nome Sem Efeito Colateral");

    // Nenhuma tentativa de reescrever a sessão: sem `/v1/me`, sem Keycloak, sem refresh de token.
    expect(rede.de("POST", "/v1/me")).toBe(0);
    expect(rede.de("PATCH", "/v1/me")).toBe(0);
    expect(rede.de("PUT", "/v1/me")).toBe(0);
    expect(rede.pedidos.filter((p) => /keycloak|realms|protocol\/openid/i.test(p.url))).toHaveLength(0);

    // E nenhum storage virou autoridade de nome: o nome novo não pode estar persistido em
    // lugar nenhum do browser, senão a próxima sessão o leria de lá em vez do produtor.
    const persistido = await page.evaluate(() => {
      const tudo: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i) as string;
        tudo.push(`${k}=${localStorage.getItem(k) ?? ""}`);
      }
      for (let i = 0; i < sessionStorage.length; i += 1) {
        const k = sessionStorage.key(i) as string;
        tudo.push(`${k}=${sessionStorage.getItem(k) ?? ""}`);
      }
      return tudo.join("\n");
    });
    expect(persistido).not.toContain("Nome Sem Efeito Colateral");
    expect(persistido).not.toContain(NOME_DO_PRODUTOR);
  });

  test("W5 · produtor fora ANTES de resolver: bootstrap identifica, e não vira confirmado", async ({
    page,
  }) => {
    await montar(page, { indisponivel: true });
    await page.goto(ROTA);

    // A seção de configuração diz que está indisponível — âncora positiva antes das negativas.
    await expect(
      page.getByText(/Workspace settings are unavailable|configurações do espaço estão indisponíveis/),
    ).toBeVisible();

    // O escopo continua IDENTIFICADO pelo bootstrap: um shell anônimo seria pior, e a claim
    // nunca deixou de ser boa para dizer "onde você está".
    await expect(lateral(page)).toContainText(NOME_DE_BOOTSTRAP);
    // Mas ela não virou configuração confirmada: não há campo, e nenhum campo a carrega.
    await expect(campo(page)).toHaveCount(0);
    expect(await page.locator(`input[value="${NOME_DE_BOOTSTRAP}"]`).count()).toBe(0);
  });

  test("W6 · produtor cai DEPOIS de resolver: a lateral não regride para o nome velho", async ({
    page,
  }) => {
    // Este é o caso que a regra congelada nomeia, e o único que exige uma segunda janela: o
    // produtor responde, o shell reconcilia, e SÓ ENTÃO o dono cai. Degradar aqui seria voltar a
    // exibir um nome que já se sabe superado — pior que nunca ter reconciliado, porque a tela
    // andaria para trás na frente da pessoa.
    let fora = false;
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
    });
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
    await page.route("**/v1/workspaces/**", (route) => {
      if (fora) {
        return route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          workspace_id: WS_ID,
          name: NOME_DO_PRODUTOR,
          created_at: "2026-03-11T08:42:00Z",
        }),
      });
    });

    await page.route("**/v1/analyses**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], next_cursor: null }),
      }),
    );

    await page.goto(ROTA);
    await expect(lateral(page)).toContainText(NOME_DO_PRODUTOR);

    // O dono cai — e a pessoa continua usando o produto, que é o que ela faz de verdade.
    fora = true;
    await page.getByRole("link", { name: /^Analyses$/ }).first().click();
    await expect(page).toHaveURL(/\/analyses/);

    // O nome resolvido sobrevive à queda DENTRO da sessão, e o bootstrap velho não volta.
    await expect(lateral(page)).toContainText(NOME_DO_PRODUTOR);
    await expect(lateral(page)).not.toContainText(NOME_DE_BOOTSTRAP);
  });

  // Nota sobre o limite desta prova, para ninguém a ler como mais forte do que é.
  //
  // A primeira versão de W6 derrubava o produtor e dava `page.reload()`. Ela falhou, e o teste
  // é que estava errado: um reload descarta o cache em memória, então ele NÃO é "o dono caiu
  // depois de resolver" — ele é uma resolução nova, do zero, que a regra congelada permite
  // servir com o bootstrap enquanto o produtor não responde (é exatamente o W5).
  //
  // "Não degradar depois de conhecer o estado canônico" só tem sentido dentro de um documento,
  // e é isso que W6 mede agora. Registrar a diferença importa mais que ter um caso a mais: um
  // gate que confunde as duas coisas exigiria persistir o nome fora da memória para passar — ou
  // seja, exigiria justamente o `localStorage` como autoridade que o W4 proíbe.

  test("W7 · a claim segue servindo identidade — e some como NOME do espaço ativo", async ({
    page,
  }) => {
    await montar(page);
    await page.goto(ROTA);
    await expect(lateral(page)).toContainText(NOME_DO_PRODUTOR);

    // O que a claim continua fazendo, e deve continuar: dizer QUEM é a pessoa e a que espaços ela
    // tem acesso. Nada disso regrediu — a correção mira o NOME do espaço, não o papel da claim.
    await expect(page.getByText("Marcos Tavares")).toBeVisible();
    await expect(page.getByText("marcos.tavares@cliente.test")).toBeVisible();
    // O RÓTULO da lista de acesso mudou de "You can open" para "Your workspaces": o primeiro era
    // um pedaço de frase, o segundo nomeia a coisa. O que esta prova defende é que a lista
    // EXISTE e que a claim continua alimentando-a — não a palavra escolhida para intitulá-la.
    await expect(page.getByText(/^Your workspaces$|^Seus espaços$/)).toBeVisible();

    // E o que ela deixou de fazer: nomear o espaço ativo. A lista de acesso mostra o nome do
    // PRODUTOR, porque para este espaço ele já respondeu nesta mesma tela.
    const conteudo = await page.locator("main").innerText();
    expect(conteudo.length, "página vazia tornaria a negativa seguinte trivial").toBeGreaterThan(50);
    expect(conteudo).toContain(NOME_DO_PRODUTOR);
    expect(
      conteudo,
      "o nome de bootstrap não pode sobreviver em NENHUMA superfície do espaço ativo",
    ).not.toContain(NOME_NA_CLAIM);
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
