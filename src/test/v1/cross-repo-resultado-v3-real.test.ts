// F0 — verificação CRUZADA do `analysis-result-v3`: o frontend lê o que o backend produziu.
//
// Mesmo princípio do `cross-repo-resultado-real.test.ts` e pelo mesmo motivo: duas suítes
// verdes não provam que dois repositórios se falam. O corpo aqui não é escrito nesta casa —
// é a resposta LITERAL de
//
//     GET /v1/analyses/{id}/result?result_schema_version=3
//
// gravada pela prova P10 do `sentinela-orchestrator` depois de atravessar massa do produtor
// real → relatório terminal por rotas HTTP reais → Assembler v3 → Result Store (Postgres) →
// negociação de versão.
//
// Se o artefato não existir, este arquivo FALHA — não passa calado. Um gate cruzado que some
// quando a outra ponta não rodou reporta verde sem ter verificado nada.
//
// ## O que este arquivo NÃO faz
//
// Não renderiza. F0 é intake de contrato: a tela do ARGOS é da F3. Aqui prova-se que o
// documento real ATRAVESSA a fronteira de tipos e validação desta casa — que é a pergunta
// que precisa estar respondida antes de existir superfície.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CANONICAL_RESULT_V3_SCHEMA,
  DIMENSOES_DE_SAUDE,
  FAMILIAS_ARGOS,
  familiaFoiProduzida,
  validarResultadoV3,
} from "@/features/canonical-analysis/result/canonicalSchemaV3";
import type { AnalysisResultView } from "@/lib/v1";

const RAIZ = resolve(__dirname, "../../..");
const CANDIDATOS = [
  resolve(RAIZ, "../sentinela-facts/docs/contracts/e2e/analysis-result-v3.real.json"),
];
const ARTEFATO = CANDIDATOS.find((p) => existsSync(p));

const COMO_GERAR =
  "Rode a prova P10 no repo `sentinela-orchestrator`:\n" +
  "  SENTINELA_REGENERA_FIXTURE=1 ORCHESTRATOR_TEST_DATABASE_URL=<dsn> \\\n" +
  "  PYTHONPATH=src python -m pytest tests/integration/test_p10_resposta_literal_v3.py";

describe("analysis-result-v3 REAL do backend × fronteira do frontend", () => {
  it("o artefato produzido pela cadeia existe", () => {
    expect(
      ARTEFATO,
      `artefato v3 ausente em:\n  ${CANDIDATOS.join("\n  ")}\n\n${COMO_GERAR}`,
    ).toBeTruthy();
  });

  const carregar = (): { resposta: AnalysisResultView; procedencia: Record<string, string> } => {
    const bruto = JSON.parse(readFileSync(ARTEFATO as string, "utf-8"));
    return { resposta: bruto.resposta, procedencia: bruto._procedencia };
  };

  it.runIf(ARTEFATO)("o artefato declara a cadeia que o produziu", () => {
    // Sem procedência, um JSON parado no disco é indistinguível de massa escrita à mão — e a
    // prova cruzada perderia justamente o que a torna cruzada.
    const { procedencia } = carregar();
    expect(procedencia.cadeia).toContain("result_schema_version=3");
    expect(procedencia.gerado_por).toContain("test_p10");
  });

  it.runIf(ARTEFATO)("o envelope real declara o v3", () => {
    const { resposta } = carregar();
    expect(resposta.result_schema_version).toBe(CANONICAL_RESULT_V3_SCHEMA);
  });

  it.runIf(ARTEFATO)("o documento real ATRAVESSA a validação de fronteira", () => {
    // A prova que importa para F0: o validador desta casa aceita o documento que o produtor
    // realmente emite. Um validador exigente demais rejeitaria produção; um frouxo aceitaria
    // qualquer coisa. Só o documento real separa os dois casos.
    const { resposta } = carregar();
    const v = validarResultadoV3(resposta.result_schema_version, resposta.result);
    expect(v.status, v.status === "recusado" ? `recusado: ${v.reason}` : "").toBe("ok");
  });

  it.runIf(ARTEFATO)("as quatro dimensões de saúde chegam, e são quatro", () => {
    const { resposta } = carregar();
    const v = validarResultadoV3(resposta.result_schema_version, resposta.result);
    if (v.status !== "ok") throw new Error("documento real recusado");

    const ids = (v.documento.dimensions ?? []).map((d) => d.id).sort();
    expect(ids).toEqual([...DIMENSOES_DE_SAUDE].sort());
  });

  it.runIf(ARTEFATO)("nenhuma medição sem valor traz zero", () => {
    // O defeito que abriu o Recovery inteiro, conferido no documento real. `not_measured` com
    // `value: 0` e `measured` com `value: 0` são a mesma tela e decisões opostas.
    const { resposta } = carregar();
    const v = validarResultadoV3(resposta.result_schema_version, resposta.result);
    if (v.status !== "ok") throw new Error("documento real recusado");

    for (const ind of v.documento.indicators ?? []) {
      if (ind.state !== "measured" && ind.state !== "partially_measured") {
        expect(ind.value ?? null, `${ind.id}: ${ind.state} com valor`).toBeNull();
      }
    }
  });

  it.runIf(ARTEFATO)("toda medição publica motivo e escala", () => {
    const { resposta } = carregar();
    const v = validarResultadoV3(resposta.result_schema_version, resposta.result);
    if (v.status !== "ok") throw new Error("documento real recusado");

    const indicadores = v.documento.indicators ?? [];
    expect(indicadores.length, "documento sem indicador — a prova seria vazia").toBeGreaterThan(0);
    for (const ind of indicadores) {
      expect(ind.reason, `${ind.id} sem motivo`).toBeTruthy();
      expect(ind.scale?.kind, `${ind.id} sem escala`).toBeTruthy();
    }
  });

  it.runIf(ARTEFATO)("família OMITIDA é distinguível de família vazia no documento real", () => {
    // A massa real tem famílias sem produtor. Elas precisam chegar como ausentes — se chegassem
    // `[]`, a tela diria "procuramos e não há", que é afirmação que ninguém fez.
    const { resposta } = carregar();
    const v = validarResultadoV3(resposta.result_schema_version, resposta.result);
    if (v.status !== "ok") throw new Error("documento real recusado");

    const produzidas = FAMILIAS_ARGOS.filter((f) => familiaFoiProduzida(v.documento, f));
    const omitidas = FAMILIAS_ARGOS.filter((f) => !familiaFoiProduzida(v.documento, f));

    expect(produzidas.length, "nenhuma família produzida — prova vazia").toBeGreaterThan(0);
    expect(omitidas.length, "nenhuma família omitida — a distinção não seria exercida").toBeGreaterThan(0);

    const bruto = resposta.result as Record<string, unknown>;
    for (const familia of omitidas) {
      expect(Array.isArray(bruto[familia]), `${familia} veio como lista`).toBe(false);
    }
  });

  it.runIf(ARTEFATO)("o documento real não carrega vocabulário do Analytics", () => {
    const { resposta } = carregar();
    const bruto = JSON.stringify(resposta.result);
    for (const proibido of [
      "projection_digest",
      "snapshot_digest",
      "snapshot_contract_version",
      "component_status",
      "concentrations",
      "time_series",
    ]) {
      expect(bruto.includes(proibido), `o v3 carrega \`${proibido}\` do Analytics`).toBe(false);
    }
  });
});
