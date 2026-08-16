// M45.8 — as superfícies que o gate de cobertura descobriu.
//
// A M45.7 fechou anunciando que as públicas estavam medidas. Estavam quatro delas. O gate de
// cobertura (`src/test/v1/matriz-cobre-o-router.test.ts`) leu o router e mostrou mais oito
// superfícies reais que nenhuma passada transversal tinha visitado — guardando 105 nós de a11y
// contra os 54 que a M45.7 conhecia.
//
// Estas cinco nunca tiveram imagem. As duas visões (ARGOS e Analytics) já têm as suas em
// `docs/two-view`; a privacidade saiu na M45.7.

import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const SAIDA = "docs/m45-8";

const IDENTIDADE = {
  user: { id: "u-kc-9051", email: "marcos.tavares@cliente.test", name: "Marcos Tavares" },
  workspaces: [{ id: "e2e-workspace-0000", name: "Atendimento Norte", role: "owner" }],
  capabilities: { canonical_analysis_enabled: true },
};

interface Tela {
  readonly nome: string;
  readonly rota: string;
  readonly w: number;
  readonly h: number;
  readonly ancora: RegExp;
  /** `/profile` é a única DENTRO do produto — e é a que mais importa das cinco. */
  readonly autenticada?: boolean;
}

const TELAS: readonly Tela[] = [
  // 76 nós de contraste: o maior bolsão de dívida de a11y do produto inteiro, num só lugar.
  { nome: "01-desktop-aion", rota: "/aion", w: 1280, h: 1800, ancora: /The proxy that thinks/ },
  { nome: "02-desktop-seguranca", rota: "/security", w: 1280, h: 1400, ancora: /How we protect your data/ },
  { nome: "03-desktop-perfil", rota: "/profile", w: 1280, h: 1000, autenticada: true,
    ancora: /Your account identity and security settings/ },
  // As duas telas de desamparo. Ambas dizem, com todas as letras, que o TRABALHO continua lá — é a
  // mesma distinção que a sessão expirada faz, e é a única coisa que importa para quem cai nelas.
  { nome: "04-desktop-erro-500", rota: "/error", w: 1280, h: 900, ancora: /An unexpected server error occurred/ },
  { nome: "05-desktop-404", rota: "/rota-que-nao-existe", w: 1280, h: 900, autenticada: true,
    ancora: /This page doesn't exist/ },
];

async function montar(page: Page, autenticada: boolean) {
  if (!autenticada) return;
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__ = true;
  });
  await page.route("**/v1/me", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(IDENTIDADE) }),
  );
  await page.route("**/v1/subscriptions**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ items: [] }) }),
  );
}

for (const tela of TELAS) {
  test(`captura ${tela.nome}`, async ({ page }) => {
    await montar(page, tela.autenticada ?? false);
    await page.setViewportSize({ width: tela.w, height: tela.h });
    await page.goto(tela.rota);
    await expect(
      page.getByText(tela.ancora).first(),
      `${tela.nome}: o estado que o nome promete não apareceu antes do disparo`,
    ).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: `${SAIDA}/${tela.nome}.png`, fullPage: true });
  });
}
