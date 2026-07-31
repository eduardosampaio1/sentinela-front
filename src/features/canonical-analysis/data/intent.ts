// Idempotency-Key ligada a UMA intenção explícita do usuário (Onda 6 E2, item 3).
//
// A chave é gerada quando a intenção começa e REUSADA em retries da MESMA intenção (inclusive
// tentativas de rede) — nunca por render. Só troca quando a intenção anterior teve desfecho
// DEFINITIVO (reset). Nunca vai para log/URL/telemetry (é usada só como header pelo cliente E1).

import { useCallback, useRef } from "react";
import { novoId } from "@/lib/v1/client";

export interface IdempotencyIntent {
  /** Garante uma chave para a intenção atual (cria na primeira vez, reusa depois). */
  ensure: () => string;
  /** Chave atual sem criar (null se nenhuma intenção ativa). */
  peek: () => string | null;
  /** Encerra a intenção: o próximo `ensure` cria uma chave nova. Chamar só em desfecho definitivo. */
  reset: () => void;
}

export function useIdempotencyIntent(): IdempotencyIntent {
  const keyRef = useRef<string | null>(null);
  const ensure = useCallback(() => {
    if (keyRef.current === null) keyRef.current = novoId();
    return keyRef.current;
  }, []);
  const peek = useCallback(() => keyRef.current, []);
  const reset = useCallback(() => {
    keyRef.current = null;
  }, []);
  return { ensure, peek, reset };
}
