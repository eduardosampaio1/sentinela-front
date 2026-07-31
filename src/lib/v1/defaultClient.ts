// Cliente canônico `/v1` DEFAULT — fia a base URL do env e o token do seam de auth do contexto
// autenticado. SEM fallback para `onrender`/segunda base. Usado pelas jornadas a partir da E2.

import { getAuthClient } from "@/lib/auth/index";
import { createV1Client, type V1Client } from "./client";

/** Base URL do Gateway a partir do env. Sem default de produção (fail-explicit). */
export function resolveGatewayBaseUrl(): string {
  const bruto = String(import.meta.env.VITE_SENTINELA_API_URL ?? "").trim();
  if (!bruto) {
    throw new Error("VITE_SENTINELA_API_URL ausente: a jornada canônica /v1 exige o Gateway configurado.");
  }
  return bruto.replace(/\/+$/, "");
}

let cliente: V1Client | null = null;

/** Cliente canônico singleton (token do contexto autenticado; base do env). */
export function getV1Client(): V1Client {
  if (!cliente) {
    cliente = createV1Client({
      baseUrl: resolveGatewayBaseUrl(),
      getAccessToken: () => getAuthClient().getAccessToken(),
    });
  }
  return cliente;
}
