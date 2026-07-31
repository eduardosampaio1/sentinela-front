// Provider da fundação TanStack Query para a jornada canônica (Onda 6 E1).
//
// FUNDAÇÃO apenas: fornece um QueryClient canônico (política de retry + limpeza + sessão expirada)
// pronto para as etapas E2+. NÃO é montado em nenhuma rota viva nesta etapa — a migração de telas
// não faz parte da E1. Um cliente estável é criado uma única vez (ou injetado, para testes).

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createCanonicalQueryClient } from "./queryClient";

export interface CanonicalQueryProviderProps {
  children: ReactNode;
  /** Cliente já pronto (testes/casos avançados). Se ausente, um canônico é criado uma vez. */
  client?: QueryClient;
  /** Encaminhado ao cliente canônico: chamado quando uma query falha com authentication_required. */
  onAuthRequired?: () => void;
}

export function CanonicalQueryProvider({ children, client, onAuthRequired }: CanonicalQueryProviderProps) {
  // Criação única e estável entre renders (não recria o cache a cada render).
  const [cliente] = useState(() => client ?? createCanonicalQueryClient({ onAuthRequired }));
  return <QueryClientProvider client={cliente}>{children}</QueryClientProvider>;
}
