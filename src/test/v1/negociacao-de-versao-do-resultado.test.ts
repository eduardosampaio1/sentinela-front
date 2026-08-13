// F0 — a negociação de versão no CLIENTE. Quem escolhe a versão é quem pede.
//
// A decisão congelada do produtor: *versão é propriedade do documento solicitado, não decisão
// unilateral de quem o produziu*. Do lado do consumidor isso tem uma consequência exata e
// verificável: a requisição de quem **não** negocia precisa continuar idêntica à de antes.
//
// Um default aqui — ainda que fosse o valor histórico — faria o CLIENTE escolher a versão em
// nome de quem não escolheu, e a decisão inteira perderia o sentido no primeiro `?v=`.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createV1Client } from "@/lib/v1";
import { RESULT_VIEW } from "@/test/fixtures/public-v1/analyses";
import {
  CANONICAL_RESULT_V3_SCHEMA,
  PEDIDO_DE_V3,
} from "@/features/canonical-analysis/result/canonicalSchemaV3";
import { resolverResultado } from "@/features/canonical-analysis/result/adaptar";
import type { AnalysisResultView } from "@/lib/v1";

const SCOPE = { workspaceId: "ws-1" };
const RAIZ = resolve(__dirname, "../../..");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function makeClient(handler: (url: string) => Response) {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => handler(String(input)));
  const client = createV1Client({
    baseUrl: "https://gw.test/",
    getAccessToken: async () => "tok",
    fetchImpl: fetchImpl as unknown as typeof fetch,
    newCorrelationId: () => "corr-1",
    newIdempotencyKey: () => "idem-1",
  });
  return { client, fetchImpl };
}

const urlDe = (fetchImpl: { mock: { calls: unknown[][] } }) => String(fetchImpl.mock.calls[0][0]);

describe("negociação de versão do resultado", () => {
  it("SEM versão, a requisição não carrega `result_schema_version`", async () => {
    // A invariante de compatibilidade, medida na URL e não deduzida do código: nenhum cliente
    // existente muda de documento porque uma versão nova passou a existir.
    const { client, fetchImpl } = makeClient(() => jsonResponse(RESULT_VIEW));
    await client.getResult("an-1", SCOPE);

    const url = urlDe(fetchImpl);
    expect(url).toContain("/v1/analyses/an-1/result");
    expect(url).toContain("workspace_id=ws-1");
    expect(url).not.toContain("result_schema_version");
  });

  it("COM versão, o parâmetro viaja com o valor pedido", async () => {
    const { client, fetchImpl } = makeClient(() => jsonResponse(RESULT_VIEW));
    await client.getResult("an-1", SCOPE, undefined, PEDIDO_DE_V3);

    expect(urlDe(fetchImpl)).toContain(`result_schema_version=${PEDIDO_DE_V3}`);
  });

  it("string vazia é tratada como AUSÊNCIA, não como versão vazia", async () => {
    // `""` chegaria ao Gateway como `?result_schema_version=`, que ele normaliza para ausência.
    // Depender dessa normalização seria contar com o comportamento do outro lado; o cliente
    // resolve aqui, onde a intenção é conhecida.
    const { client, fetchImpl } = makeClient(() => jsonResponse(RESULT_VIEW));
    await client.getResult("an-1", SCOPE, undefined, "");

    expect(urlDe(fetchImpl)).not.toContain("result_schema_version");
  });

  it("o valor pedido é UM só, e é o que o produtor declara aceitar", () => {
    // O Orchestrator aceita três grafias. Escolher uma no cliente evita que a mesma requisição
    // apareça de três formas no log — divergência que só aparece quando alguém compara.
    expect(PEDIDO_DE_V3).toBe("3");
    expect(CANONICAL_RESULT_V3_SCHEMA).toBe("analysis-result-v3");
  });
});

describe("a superfície LEGADA continua fail-closed diante do v3", () => {
  it("um documento v3 NÃO é adaptado pela fronteira do /result", () => {
    // `adaptar.ts` resolve v1 e v2 — as duas árvores que a página legada sabe desenhar. Um v3
    // chegando ali precisa virar recusa explícita, e **não** ser oferecido ao adapter do v1
    // "para ver se aproveita algo": o v1 aceitaria a espinha comum (indicadores, recomendações)
    // e descartaria as dez outras famílias em silêncio, com a tela parecendo completa.
    const documentoV3 = {
      analysis_id: "an-1",
      result_schema_version: CANONICAL_RESULT_V3_SCHEMA,
      indicator_registry_version: "1.0",
      result: {
        analysis_id: "an-1",
        result_schema_version: CANONICAL_RESULT_V3_SCHEMA,
        indicator_registry_version: "1.0",
        measurement_contract_version: "measurement-1.0",
        argos_catalog_version: "argos-catalog-1.0",
        method: {},
        partiality: {},
        summary: {},
        indicators: [],
      },
    } as unknown as AnalysisResultView;

    const resolvido = resolverResultado(documentoV3, "en");
    expect(resolvido.contrato).toBe("nenhum");
    if (resolvido.contrato === "nenhum") {
      expect(resolvido.schemaVersion).toBe(CANONICAL_RESULT_V3_SCHEMA);
      expect(resolvido.reason).toBe("unknown_schema");
    }
  });

  it("nenhuma página existente passa a pedir v3 nesta fase", () => {
    // F0 é intake de contrato. Se `useAnalysisResult` já negociasse, a página legada mudaria de
    // documento sem que ninguém tivesse desenhado a tela — e o v3 cairia no fail-closed acima,
    // trocando um resultado que funciona por uma recusa.
    const consumidores = [
      "src/features/canonical-analysis/ui/ResultPage.tsx",
      "src/features/canonical-analysis/ui/CompareAnalysesPage.tsx",
      "src/features/canonical-analysis/data/analysis.ts",
    ];
    for (const arquivo of consumidores) {
      const fonte = readFileSync(resolve(RAIZ, arquivo), "utf-8");
      expect(
        fonte.includes("result_schema_version") || fonte.includes("PEDIDO_DE_V3"),
        `${arquivo} passou a negociar versão na F0`,
      ).toBe(false);
    }
  });
});
