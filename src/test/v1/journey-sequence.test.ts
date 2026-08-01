import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createV1Client, type V1Client, type AnalysisStatus } from "@/lib/v1";
import { MSW_BASE } from "@/test/msw/handlers";
import { server, setupMsw } from "@/test/msw/server";
import { journeyHandlers, resetJourney, seedJourney } from "@/test/msw/journey";

setupMsw();
let client: V1Client;
beforeAll(() => {
  client = createV1Client({ baseUrl: MSW_BASE, getAccessToken: async () => "tok" });
});
beforeEach(() => {
  resetJourney();
  server.use(...journeyHandlers);
});

const SCOPE = { workspaceId: "ws-1" };

describe("MSW stateful — sequência do contrato por analysis_id", () => {
  it("prepare→receiving→queued→…→completed, determinado pela operação", async () => {
    const handle = await client.prepare(SCOPE);
    expect(handle.status).toBe("preparing");
    const id = handle.analysis_id;

    expect((await client.uploadData(id, SCOPE, "{}\n")).status).toBe("receiving");
    expect((await client.submit(id, SCOPE)).status).toBe("queued");

    const seq: AnalysisStatus[] = [];
    for (let i = 0; i < 6; i += 1) seq.push((await client.getStatus(id, SCOPE)).status);

    // avança por poll até o terminal e para
    expect(seq[0]).toBe("queued"); // 1º poll após submit ainda é fila
    expect(seq).toContain("running");
    expect(seq).toContain("recovering");
    expect(seq).toContain("completed");
    expect(seq.indexOf("queued")).toBeLessThan(seq.indexOf("running"));
    expect(seq.indexOf("running")).toBeLessThan(seq.indexOf("completed"));
    expect(seq[seq.length - 1]).toBe("completed"); // terminal estável

    const final = await client.getStatus(id, SCOPE);
    expect(final.status).toBe("completed");
    expect(final.result_available).toBe(true);
    // Esta asserção de contrato só vale porque o payload DEFAULT da jornada não é o perfil
    // provisório: o fake backend declara a versão do que entrega. Fixado explicitamente para
    // que trocar o default não mude o SIGNIFICADO deste contrato em silêncio (Codex R4 [P1] —
    // a quebra alegada não ocorre, mas o acoplamento era implícito).
    const envelope = await client.getResult(id, SCOPE);
    expect(
      (envelope.result as { schema?: unknown } | null)?.schema,
      "payload default da jornada NÃO carrega marcador provisório",
    ).toBeUndefined();
    expect(envelope.result_schema_version).toBe("analysis-result-v1");
  });

  it("isolamento entre testes: o store foi resetado (nova análise recomeça)", async () => {
    const handle = await client.prepare(SCOPE);
    expect(handle.status).toBe("preparing"); // sem vazamento do teste anterior
  });

  it("seedJourney permite deep-link direto a um estado (recovering não é terminal)", async () => {
    seedJourney("an-x", ["recovering", "running", "completed"]);
    const s1 = await client.getStatus("an-x", SCOPE);
    expect(s1.status).toBe("recovering");
    expect(s1.retry_allowed).toBe(false); // recovering NÃO é falha
  });
});
