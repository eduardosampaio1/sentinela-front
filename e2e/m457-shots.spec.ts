// M45.7 — as capturas das superfícies PÚBLICAS.
//
// ## Por que só agora
//
// Landing, termos, entrada e sessão expirada são as primeiras telas que qualquer pessoa vê — e
// eram as únicas do produto sem uma imagem sequer. A discovery da M45 marcou E13/E14 como
// NO CREDIT por isto: nenhuma passada transversal, nenhuma evidência, nenhum gate.
//
// ## O que estas imagens documentam, e o que elas NÃO documentam
//
// Elas documentam o estado atual, incluindo os defeitos que a tranche mediu e NÃO corrigiu: a
// landing e a entrada não têm `<main>`, e o conjunto público acumula 54 nós de a11y reprovados.
// Registrar o defeito em imagem é o que permite comparar quando ele for corrigido.
//
// Duas destas telas só existem SEM sessão: quem está autenticado e pede `/login` é mandado para
// dentro do produto. A montagem aqui é deliberadamente vazia — nenhuma bandeira de auth.

import { expect, test, type Page } from "@playwright/test";

test.use({ serviceWorkers: "block" });

const SAIDA = "docs/m45-7";

interface Tela {
  readonly nome: string;
  readonly rota: string;
  readonly w: number;
  readonly h: number;
  /** A frase que prova o ESTADO que o nome promete. Sem ela a imagem é só um arquivo. */
  readonly ancora: RegExp;
}

const TELAS: readonly Tela[] = [
  { nome: "01-desktop-landing", rota: "/", w: 1280, h: 1600, ancora: /Do you know if it's working/ },
  { nome: "02-mobile-landing", rota: "/", w: 375, h: 1600, ancora: /Do you know if it's working/ },
  { nome: "03-desktop-termos", rota: "/terms", w: 1280, h: 1400, ancora: /Acceptance of terms/ },
  { nome: "04-desktop-privacidade", rota: "/privacy", w: 1280, h: 1400, ancora: /Privacy/ },
  { nome: "05-desktop-entrada", rota: "/login", w: 1280, h: 900, ancora: /decision layer for your AI/ },
  // A tela que a M14 entregou e que nenhuma passada transversal tinha visto: a sessão caiu, e o
  // texto diz que o trabalho continua salvo. É a diferença entre perder a sessão e perder o
  // trabalho — e é a única mensagem desta tela que importa para quem está do outro lado.
  { nome: "06-desktop-sessao-expirada", rota: "/session-expired", w: 1280, h: 900, ancora: /Session expired/ },
];

/** Sem sessão: é assim que estas superfícies são realmente alcançadas. */
async function semSessao(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
  });
}

for (const tela of TELAS) {
  test(`captura ${tela.nome}`, async ({ page }) => {
    await semSessao(page);
    await page.setViewportSize({ width: tela.w, height: tela.h });
    await page.goto(tela.rota);
    await expect(
      page.getByText(tela.ancora).first(),
      `${tela.nome}: o estado que o nome promete não apareceu antes do disparo`,
    ).toBeVisible({ timeout: 20_000 });
    await page.screenshot({ path: `${SAIDA}/${tela.nome}.png`, fullPage: true });
  });
}
