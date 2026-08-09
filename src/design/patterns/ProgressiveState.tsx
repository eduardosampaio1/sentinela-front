// M13 — os eixos de progresso, lado a lado. **Nunca** um número agregado.
//
// O contrato publica QUATRO eixos independentes, cada um com o seu vocabulário. A tentação óbvia é
// resumi-los num "68% concluído" — e é exatamente o que não pode acontecer: não existe fonte para
// esse número, e somar eixos com vocabulários diferentes produziria uma média sem significado. Um
// eixo `withheld` não é "metade de ready"; um eixo `unknown` não é zero.
//
// Por isso este pattern não tem prop de total, não aceita percentual e não ordena por "avanço".

import { StatusBadge } from "./StatusBadge";
import { Stack, Text } from "@/design/primitives";
import { cn } from "@/lib/utils";
import type { EstadoDeEixo } from "./estados";

export interface EixoExibido {
  /**
   * Identidade ESTÁVEL do eixo — o nome do contrato (`engine`, `analytics`, `export`,
   * `final_result`).
   *
   * A primeira versão usava o rótulo traduzido como chave de lista, e o React reclamou: dois
   * eixos com o mesmo texto colidiam. O defeito é maior que o aviso — chave que muda quando a
   * pessoa troca de idioma faz o React remontar a lista inteira e perder estado, e a identidade
   * de um eixo não tem nada a ver com o idioma de quem olha.
   */
  id: string;
  /** Rótulo já traduzido do eixo. */
  rotulo: string;
  estado: EstadoDeEixo;
  /** Rótulo já traduzido do estado. */
  rotuloDoEstado: string;
}

export function ProgressiveState({
  eixos,
  className,
}: {
  eixos: readonly EixoExibido[];
  className?: string;
}) {
  return (
    // `<dl>`: cada eixo é um par nome/estado, e a relação é de definição.
    <dl
      className={cn(
        // Empilhado no mobile, lado a lado a partir do tablet. Nunca vira barra única.
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {eixos.map((e) => (
        <Stack key={e.id} espaco="xs" className="min-w-0">
          <Text as="dt" papel="rotulo" tom="discreto">
            {e.rotulo}
          </Text>
          <dd className="min-w-0">
            <StatusBadge vocabulario="eixo" estado={e.estado} rotulo={e.rotuloDoEstado} />
          </dd>
        </Stack>
      ))}
    </dl>
  );
}
