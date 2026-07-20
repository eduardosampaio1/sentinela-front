/**
 * Fatia 4 (front) — saveAnalysisRun nao pode escrever no Supabase sob keycloak.
 *
 * Sob SENTINELA_AUTH_PROVIDER=keycloak o sistema de registro e o Postgres do
 * Railway, e quem persiste o analysis_run e o BACKEND (materializador de
 * resultados). A escrita do front e residuo da era Supabase: as leituras ja
 * foram gateadas (getLatestAnalysisRun/getAnalysisRunById), esta nao.
 *
 * Sob keycloak o `supabase` e um client placeholder (createClient("")), entao
 * a escrita falha e o usuario leva um toast "History sync failed" por algo que
 * na verdade JA foi persistido pelo backend.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const provider = { value: "supabase" };
const insertSpy = vi.fn();

vi.mock("@/lib/auth/index", () => ({
  getAuthClient: () => ({ provider: provider.value }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => {
        insertSpy(table, row);
        return {
          select: () => ({
            single: async () => ({ data: { id: "supabase-run-1" }, error: null }),
          }),
        };
      },
    }),
  },
}));

vi.mock("@/lib/gatewayContext", () => ({
  gwListAnalysisRuns: vi.fn(),
  gwLatestAnalysisRun: vi.fn(),
  gwAnalysisRunById: vi.fn(),
}));

const PARAMS = {
  workspaceId: "ws-1",
  projectId: "proj-1",
  environmentId: "env-1",
  createdBy: "user-1",
  sourceFilename: "dataset.jsonl",
  inputHash: "hash-1",
  result: { analysis_id: "a-1", n_conversations: 12 } as Record<string, unknown>,
};

describe("saveAnalysisRun — gating por provider", () => {
  beforeEach(() => {
    insertSpy.mockClear();
    provider.value = "supabase";
  });

  it("nao escreve no Supabase quando o provider e keycloak", async () => {
    provider.value = "keycloak";
    const { saveAnalysisRun } = await import("@/lib/analysisRuns");

    const saved = await saveAnalysisRun(PARAMS);

    expect(insertSpy).not.toHaveBeenCalled();
    expect(saved).toBeNull();
  });

  it("nao lanca sob keycloak (o caller trataria como 'History sync failed')", async () => {
    provider.value = "keycloak";
    const { saveAnalysisRun } = await import("@/lib/analysisRuns");

    await expect(saveAnalysisRun(PARAMS)).resolves.toBeNull();
  });

  it("lanca sob keycloak quando a persistencia e obrigatoria (import por JSON colado)", async () => {
    // importAnalysisResult nao chama o backend: saveAnalysisRun e a UNICA
    // persistencia. Retornar null ali faria a UI dizer "Analysis result
    // imported" sem ter gravado nada — sucesso falso.
    provider.value = "keycloak";
    const { saveAnalysisRun } = await import("@/lib/analysisRuns");

    await expect(
      saveAnalysisRun({ ...PARAMS, requirePersistence: true }),
    ).rejects.toThrow(/not supported/i);
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it("mantem a escrita no Supabase quando o provider e supabase", async () => {
    provider.value = "supabase";
    const { saveAnalysisRun } = await import("@/lib/analysisRuns");

    const saved = await saveAnalysisRun(PARAMS);

    expect(insertSpy).toHaveBeenCalledTimes(1);
    const [table, row] = insertSpy.mock.calls[0];
    expect(table).toBe("analysis_runs");
    expect(row.workspace_id).toBe("ws-1");
    expect(saved).toMatchObject({ id: "supabase-run-1" });
  });
});
