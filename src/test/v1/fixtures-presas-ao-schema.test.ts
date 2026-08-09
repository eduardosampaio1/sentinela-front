// M17 — as fixtures PRESAS ao schema publicado.
//
// ## A barreira que mata em silêncio
//
// O contrato evolui, a fixture não, e a suíte continua verde — porque testa a fixture contra ela
// mesma. Ela não fica vermelha: fica **irrelevante**. O front segue provando que sabe ler um
// formato que o backend parou de mandar, e a descoberta acontece em produção.
//
// ## As três ligações, e por que são três
//
//   1. **DIGESTO** — as fixtures declaram de qual contrato foram derivadas. Contrato mudou → gate
//      vermelho, e alguém precisa OLHAR. `version` não serve de sentinela: continuou `public-v1`
//      depois da BD07, que acrescentou uma operação e alinhou 16 chaves.
//   2. **NÃO INVENTAR** — toda chave de uma fixture existe no `*_fields` publicado. Uma fixture
//      que afirma um campo inexistente faz o front nascer sabendo ler algo que ninguém manda.
//   3. **NÃO OMITIR** — todo campo OBRIGATÓRIO está presente. É o DoD literal do plano.
//
// ## Onde a obrigatoriedade mora, e por que não a duplico
//
// O contrato publica a LISTA de campos (`list_item_fields`, …); ele não diz quais são opcionais.
// O tipo TypeScript diz — `observed_conversations?` é opcional, `analysis_id` não é. Cruzar as
// duas fontes é o que permite exigir sem inventar: a lista vem do contrato, a obrigatoriedade vem
// do tipo, e este arquivo não redeclara nem uma nem outra.
//
// Redigitar o schema aqui seria criar a terceira representação que a WS-A passou uma missão
// inteira reduzindo a duas.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { resolverOrigemDoContrato } from "./contractOrigin";
import {
  DIGEST_DO_CONTRATO_DERIVADO,
  PUBLICADO_SEM_FIXTURE,
} from "@/test/fixtures/public-v1/selo";
import {
  HANDLE,
  LIST_PAGE_1,
  LIST_PAGE_2,
  RESULT_VIEW,
  STATUS_VIEWS,
  statusView,
} from "@/test/fixtures/public-v1/analyses";

const RAIZ = resolve(__dirname, "../../..");
const TIPOS = resolve(RAIZ, "src/lib/v1/contract/public-v1.types.ts");

const resolucao = resolverOrigemDoContrato();
const contrato = resolucao.escolhida
  ? (JSON.parse(readFileSync(resolve(resolucao.escolhida.caminho, "public-v1.json"), "utf-8")) as
      Record<string, unknown>)
  : null;

/** Campos publicados por um read model, direto do contrato. Nunca redigitados aqui. */
const publicados = (chave: string): readonly string[] =>
  ((contrato?.[chave] as string[] | undefined) ?? []).slice();

/**
 * Campos NÃO-opcionais de uma interface, lidos da AST do tipo canônico.
 *
 * A obrigatoriedade não está no contrato — ele lista a superfície, não a cardinalidade. Está no
 * tipo, e é de lá que ela vem.
 */
function obrigatoriosDaInterface(nome: string): string[] {
  const sf = ts.createSourceFile(
    "public-v1.types.ts",
    readFileSync(TIPOS, "utf-8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const campos: string[] = [];
  const visitar = (no: ts.Node): void => {
    if (ts.isInterfaceDeclaration(no) && no.name.text === nome) {
      for (const m of no.members) {
        if (ts.isPropertySignature(m) && m.name && ts.isIdentifier(m.name) && !m.questionToken) {
          campos.push(m.name.text);
        }
      }
    }
    ts.forEachChild(no, visitar);
  };
  ts.forEachChild(sf, visitar);
  return campos;
}

/** Uma fixture sob julgamento: o objeto real, a lista publicada e a interface que a tipa. */
interface Alvo {
  nome: string;
  amostras: Record<string, unknown>[];
  chaveDoContrato: string;
  interfaceDoTipo: string;
}

const ALVOS: readonly Alvo[] = [
  {
    nome: "statusView / STATUS_VIEWS",
    amostras: [
      ...Object.values(STATUS_VIEWS),
      statusView("completed"),
    ] as unknown as Record<string, unknown>[],
    chaveDoContrato: "status_read_model_fields",
    interfaceDoTipo: "AnalysisStatusView",
  },
  {
    nome: "LIST_PAGE_*.items",
    amostras: [...LIST_PAGE_1.items, ...LIST_PAGE_2.items] as unknown as Record<string, unknown>[],
    chaveDoContrato: "list_item_fields",
    interfaceDoTipo: "AnalysisListItem",
  },
  {
    nome: "RESULT_VIEW",
    amostras: [RESULT_VIEW] as unknown as Record<string, unknown>[],
    chaveDoContrato: "result_read_model_fields",
    interfaceDoTipo: "AnalysisResultView",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Anti-vacuidade — há contrato, há campos, há fixtures
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M17 · 1. o gate não passa por ausência de contrato", () => {
  it("a autoridade do contrato resolve — e sem env var, depois da BD07", () => {
    // Sem origem resolvida, TODAS as comparações abaixo passariam sobre listas vazias: nenhuma
    // chave inventada, nenhum obrigatório faltando, e o gate reportaria verde sobre nada.
    expect(resolucao.motivo, `resolução: ${resolucao.motivo}`).not.toBe("ausente");
    expect(resolucao.motivo).not.toBe("ambigua");
    expect(contrato, "contrato não carregado").toBeTruthy();
  });

  it("cada alvo tem campos publicados e amostras para julgar", () => {
    for (const a of ALVOS) {
      expect(publicados(a.chaveDoContrato).length, `${a.nome}: \`${a.chaveDoContrato}\` vazio`).
        toBeGreaterThan(0);
      expect(a.amostras.length, `${a.nome}: nenhuma amostra`).toBeGreaterThan(0);
      expect(
        obrigatoriosDaInterface(a.interfaceDoTipo).length,
        `${a.nome}: interface \`${a.interfaceDoTipo}\` não encontrada ou sem campos obrigatórios`,
      ).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. O selo — a fixture sabe de qual contrato veio
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M17 · 2. as fixtures declaram o contrato de origem", () => {
  it("o digest selado é o do contrato vigente", () => {
    // O caso que impede a fixture de envelhecer em silêncio. Vermelho aqui NÃO se conserta
    // editando o selo: ele diz que o contrato mudou, e o trabalho é reconferir as fixtures.
    expect(
      resolucao.escolhida?.digest,
      "o contrato mudou desde que as fixtures foram conferidas — reconfira e atualize o selo " +
        "no MESMO commit, em vez de só trocar o número",
    ).toBe(DIGEST_DO_CONTRATO_DERIVADO);
  });

  it("o selo é um digest de verdade, não um placeholder", () => {
    expect(DIGEST_DO_CONTRATO_DERIVADO).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. A fixture não INVENTA propriedade
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M17 · 3. nenhuma fixture afirma campo que o contrato não publica", () => {
  for (const alvo of ALVOS) {
    it(`${alvo.nome} — só campos de \`${alvo.chaveDoContrato}\``, () => {
      const permitidos = new Set(publicados(alvo.chaveDoContrato));
      const inventados = new Set<string>();
      for (const amostra of alvo.amostras) {
        for (const k of Object.keys(amostra)) if (!permitidos.has(k)) inventados.add(k);
      }
      expect(
        [...inventados].sort(),
        `${alvo.nome} inventa campo — o front nasceria sabendo ler algo que ninguém manda`,
      ).toEqual([]);
    });
  }

  it("`HANDLE` só usa campos publicados", () => {
    // O handle é um recorte de `status_read_model_fields`: o contrato não publica lista própria
    // para ele, e um campo fora dessa superfície seria invenção do mesmo jeito.
    const permitidos = new Set(publicados("status_read_model_fields"));
    const inventados = Object.keys(HANDLE).filter((k) => !permitidos.has(k));
    expect(inventados).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A fixture não OMITE obrigatório — o DoD literal
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M17 · 4. nenhum campo obrigatório falta", () => {
  for (const alvo of ALVOS) {
    it(`${alvo.nome} — todos os obrigatórios de \`${alvo.interfaceDoTipo}\``, () => {
      // Obrigatório = publicado pelo contrato E não-opcional no tipo. O cruzamento é o que evita
      // exigir um campo que o contrato não conhece, e exigir um que o tipo declarou opcional.
      const publicadosDoAlvo = new Set(publicados(alvo.chaveDoContrato));
      const exigidos = obrigatoriosDaInterface(alvo.interfaceDoTipo).filter((c) =>
        publicadosDoAlvo.has(c),
      );
      expect(exigidos.length, `${alvo.nome}: nenhum campo exigido — o cruzamento falhou`).
        toBeGreaterThan(0);

      const faltando: string[] = [];
      for (const [i, amostra] of alvo.amostras.entries()) {
        for (const campo of exigidos) {
          if (!(campo in amostra)) faltando.push(`amostra[${i}].${campo}`);
        }
      }
      expect(faltando, `${alvo.nome} omite campo obrigatório`).toEqual([]);
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. O que o contrato publica e nenhuma fixture exercita — declarado, nunca silencioso
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M17 · 5. cobertura declarada dos campos publicados", () => {
  const naoExercitados = ALVOS.flatMap((alvo) => {
    const vistos = new Set(alvo.amostras.flatMap((a) => Object.keys(a)));
    return publicados(alvo.chaveDoContrato)
      .filter((c) => !vistos.has(c))
      .map((c) => `${alvo.chaveDoContrato}.${c}`);
  });

  it("a lista declarada bate EXATAMENTE com a realidade", () => {
    // Nos dois sentidos, e é a diferença entre uma declaração e um folclore: um campo novo sem
    // fixture precisa ser reconhecido, e um que passou a ser exercitado precisa SAIR da lista no
    // mesmo commit — senão ela sobrevive ao problema e vira permissão.
    expect(naoExercitados.sort(), "cobertura divergiu do declarado em PUBLICADO_SEM_FIXTURE").
      toEqual([...PUBLICADO_SEM_FIXTURE].sort());
  });

  it("a lista é pequena — ela existe para encolher", () => {
    expect(PUBLICADO_SEM_FIXTURE.length).toBeLessThanOrEqual(1);
  });
});
