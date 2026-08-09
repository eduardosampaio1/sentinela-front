// M24 — a IA PÚBLICA, e a compatibilidade que ela não pode quebrar.
//
// `canonical` era nome de camada interna, e estava na URL que a pessoa lê, guarda nos favoritos e
// cola em e-mail. A decisão A10 tirou isso da IA pública; a M24 executou.
//
// O risco de uma migração dessas não é a rota nova não funcionar — é a antiga parar de funcionar.
// Link em e-mail já enviado, favorito e histórico do navegador continuam existindo no mundo, e
// 404 neles é um defeito que só aparece para quem não está por perto para reclamar.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const SRC = resolve(RAIZ, "src");
const ROUTER = resolve(SRC, "app/router.tsx");
const router = readFileSync(ROUTER, "utf-8");

const semComentarios = (t: string) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

function arquivos(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = resolve(dir, e);
    if (statSync(p).isDirectory()) arquivos(p, acc);
    else if ([".ts", ".tsx"].includes(extname(p))) acc.push(p);
  }
  return acc;
}

const posix = (p: string) => relative(RAIZ, p).split("\\").join("/");

/**
 * O corpo do redirecionador legado, recortado COM LIMITE SUPERIOR.
 *
 * Sem o limite, `slice(indexOf(...))` devolve o arquivo inteiro a partir dali — e qualquer termo
 * procurado aparece em outro lugar do router. A asserção passa sempre, e a mutação sobrevive.
 */
function corpoDoRedirecionador(): string {
  const limpo = semComentarios(router);
  const ini = limpo.indexOf("function RedirecionaCanonicoLegado");
  const fim = limpo.indexOf("function RedirecionaDetalheLegado", ini);
  expect(ini, "redirecionador legado não existe mais").toBeGreaterThan(-1);
  expect(fim, "não achei o fim do redirecionador").toBeGreaterThan(ini);
  return limpo.slice(ini, fim);
}

describe("M24 · 1. as rotas públicas existem", () => {
  const PUBLICAS = [
    '"/analyses"',
    '"/analyses/new"',
    '"/analyses/:analysisId"',
    '"/analyses/:analysisId/result"',
  ];
  for (const rota of PUBLICAS) {
    it(`${rota} está registrada`, () => {
      expect(semComentarios(router)).toContain(`path: ${rota}`);
    });
  }
});

describe("M24 · 2. as rotas legadas redirecionam", () => {
  it("`/canonical/analyses` e `/canonical/analyses/*` viram redirect, não destino", () => {
    const limpo = semComentarios(router);
    expect(limpo).toContain('path: "/canonical/analyses"');
    expect(limpo).toContain('path: "/canonical/analyses/*"');
    // E nenhuma delas renderiza mais uma PÁGINA: só o redirecionador.
    const legadas = limpo
      .split("\n")
      .filter((l) => l.includes('path: "/canonical/'))
      .join("\n");
    expect(legadas).toContain("RedirecionaCanonicoLegado");
    expect(legadas).not.toMatch(/Canonical(AnalysesList|StartPage|AnalysisPage|ResultPage)/);
  });

  it("o redirecionador preserva caminho, query e hash", () => {
    // `#comparison` é destino contratado. Um redirect que descartasse o hash levaria a pessoa à
    // página certa e à âncora errada — pior que 404, porque parece ter funcionado.
    //
    // O corpo é recortado COM LIMITE. A primeira versão fazia `slice(indexOf(...))` sem fim, e
    // varria o arquivo inteiro: `search` e `hash` apareciam em qualquer outro lugar do router, a
    // asserção passava sempre, e a mutação que removia a preservação SOBREVIVEU.
    expect(corpoDoRedirecionador()).toContain("search + hash");
  });

  it("o redirect usa `replace` — senão o botão voltar repica na URL antiga", () => {
    expect(corpoDoRedirecionador()).toContain("replace");
  });

  it("o destino do redirect NÃO começa com `/canonical` — não há laço", () => {
    // A prova de que a substituição remove o prefixo em vez de acrescentá-lo. Um redirect que
    // apontasse para si mesmo giraria até o navegador desistir.
    const limpo = semComentarios(router);
    const fn = limpo.slice(limpo.indexOf("function RedirecionaCanonicoLegado"));
    expect(fn).toMatch(/replace\(\s*\/\^\\\/canonical\/\s*,\s*""\s*\)/);
  });
});

describe("M24 · 3. navegação nova nunca produz `/canonical/*`", () => {
  it("nenhum `to=`, `navigate(` ou `href=` aponta para a rota legada", () => {
    // O coração da missão. A rota antiga pode existir para receber quem chega de fora; o que ela
    // não pode é continuar sendo GERADA — senão a URL interna volta a circular.
    const infratores: string[] = [];
    for (const p of arquivos(SRC)) {
      if (p === ROUTER) continue;
      const texto = semComentarios(readFileSync(p, "utf-8"));
      for (const linha of texto.split("\n")) {
        if (!/\/canonical\//.test(linha)) continue;
        if (/\bto=|navigate\s*\(|href=/.test(linha)) infratores.push(`${posix(p)}: ${linha.trim()}`);
      }
    }
    expect(infratores, "navegação gerando a rota interna").toEqual([]);
  });

  it("a copy pública não menciona `/canonical`", () => {
    for (const idioma of ["pt", "en"]) {
      const texto = readFileSync(resolve(SRC, `i18n/${idioma}.json`), "utf-8");
      expect(texto, `${idioma}.json cita a rota interna`).not.toContain("/canonical");
    }
  });
});

describe("M24 · 4-5. a fronteira pública/autenticada não se moveu", () => {
  it("`/` continua sendo a landing pública", () => {
    const limpo = semComentarios(router);
    expect(limpo).toMatch(/path: "\/",\s*\n?\s*element: <PageSuspense><LandingPage/);
  });

  it("`/home` continua sendo a Home autenticada", () => {
    expect(semComentarios(router)).toContain('path: "/home"');
  });
});

describe("M24 · a duplicata `/home/welcome` saiu como destino", () => {
  it("`/home/welcome` redireciona para `/home` em vez de renderizar a mesma tela", () => {
    // Duas rotas renderizando a MESMA página é ambiguidade pública: o endereço que a pessoa
    // guarda passa a depender de por onde ela entrou. Some como destino, sobrevive como redirect.
    const limpo = semComentarios(router);
    const linha = limpo.split("\n").find((l) => l.includes('path: "/home/welcome"'));
    expect(linha, "a rota sumiu — quem a tem no favorito levaria 404").toBeDefined();
    expect(linha).toContain('Navigate to="/home"');
    expect(linha, "voltou a renderizar a tela duplicada").not.toContain("LaunchpadPage");
  });
});

describe("M24 · 6. `#comparison` continua alcançável", () => {
  it("o deep link com hash resolve para a rota de resultado", () => {
    // O hash não é rota: ele é âncora dentro de `/analyses/:id/result`. O que precisa existir é a
    // rota, e o redirect legado precisa carregar o hash junto — provado acima.
    const limpo = semComentarios(router);
    expect(limpo).toContain('path: "/analyses/:analysisId/result"');
  });
});

describe("M24 · 7. deep link não depende de estado transitório", () => {
  it("as rotas públicas são registradas por caminho, sem depender de `state`", () => {
    // Uma rota que só funcionasse com `navigate(..., { state })` quebraria no refresh e no link
    // colado — que é exatamente o caso de uso de uma URL pública.
    const limpo = semComentarios(router);
    const bloco = limpo.slice(limpo.indexOf('path: "/analyses"'), limpo.indexOf('path: "/canonical/analyses"'));
    expect(bloco).not.toContain("location.state");
    expect(bloco).not.toContain("useLocation");
  });

  it("o redirect legado também não depende de estado — só da URL", () => {
    expect(corpoDoRedirecionador()).not.toContain("state");
  });
});

describe("M24 · rotas de Instância continuam bloqueadas", () => {
  it("nenhuma rota `/instances` foi registrada — o delta segue não autorizado", () => {
    expect(semComentarios(router)).not.toContain('path: "/instances');
  });
});
