import { describe, expect, it } from "vitest";
import { classifyListError } from "./listView";

describe("classifyListError — distingue sessão × recuperável × genérico", () => {
  it("authentication_required → sessão expirada", () => {
    expect(classifyListError("authentication_required")).toBe("session");
  });

  it("falha de rede (sem problem code) → recuperável", () => {
    expect(classifyListError(null)).toBe("recoverable");
  });

  it("temporarily_unavailable e capacity_wait → recuperável", () => {
    expect(classifyListError("temporarily_unavailable")).toBe("recoverable");
    expect(classifyListError("capacity_wait")).toBe("recoverable");
  });

  it("resposta inválida / não-recuperável → genérico", () => {
    expect(classifyListError("invalid_input")).toBe("generic");
    expect(classifyListError("forbidden_or_not_found")).toBe("generic");
    expect(classifyListError("non_retryable_failure")).toBe("generic");
  });
});
