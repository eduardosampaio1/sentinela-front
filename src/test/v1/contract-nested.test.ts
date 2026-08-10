// WS-A4 — o gate de superfície não pode dar falsa segurança olhando o nível errado.
//
// `analytics_read_model_fields` lista `snapshot` e não o abre. Procurar `method_id` no contrato de
// topo devolve "não existe" — e devolveu, na revisão. A superfície aninhada vive nos contratos
// Pydantic do produtor, e é lá que este gate vai buscá-la.
//
// A comparação é POR PROJEÇÃO. Agregar tudo num conjunto único esconde o caso interessante:
// `min_group_size` é lido numa projeção e não em outras duas — e o conjunto único diria "não
// lido", meio errado nas duas direções.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyticsDisponivel,
  compararProjecao,
  CONTRATO_ANALYTICS_PUBLICADO,
  projecoesPublicadas,
  projecoesTypeScript,
  type Projecao,
} from "./nestedProjection";
import { DERIVADOS_DO_VIEW_MODEL, PUBLICADO_E_NAO_LIDO } from "./divergenciaDeclarada";

const RAIZ = resolve(__dirname, "../../..");
const PROJECAO_TS = resolve(RAIZ, "src/features/canonical-analysis/result/analyticsProjection.ts");
const disponivel = analyticsDisponivel();

/** Campo do fio é `snake_case`; `camelCase` é derivação do view model, fora da comparação. */
const doFio = (campo: string) => !/[A-Z]/.test(campo);

function lados() {
  const py = new Map<string, Projecao>();
  {
    for (const [nome, p] of projecoesPublicadas()) {
      // Bases privadas não são projeção pública — só contribuem campos por herança.
      if (!nome.startsWith("_")) py.set(nome, p);
    }
  }
  const ts = projecoesTypeScript(readFileSync(PROJECAO_TS, "utf-8"));
  const comuns = [...ts.keys()].filter((n) => py.has(n)).sort();
  return { py, ts, comuns };
}

describe("WS-A4 · superfície pública ANINHADA", () => {
  it("o produtor da superfície aninhada está no disco — ou alguém declarou que não está", () => {
    // Mesmo padrão fail-closed do A1: sem o repo do produtor, os casos abaixo não rodam e este
    // arquivo não verificou nada. Ausência precisa aparecer no comando.
    if (disponivel) return;
    expect(
      process.env.SENTINELA_ANALYTICS_ORIGIN_ABSENT === "1",
      `contrato publicado não encontrado em ${CONTRATO_ANALYTICS_PUBLICADO}. Os casos de comparação ` +
        "NÃO rodaram. Para rodar assim de propósito, declare SENTINELA_ANALYTICS_ORIGIN_ABSENT=1.",
    ).toBe(true);
  });

  it.runIf(disponivel)("as duas representações compartilham projeções nomeadas", () => {
    const { comuns } = lados();
    // Sem projeções em comum, todo caso abaixo passaria por vacuidade — verde por não comparar
    // nada é o defeito que esta casa já pagou várias vezes.
    expect(comuns.length, "nenhuma projeção com nome comum entre produtor e front").toBeGreaterThan(6);
  });

  it.runIf(disponivel)("o front NUNCA lê campo do FIO que o produtor não publica", () => {
    // A direção que não admite dívida. Um campo do fio lido e não publicado é invenção: chega
    // `undefined` em produção e a tela mostra o que ninguém mediu.
    const { py, ts, comuns } = lados();
    const inventados: string[] = [];
    for (const nome of comuns) {
      const d = compararProjecao(py.get(nome)!, ts.get(nome)!);
      inventados.push(...d.lido_sem_publicacao.filter(doFio).map((c) => `${nome}.${c}`));
    }
    expect(inventados).toEqual([]);
  });

  it.runIf(disponivel)("todo campo só-do-front é DERIVAÇÃO declarada, não campo perdido", () => {
    // O híbrido é legítimo: `blocosNaoApresentados` e companhia são o que a tela precisa para
    // dizer "recebi mais do que mostro". Legítimo, mas não pode ser porta dos fundos — um
    // `camelCase` novo e não declarado fica vermelho.
    const { py, ts, comuns } = lados();
    const derivados = new Set<string>();
    for (const nome of comuns) {
      compararProjecao(py.get(nome)!, ts.get(nome)!)
        .lido_sem_publicacao.filter((c) => !doFio(c))
        .forEach((c) => derivados.add(c));
    }
    expect([...derivados].sort()).toEqual([...DERIVADOS_DO_VIEW_MODEL].sort());
  });

  it.runIf(disponivel)("os campos publicados e não lidos são EXATAMENTE os declarados, por projeção", () => {
    // A dívida em si. Um campo novo do produtor entra aqui e fica vermelho — que é o aviso de que
    // a superfície cresceu sem ninguém decidir se a tela usa.
    const { py, ts, comuns } = lados();
    const real: Record<string, string[]> = {};
    for (const nome of comuns) {
      const naoLidos = compararProjecao(py.get(nome)!, ts.get(nome)!).publicado_e_nao_lido;
      if (naoLidos.length) real[nome] = naoLidos;
    }
    const declarado = Object.fromEntries(
      Object.entries(PUBLICADO_E_NAO_LIDO).map(([k, v]) => [k, [...v].sort()]),
    );
    expect(real).toEqual(declarado);
  });

  it.runIf(disponivel)("`min_group_size` é publicado E lido na distribuição — a prova do erro corrigido", () => {
    // Caso nomeado de propósito. É a âncora de §10 do Blueprint: se um dia sair do front, este
    // gate acusa antes de alguém voltar a escrever "não existe no contrato público".
    const { py, ts } = lados();
    expect(py.get("ResumoDeDistribuicao")!.campos).toContain("min_group_size");
    expect(ts.get("ResumoDeDistribuicao")!.campos).toContain("min_group_size");
  });

  it.runIf(disponivel)("nullability contratual não diverge entre produtor e front", () => {
    // `other_count` é `int | None` no produtor, com nota de que `null` não é zero. Se o front o
    // declarasse não-anulável, a ausência viraria zero na tela.
    const { py, ts, comuns } = lados();
    const divergentes: string[] = [];
    for (const nome of comuns) {
      divergentes.push(
        ...compararProjecao(py.get(nome)!, ts.get(nome)!).nullability_mismatch.filter((m) =>
          doFio(m.split(".")[1]?.split(":")[0] ?? ""),
        ),
      );
    }
    expect(divergentes).toEqual([]);
  });
});
