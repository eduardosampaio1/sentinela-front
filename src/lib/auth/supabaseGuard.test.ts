import { describe, expect, it } from "vitest";
import { supabaseClientArgs, assertSupabaseEnv } from "./supabaseGuard";

describe("supabaseClientArgs", () => {
  it("keycloak sem env -> placeholder não-vazio (createClient não quebra)", () => {
    const a = supabaseClientArgs("keycloak", "", "");
    expect(a.url).toBeTruthy();
    expect(a.key).toBeTruthy();
  });

  it("supabase passa a env real adiante", () => {
    expect(supabaseClientArgs("supabase", "https://p.supabase.co", "k")).toEqual({
      url: "https://p.supabase.co",
      key: "k",
    });
  });

  it("keycloak com env real presente usa a env real", () => {
    expect(supabaseClientArgs("keycloak", "https://p.supabase.co", "k")).toEqual({
      url: "https://p.supabase.co",
      key: "k",
    });
  });
});

describe("assertSupabaseEnv (preserva o comportamento supabase-mode)", () => {
  it("supabase + faltando + PROD -> lança", () => {
    expect(() => assertSupabaseEnv("supabase", "", "", true)).toThrow();
  });

  it("supabase + faltando + dev -> não lança", () => {
    expect(() => assertSupabaseEnv("supabase", "", "", false)).not.toThrow();
  });

  it("keycloak + faltando + PROD -> NÃO lança (Supabase é opcional no modo keycloak)", () => {
    expect(() => assertSupabaseEnv("keycloak", "", "", true)).not.toThrow();
  });

  it("supabase + presente -> não lança", () => {
    expect(() => assertSupabaseEnv("supabase", "https://p.supabase.co", "k", true)).not.toThrow();
  });
});
