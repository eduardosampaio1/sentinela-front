// Verificação CRUZADA: o frontend consome o resultado que o BACKEND produziu de verdade.
//
// Duas suítes verdes não provam que dois repositórios se falam. Aqui o corpo não é escrito
// neste repositório: ele é a resposta LITERAL de `GET /v1/analyses/{id}/result`, gravada
// pelo E2E canônico do `sentinela` depois de atravessar código analítico real → facts →
// Worker → Orchestrator + Assembler → Postgres → Gateway.
//
// Sem MSW, sem fixture desta casa, sem `as` amplo: o mesmo adapter que a UI usa recebe o
// mesmo JSON que a API devolveu.
//
// Se o artefato não existir, este arquivo FALHA — não passa calado. Um gate cruzado que
// some quando a outra ponta não rodou é pior que gate nenhum: ele reporta verde sem ter
// verificado nada, e é assim que "os dois repos conversam" vira crença.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { adaptAnalysisResult } from "@/features/canonical-analysis/result/adapter";
import { INDICATOR_DESCRIPTORS } from "@/features/canonical-analysis/result/descriptors";
import type { AnalysisResultView } from "@/lib/v1";

const RAIZ = resolve(__dirname, "../../..");
/** Caminho combinado entre os repositórios; o produtor é `tests/test_e2e_cadeia_canonica.py`. */
const CANDIDATOS = [
  resolve(RAIZ, "../sentinela-facts/docs/contracts/e2e/analysis-result-v1.real.json"),
  resolve(RAIZ, "../sentinela/docs/contracts/e2e/analysis-result-v1.real.json"),
];
const ARTEFATO = CANDIDATOS.find((p) => existsSync(p));

const COMO_GERAR =
  "Rode o E2E canonico no repo `sentinela`:\n" +
  "  SENTINELA_ORCHESTRATOR_SRC=<orchestrator>/src \\\n" +
  "  ORCHESTRATOR_TEST_DATABASE_URL=<dsn> ORCHESTRATOR_TEST_MINIO_ENDPOINT=<minio> \\\n" +
  "  python -m pytest tests/test_e2e_cadeia_canonica.py";

describe("resultado REAL do backend × adapter do frontend", () => {
  it("o artefato produzido pela cadeia existe", () => {
    expect(
      ARTEFATO,
      `artefato do E2E cruzado ausente em:\n  ${CANDIDATOS.join("\n  ")}\n\n${COMO_GERAR}`,
    ).toBeTruthy();
  });

  const carregar = (): { resposta: AnalysisResultView; procedencia: Record<string, string> } => {
    const bruto = JSON.parse(readFileSync(ARTEFATO as string, "utf-8"));
    return { resposta: bruto.resposta, procedencia: bruto._procedencia };
  };

  it.runIf(ARTEFATO)("o artefato declara a cadeia que o produziu", () => {
    // Sem procedência, ninguém sabe se este JSON veio da cadeia ou foi colado à mão — e a
    // diferença é justamente o que este arquivo existe para garantir.
    const { procedencia } = carregar();
    expect(procedencia.cadeia).toContain("Assembler");
    expect(procedencia.cadeia).toContain("Gateway");
    expect(procedencia.gerado_por).toContain("test_e2e_cadeia_canonica");
  });

  it.runIf(ARTEFATO)("o adapter REAL aceita o documento REAL", () => {
    const { resposta } = carregar();
    const r = adaptAnalysisResult(resposta);
    expect(r.status, r.status === "unsupported" ? `recusado: ${r.reason}` : "").toBe("supported");
  });

  it.runIf(ARTEFATO)("todo indicador que o backend produziu tem nome na UI", () => {
    // O buraco que isto fecha: backend e frontend evoluindo em repositórios separados. Se o
    // registro ganhar um indicador e a UI não souber nomeá-lo, ele fica invisível para o
    // usuário — e nada no backend acusaria.
    const { resposta } = carregar();
    const r = adaptAnalysisResult(resposta);
    if (r.status !== "supported") throw new Error(`documento real recusado: ${r.reason}`);
    expect(r.view.unsupportedIndicatorIds, "indicadores sem descriptor").toEqual([]);
    expect(r.view.indicators.length).toBeGreaterThan(0);
  });

  it.runIf(ARTEFATO)("nenhum descriptor da UI é órfão do registro do backend", () => {
    // O outro lado do mesmo risco: rótulo que sobreviveu à remoção do indicador no backend
    // vira promessa que a análise não cumpre mais.
    const { resposta } = carregar();
    const doBackend = new Set(
      ((resposta.result as { indicators: { id: string }[] }).indicators ?? []).map((i) => i.id),
    );
    const orfaos = Object.keys(INDICATOR_DESCRIPTORS).filter((id) => !doBackend.has(id));
    expect(orfaos, "descriptors sem indicador correspondente no backend").toEqual([]);
  });

  it.runIf(ARTEFATO)("os números chegam à UI sem serem recalculados", () => {
    const { resposta } = carregar();
    const r = adaptAnalysisResult(resposta);
    if (r.status !== "supported") throw new Error(r.reason);
    const doDocumento = new Map(
      (resposta.result as { indicators: { id: string; value: number | null }[] }).indicators.map(
        (i) => [i.id, i.value],
      ),
    );
    for (const item of r.view.indicators) {
      expect(item.rawValue, `${item.id} mudou de valor na fronteira`).toBe(
        doDocumento.get(item.id),
      );
    }
  });

  it.runIf(ARTEFATO)("a procedência do documento acompanha a view", () => {
    const { resposta } = carregar();
    const r = adaptAnalysisResult(resposta);
    if (r.status !== "supported") throw new Error(r.reason);
    expect(r.view.schemaVersion).toBe("analysis-result-v1");
    expect(r.view.indicatorRegistryVersion).toBeTruthy();
  });

  it.runIf(ARTEFATO)("o corpo real não carrega nada interno", () => {
    const texto = readFileSync(ARTEFATO as string, "utf-8");
    for (const proibido of [
      "assembly_manifest",
      "withheld_internal_fields",
      "lease_token",
      "worker_id",
      "attempt_id",
    ]) {
      expect(texto.includes(proibido), `${proibido} veio no corpo publico`).toBe(false);
    }
  });
});
