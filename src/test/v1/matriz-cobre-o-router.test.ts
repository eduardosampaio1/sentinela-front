// M45.8 — nenhuma rota do produto pode existir sem alguém tê-la olhado.
//
// ## O defeito que este gate existe para impedir
//
// A M45 inteira se chamou "endurecimento da experiência" e mediu 24 journeys. O router tem 39
// rotas. A umbrella fechou sete tranches acreditando cobrir o produto, e cobria 60% dele — sem
// que nada ficasse vermelho, porque **nada media a cobertura**.
//
// A M45.7 é o caso exemplar: ela fechou anunciando 54 nós de a11y como o total da dívida pública.
// Era o total do que ela tinha OLHADO. As rotas que ela não olhou guardavam 105.
//
// ## Por que um gate estático, e não mais uma journey
//
// Uma journey prova que UMA rota funciona. Nenhuma quantidade de journeys prova que não falta
// journey — isso é uma afirmação sobre o CONJUNTO, e só um gate que lê as duas listas a alcança.
//
// É a resposta estrutural ao `NO CREDIT`: a partir daqui, adicionar rota ao router sem adicionar
// journey (ou sem declarar por escrito por que ela fica de fora) reprova a suíte.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = resolve(__dirname, "../../..");
const ROUTER = resolve(RAIZ, "src/app/router.tsx");
const MATRIZ = resolve(RAIZ, "e2e/m45-matriz.spec.ts");

/**
 * Rotas deliberadamente fora da matriz — cada uma com o MOTIVO por escrito.
 *
 * O motivo não é decoração: é o que separa "decidimos não medir" de "esquecemos". Uma entrada sem
 * motivo legível aqui é uma dívida disfarçada de decisão.
 */
const FORA_DA_MATRIZ: Readonly<Record<string, string>> = {
  // Redirecionamentos puros: não renderizam superfície, e o destino já tem journey.
  "/home/welcome": "redirect → /home",
  "/dashboard/history": "redirect → /analyses",
  "/dashboard/history/:id": "redirect legado → /analyses/:id",
  "/dashboard/analysis": "redirect → /dashboard",
  "/dashboard/diagnostics": "redirect → /dashboard",
  "/dashboard/guardrails": "redirect → /dashboard",
  "/dashboard/optimization": "redirect → /dashboard",
  "/manage-context": "redirect → /workspaces",
  "/dashboard/workspaces": "redirect → /workspaces",
  "/dashboard/manage-context": "redirect → /workspaces",
  "/canonical/analyses": "redirect canônico legado",
  "/canonical/analyses/*": "redirect canônico legado",

  // Aperto de mão com o provedor de identidade: sem UI própria e sem estado terminal alcançável
  // fora de um Keycloak real. Medi-los aqui provaria a montagem, não o produto.
  "/auth/callback": "handshake do provedor — sem superfície própria",
  "/auth/reset-password": "handshake do provedor — sem superfície própria",

  // Rota de compatibilidade que resolve para o detalhe de uma análise. O destino tem journey (J2);
  // a rota em si é um adaptador.
  "/dashboard": "adaptador de compatibilidade → detalhe de análise",

  // DÍVIDA DECLARADA, e não decisão.
  //
  // A comparação é superfície REAL, com suíte própria desde a M39/EVO-02 — mas suíte própria é
  // exatamente o que as 24 journeys da M45 também tinham, e não impediu o buraco que esta tranche
  // achou. Ela fica de fora da matriz por orçamento desta tranche, não por mérito.
  "/analyses/compare/:analysisAId/:analysisBId": "DÍVIDA — superfície real, ainda fora da matriz",
};

/** `path: "/x"` no router. */
function rotasDoRouter(): string[] {
  const fonte = readFileSync(ROUTER, "utf-8");
  return [...fonte.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]);
}

/**
 * `rota: "/x"` **e** `` rota: `/x/${ID}` `` na matriz.
 *
 * ## Errata do instrumento — a primeira versão só lia aspas duplas
 *
 * Ela acusou quatro rotas como descobertas: `/instances/:instanceId`, `/analyses/:analysisId/argos`,
 * `/analyses/:analysisId/analytics` e `/analyses/:analysisId/result`. As quatro TÊM journey — só
 * que journey com identificador é montada com template literal, e o regex não a via.
 *
 * O piso de instrumento (`> 20 rotas extraídas`) passou, porque as rotas sem parâmetro são a
 * maioria e são literais. Um piso que mede o VOLUME não pega um extrator cego a uma FORMA.
 *
 * Sem conferir contra o que eu já sabia estar coberto, este gate teria estreado publicando quatro
 * achados falsos — e a M45.8 inteira é sobre um instrumento que não olhava para tudo.
 */
function rotasDaMatriz(): string[] {
  const fonte = readFileSync(MATRIZ, "utf-8");
  const literais = [...fonte.matchAll(/rota:\s*"([^"]+)"/g)].map((m) => m[1]);
  // `${ALGO}` vira um segmento concreto qualquer — é o que `:param` do router casa.
  const modelos = [...fonte.matchAll(/rota:\s*`([^`]+)`/g)].map((m) =>
    m[1].replace(/\$\{[^}]+\}/g, "id-concreto"),
  );
  return [...literais, ...modelos];
}

/**
 * Um padrão do router casa uma rota concreta da matriz?
 *
 * `:param` casa qualquer segmento; `*` casa o resto. O curinga `*` do router (404) é tratado à
 * parte porque casaria TUDO — e um casador que casa tudo declara cobertura total sem medir nada.
 */
function casa(padrao: string, concreta: string): boolean {
  if (padrao === "*") return concreta === "/rota-que-nao-existe";
  const p = padrao.split("/");
  const c = concreta.split("/");
  if (p.at(-1) === "*") return c.length >= p.length - 1;
  if (p.length !== c.length) return false;
  return p.every((seg, i) => seg.startsWith(":") || seg === c[i]);
}

describe("M45.8 · a matriz cobre o router", () => {
  const doRouter = rotasDoRouter();
  const daMatriz = rotasDaMatriz();

  it("as duas listas existem — laço vazio é sempre verde", () => {
    // O piso do INSTRUMENTO. Se um regex parar de casar (uma refatoração que troque aspas duplas
    // por simples, por exemplo), as duas listas vêm vazias e TODAS as afirmações abaixo passam
    // por vacuidade. Este programa já foi enganado por massa vazia mais de uma vez.
    expect(doRouter.length, "nenhuma rota extraída do router — o extrator quebrou").toBeGreaterThan(30);
    expect(daMatriz.length, "nenhuma rota extraída da matriz — o extrator quebrou").toBeGreaterThan(20);
  });

  it("toda rota do router tem journey ou motivo escrito", () => {
    const descobertas = doRouter.filter(
      (padrao) => !(padrao in FORA_DA_MATRIZ) && !daMatriz.some((r) => casa(padrao, r)),
    );

    expect(
      descobertas,
      "rota no router que ninguém atravessa e ninguém declarou:\n  " +
        descobertas.join("\n  ") +
        "\n\nAdicione uma journey em e2e/m45-matriz.spec.ts, ou uma entrada COM MOTIVO em " +
        "FORA_DA_MATRIZ. As duas são aceitáveis; o silêncio não é.",
    ).toEqual([]);
  });

  it("nenhum motivo é dado para rota que não existe mais", () => {
    // A outra ponta da catraca. Sem isto, `FORA_DA_MATRIZ` viraria um cemitério de rotas mortas —
    // e uma lista de exceções que ninguém poda deixa de ser lida.
    const fantasmas = Object.keys(FORA_DA_MATRIZ).filter((r) => !doRouter.includes(r));
    expect(fantasmas, `motivo escrito para rota inexistente: ${fantasmas.join(", ")}`).toEqual([]);
  });

  it("a dívida declarada é NOMINAL e não cresce", () => {
    const divida = Object.entries(FORA_DA_MATRIZ)
      .filter(([, motivo]) => motivo.startsWith("DÍVIDA"))
      .map(([rota]) => rota);

    // Uma entrada nova marcada DÍVIDA reprova até alguém decidir conscientemente aumentá-la. O
    // caminho fácil tem de doer mais que o caminho certo.
    expect(divida, "a dívida de cobertura mudou").toEqual([
      "/analyses/compare/:analysisAId/:analysisBId",
    ]);
  });
});
