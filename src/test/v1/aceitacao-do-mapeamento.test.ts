// O limite de registros válidos: o que viaja, e o que NÃO viaja.
//
// ## O caso que originou
//
// Medido em homologação em 2026-08-24, com base real de atendimento (Chatwoot): 61.423 turnos
// entraram, 100 foram recusados (0,16%) e o arquivo inteiro foi rejeitado. Os 100 eram 71
// conversas em que ninguém respondeu ao cliente e 29 mensagens que continham apenas um documento
// e ficaram vazias depois do Privacy Gate.
//
// A política de aceitação existia no Ingestion desde sempre — `strict`, `threshold`, `partial` —
// e nunca tinha sido publicada, porque *"é uma decisão de produto que ninguém tomou"*. O efeito
// foi que adiar decidiu: o default estrito recusa qualquer base real.

import { describe, expect, it } from "vitest";

import { createV1Client } from "@/lib/v1";

const ESCOPO = { workspaceId: "ws-1" } as never;
const REGRAS = { conversation_id: { source: "id" } };

/** Um cliente cujo `fetch` só guarda o que foi enviado. */
function clienteEspiao() {
  const enviados: Record<string, unknown>[] = [];
  const client = createV1Client({
    baseUrl: "https://gw.test",
    getAccessToken: async () => "tok",
    newCorrelationId: () => "corr-1",
    newIdempotencyKey: () => "idem-1",
    fetchImpl: (async (_url: string, init: RequestInit) => {
      enviados.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ analysis_id: "a-1", ingestion_state: "mapped" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }) as never,
  });
  return { client, enviados };
}

describe("aceitação do mapeamento", () => {
  it("sem escolha, a chave NÃO viaja", async () => {
    // Omitir é diferente de mandar o default. Enviar `min_valid_ratio: 1` daria o mesmo
    // resultado hoje e criaria uma segunda fonte para a mesma decisão: no dia em que o dono
    // mudasse o default, o Front continuaria impondo o antigo sem ninguém notar.
    const { client, enviados } = clienteEspiao();

    await client.confirmAnalysisMapping("a-1", ESCOPO, REGRAS, [], undefined);

    expect(enviados[0]).not.toHaveProperty("min_valid_ratio");
    expect(Object.keys(enviados[0]).sort()).toEqual(["group_by", "rules"]);
  });

  it("com limite escolhido, o número viaja", async () => {
    const { client, enviados } = clienteEspiao();

    await client.confirmAnalysisMapping("a-1", ESCOPO, REGRAS, [], 0.95);

    expect(enviados[0].min_valid_ratio).toBe(0.95);
  });

  it("o limite de 0.95 aceitaria a base real que foi recusada", async () => {
    // 61.323 de 61.423 são 99,84%. O caso concreto amarra a superfície nova ao incidente que a
    // justificou — sem isto, o número escolhido para a tela seria arbitrário.
    const proporcaoDaBaseReal = 61323 / 61423;

    expect(proporcaoDaBaseReal).toBeGreaterThan(0.95);
    expect(proporcaoDaBaseReal).toBeLessThan(1);
  });

  it("zero é um limite legítimo e não é colapsado em ausência", async () => {
    // `0` significa "aceito qualquer coisa que sobre". É uma escolha extrema e é uma escolha —
    // e um `if (minValidRatio)` a trataria como não-escolha, porque zero é falsy. Este caso
    // existe para que ninguém troque a comparação explícita por um teste de veracidade.
    const { client, enviados } = clienteEspiao();

    await client.confirmAnalysisMapping("a-1", ESCOPO, REGRAS, [], 0);

    expect(enviados[0]).toHaveProperty("min_valid_ratio", 0);
  });
});
