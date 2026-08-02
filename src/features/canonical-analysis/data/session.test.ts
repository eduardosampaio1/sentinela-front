import { describe, expect, it } from "vitest";
import { resolverWorkspaceAtivo } from "./session";
import type { WorkspaceMembershipView } from "@/lib/v1";

/**
 * O workspace ativo é **preferência local**; a autoridade é a lista projetada pelo Gateway.
 *
 * A regra que estes testes congelam é a mais fácil de perder num refactor: uma preferência que
 * não está na projeção tem de ser **descartada**, não honrada. Honrá-la faria o app pedir dados
 * de um workspace que o backend nega — e o usuário veria uma tela de erro no lugar de um
 * seletor funcionando.
 */

const A: WorkspaceMembershipView = { id: "ws-a", name: "Acme", role: "owner" };
const B: WorkspaceMembershipView = { id: "ws-b", name: "Globex", role: "viewer" };

describe("workspace ativo: preferência local, autoridade do Gateway", () => {
  it("honra a preferência quando ela está na lista projetada", () => {
    expect(resolverWorkspaceAtivo([A, B], "ws-b")).toEqual(B);
  });

  it("DESCARTA a preferência que não está na projeção", () => {
    // ex.: o usuário foi removido de `ws-z` desde o último login.
    expect(resolverWorkspaceAtivo([A, B], "ws-z")).toEqual(A);
  });

  it("sem preferência, usa o primeiro da lista (ordem do Gateway)", () => {
    expect(resolverWorkspaceAtivo([A, B], null)).toEqual(A);
  });

  it("lista vazia é estado legítimo e devolve null, não erro", () => {
    // "não pertenço a nada" ≠ "sessão morreu"; a tela certa para cada um é diferente.
    expect(resolverWorkspaceAtivo([], "ws-a")).toBeNull();
    expect(resolverWorkspaceAtivo([], null)).toBeNull();
  });

  it("preferência vazia não é tratada como id", () => {
    expect(resolverWorkspaceAtivo([A, B], "")).toEqual(A);
  });
});
