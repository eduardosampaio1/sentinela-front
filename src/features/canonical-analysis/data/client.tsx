// Contexto do cliente canônico `/v1` para a jornada (Onda 6 E2/E3).
//
// Em produção usa o singleton `getV1Client()` (base do env, fail-explicit). Em teste/dev injeta-se
// um cliente (MSW). A jornada consome SÓ isto — nunca `lib/api` legado. Pura: só toca `@/lib/v1`.

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getV1Client } from "@/lib/v1/defaultClient";
import type { V1Client } from "@/lib/v1";

const CanonicalClientContext = createContext<V1Client | null>(null);

export function CanonicalClientProvider({
  client,
  children,
}: {
  client?: V1Client;
  children: ReactNode;
}) {
  // Sem cliente injetado, constrói o singleton (lazy — captura o fetch já instrumentado em dev).
  const value = useMemo(() => client ?? getV1Client(), [client]);
  return <CanonicalClientContext.Provider value={value}>{children}</CanonicalClientContext.Provider>;
}

export function useV1Client(): V1Client {
  const client = useContext(CanonicalClientContext);
  if (!client) throw new Error("useV1Client requer <CanonicalClientProvider>");
  return client;
}
