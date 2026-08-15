// M42 · CFG-04 — a configuração da Instância em BROWSER REAL.
//
// O que só o browser prova:
//
// - que renomear para o nome que **outra** Instância já usa é sucesso, sem aviso e sem sufixo —
//   a inferência de unicidade é o defeito mais provável desta tela, e ela não dá erro nenhum:
//   simplesmente impede alguém de fazer o que o produtor permite;
// - que a identidade **não muda** e a navegação continua no mesmo endereço — rename não é
//   recreate, e um `POST`/`DELETE` aqui trocaria a chave que análises, histórico e régua
//   referenciam;
// - que o rename **não toca a régua de baseline**, nem por invalidação larga;
// - que `503` da Instância não vira "não encontrada", e que a falha de um dono não derruba o outro.

import axe from "axe-core";
import { expect, test, type Page, type Request } from "@playwright/test";

// Service worker bloqueado pela razão já registrada nos specs da M41 e da CFG-03.
test.use({ serviceWorkers: "block" });

const I1 = "inst-4d92e0b8-1f34-4c7a-8e56-90ab3d7f2c15";
const I2 = "inst-b7e5a316-8c02-4d99-a1f7-63e4c05b8d2a";
const NOME_I1 = "Suporte";
const NOME_I2 = "Cobrança";
const WS_ID = "ws-8f3a1c47-6b20-4e11-9d05-2a7c8e4f1b63";
const BASELINE = "an-7e14c0d9-3b58-4a06-9f21-c8d5e2417b30";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: WS_ID, name: "Atendimento Norte", role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

interface Rede {
  pedidos: { metodo: string; url: string; corpo: string | null }[];
  de: (metodo: string, fragmento: string) => number;
  baselineLido: () => number;
}

async function montar(
  page: Page,
  opts: { indisponivel?: boolean } = {},
): Promise<Rede> {
  const rede: Rede = {
    pedidos: [],
    de: (m, f) => rede.pedidos.filter((p) => p.metodo === m && p.url.includes(f)).length,
    baselineLido: () => rede.pedidos.filter((p) => p.url.includes("/baseline")).length,
  };
  // As DUAS Instâncias vivem no handler: é o que torna "nome duplicado" um estado observável, e
  // não uma afirmação sobre um conjunto de um elemento.
  const porId = new Map([
    [I1, { instance_id: I1, name: NOME_I1, created_at: "2026-05-02T11:15:00Z" }],
    [I2, { instance_id: I2, name: NOME_I2, created_at: "2026-05-19T16:40:00Z" }],
  ]);

  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
  page.on("request", (r: Request) => {
    if (r.url().includes("/v1/")) {
      rede.pedidos.push({ metodo: r.method(), url: r.url(), corpo: r.postData() });
    }
  });

  await page.route("**/v1/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  await page.route("**/v1/analyses**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], next_cursor: null }),
    }),
  );

  // A régua ANTES da rota geral de Instância: o Playwright casa a última rota registrada
  // primeiro, e `**/v1/instances/**` engoliria `/baseline` se viesse depois.
  await page.route("**/v1/instances/*/baseline**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        baseline_analysis_id: BASELINE,
        baseline_set_at: "2026-06-08T10:05:00Z",
      }),
    }),
  );

  await page.route("**/v1/instances/**", async (route) => {
    const pedido = route.request();
    const id = new URL(pedido.url()).pathname.split("/").filter(Boolean).pop() as string;
    if (opts.indisponivel) {
      return route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ code: "temporarily_unavailable", retryable: true }),
      });
    }
    const atual = porId.get(id);
    if (!atual) {
      return route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ code: "forbidden_or_not_found" }),
      });
    }
    if (pedido.method() === "PATCH") {
      const corpo = JSON.parse(pedido.postData() ?? "{}") as { name?: string };
      // Nome duplicado é LEGÍTIMO: nenhuma verificação de unicidade aqui, como no produtor.
      if (corpo.name) porId.set(id, { ...atual, name: corpo.name });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(porId.get(id)),
    });
  });

  return rede;
}

const campo = (page: Page) => page.getByLabel(/^Name$|^Nome$/);
const salvar = (page: Page) => page.getByRole("button", { name: /^Save name$|^Salvar nome$/ });
const salvo = (page: Page) => page.getByText(/Instance name saved|Nome da instância salvo/);

// ══════════════════════════════════════════════════════════════════════════════════════════

test.describe("M42 · CFG-04 no browser", () => {
  test("J · o nome corrente vem do produtor", async ({ page }) => {
    await montar(page);
    await page.goto(`/instances/${I1}`);
    await expect(campo(page)).toHaveValue(NOME_I1);
    await expect(page.getByText(I1)).toBeVisible();
  });

  test("K/P · rename: UM PATCH, mesmo instance_id, e a régua NÃO é tocada", async ({ page }) => {
    const rede = await montar(page);
    await page.goto(`/instances/${I1}`);
    await expect(campo(page)).toHaveValue(NOME_I1);
    const baselineAntes = rede.baselineLido();

    await campo(page).fill("Suporte Nível 2");
    await salvar(page).click();
    await expect(salvo(page)).toBeVisible();

    expect(rede.de("PATCH", "/v1/instances/")).toBe(1);
    expect(rede.de("POST", "/v1/instances")).toBe(0);
    expect(rede.de("DELETE", "/v1/instances")).toBe(0);
    // A identidade sobrevive, e o endereço não mudou: rename não é recreate.
    await expect(page.getByText(I1)).toBeVisible();
    expect(page.url()).toContain(`/instances/${I1}`);
    // E nenhuma leitura NOVA da régua: ela não mudou, e recarregá-la faria a tela sugerir que sim.
    expect(rede.baselineLido()).toBe(baselineAntes);
  });

  test("L · nome DUPLICADO é aceito, sem aviso e sem sufixo", async ({ page }) => {
    await montar(page);
    await page.goto(`/instances/${I2}`);
    await expect(campo(page)).toHaveValue(NOME_I2);

    // O nome que a OUTRA Instância já usa.
    await campo(page).fill(NOME_I1);
    await salvar(page).click();
    await expect(salvo(page)).toBeVisible();

    await expect(campo(page)).toHaveValue(NOME_I1);
    const texto = (await page.locator("main").innerText()).toLowerCase();
    expect(texto).not.toMatch(/já existe|already exists|em uso|in use|\(2\)/);
  });

  test("M · refresh mantém o novo nome, vindo do servidor", async ({ page }) => {
    await montar(page);
    await page.goto(`/instances/${I1}`);
    await campo(page).fill("Persistido");
    await salvar(page).click();
    await expect(salvo(page)).toBeVisible();

    await page.reload();
    await expect(campo(page)).toHaveValue("Persistido");
  });

  test("N · 503 da Instância é INDISPONÍVEL, e não 'não encontrada'", async ({ page }) => {
    await montar(page, { indisponivel: true });
    await page.goto(`/instances/${I1}`);

    // ÂNCORA POSITIVA PRIMEIRO — e é aqui que a versão anterior deste teste mentia. Ela lia
    // `main.innerText()` no instante seguinte ao `goto` e afirmava a AUSÊNCIA de "not found";
    // só que a política de retry transitório (2 tentativas, ~3 s) mantém a página em esqueleto
    // nesse instante, `innerText` volta VAZIO, e negativa sobre string vazia passa sempre. O
    // gate ficou verde sobre uma página que ainda não existia — enquanto o estado terminal
    // dizia, literalmente, "não encontramos esta instância neste workspace" para um `503`.
    const aviso = page.locator("main").getByRole("alert");
    await expect(aviso).toBeVisible({ timeout: 15_000 });
    await expect(aviso).toContainText(/unavailable right now|indisponível agora/);

    const texto = (await page.locator("main").innerText()).toLowerCase();
    // A massa precisa EXISTIR para a negativa abaixo significar alguma coisa.
    expect(texto.length, "página vazia tornaria a negativa seguinte trivial").toBeGreaterThan(20);
    expect(texto).not.toMatch(/não encontr|not found|couldn't find|não existe|does not exist/);
    // Transitório tem caminho de VOLTA para a mesma Instância — e não um "ver todas" que desiste
    // da que a pessoa pediu.
    await expect(
      page.getByRole("button", { name: /^Try again$|^Tentar novamente$/ }),
    ).toBeVisible();
    // E uma saída de emergência: esta rota não tem item na navegação lateral, então um erro sem
    // link de volta é um beco para quem tentou e desistiu.
    await expect(
      page.locator("main").getByRole("link", { name: /View all instances|Ver todas as instâncias/ }),
    ).toBeVisible();
    // E não há campo de edição: não há valor confirmado para editar.
    await expect(campo(page)).toHaveCount(0);
  });

  test("N2 · contraprova: o 404 do contrato CONTINUA dizendo 'não encontramos'", async ({ page }) => {
    // Sem esta contraprova, trocar o ramo inteiro por "indisponível" passaria no teste N e
    // apagaria o anti-oráculo: `forbidden_or_not_found` colapsa "de outro workspace" e
    // "inexistente" de propósito, e essa frase precisa sobreviver.
    await montar(page);
    await page.goto("/instances/inst-00000000-0000-4000-8000-000000000000");

    const aviso = page.locator("main").getByRole("alert");
    await expect(aviso).toBeVisible({ timeout: 15_000 });
    await expect(aviso).toContainText(/couldn't find this instance|Não encontramos esta instância/);
    // E o 404 NÃO oferece "tentar de novo": repetir não muda o resultado.
    await expect(
      page.getByRole("button", { name: /^Try again$|^Tentar novamente$/ }),
    ).toHaveCount(0);
  });

  test("R · axe: zero violações na página com a seção montada", async ({ page }) => {
    await montar(page);
    await page.goto(`/instances/${I1}`);
    await expect(campo(page)).toHaveValue(NOME_I1);

    // `axe.source` e nao `require.resolve`: o spec roda em ESM, onde `require` nao existe. O
    // pacote expoe o proprio fonte justamente para injecao em pagina.
    await page.addScriptTag({ content: axe.source });
    const resultado = await page.evaluate(async () => {
      const axe = (window as unknown as { axe: { run: (o: unknown) => Promise<unknown> } }).axe;
      return (await axe.run({ runOnly: ["wcag2a", "wcag2aa"] })) as {
        violations: { id: string; nodes: unknown[] }[];
      };
    });
    const graves = resultado.violations.map((v) => `${v.id} (${v.nodes.length})`);
    expect(graves, `violações axe: ${graves.join(", ")}`).toEqual([]);
  });

  for (const vp of [
    { nome: "desktop", width: 1280, height: 800 },
    { nome: "tablet", width: 768, height: 1024 },
    { nome: "mobile", width: 375, height: 812 },
  ] as const) {
    test(`S/T · ${vp.nome}: sem overflow horizontal`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await montar(page);
      await page.goto(`/instances/${I1}`);
      await expect(campo(page)).toHaveValue(NOME_I1);

      const excesso = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      expect(excesso, `${vp.nome} com rolagem horizontal`).toBeLessThanOrEqual(1);
    });
  }
});
