import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useIdempotencyIntent } from "./intent";

describe("useIdempotencyIntent — chave por intenção do usuário", () => {
  it("ensure() reusa a MESMA chave (retry da mesma intenção), não gera por render", () => {
    const { result, rerender } = renderHook(() => useIdempotencyIntent());
    const k1 = result.current.ensure();
    const k2 = result.current.ensure();
    rerender();
    const k3 = result.current.ensure();
    expect(k1).toBe(k2);
    expect(k1).toBe(k3);
    expect(result.current.peek()).toBe(k1);
  });

  it("reset() encerra a intenção → próxima ensure() gera chave NOVA", () => {
    const { result } = renderHook(() => useIdempotencyIntent());
    const k1 = result.current.ensure();
    result.current.reset();
    expect(result.current.peek()).toBeNull();
    const k2 = result.current.ensure();
    expect(k2).not.toBe(k1);
  });
});
