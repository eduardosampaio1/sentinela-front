// M37 · INST-04 — a intenção "iniciar uma análise", num lugar só.
//
// ## Por que existe
//
// A M37 não é uma segunda experiência de Análise: é o **mesmo** início, com o contexto de uma
// Instância. Duas telas passaram a disparar a mesma intenção — `/analyses/new` (jornada geral) e
// `/instances/:instanceId` (INST-04) —, e copiar as vinte linhas de chave de idempotência,
// tratamento de 409 e navegação para a identidade durável significaria duas versões da mesma
// regra, divergindo no primeiro ajuste. É a razão pela qual o hook nasceu junto com a segunda
// chamadora, e não antes: agora existem dois consumidores reais.
//
// ## O que ele NÃO faz
//
// Não decide rota nova, não guarda contexto em memória, em `localStorage` nem em navigation
// state. O contexto de Instância viaja como argumento no momento do clique e vira **query param**
// no `prepare`; depois disso a identidade durável é o `analysis_id` na URL, e a associação passa a
// ser legível no read model de status. Cada fase tem a sua identidade canônica no endereço — é
// isso que faz o refresh funcionar sem nenhum armazenamento local.
//
// `instanceId` é opcional de propósito. Ausente, a requisição sai byte a byte igual à de antes: o
// contrato publica o campo como opcional e aditivo, e a jornada geral não pode passar a exigi-lo.

import { useNavigate } from "react-router-dom";
import type { CanonicalScope } from "@/lib/v1";
import { useCreateAnalysis } from "../data/analysis";
import { useIdempotencyIntent } from "../data/intent";
import { useCanonicalScope } from "./scope";
import { problemCodeOf } from "./notices";

export interface IniciarAnalise {
  /** Dispara a intenção. Ignora cliques repetidos enquanto a anterior não teve desfecho. */
  iniciar: () => void;
  /** `null` enquanto o workspace ativo não carregou — a tela precisa dizer isso, não travar mudo. */
  escopo: CanonicalScope | null;
  /** `idempotency_conflict`: ESTA intenção já foi registrada. Não é "algo deu errado". */
  conflito: boolean;
  pendente: boolean;
  erro: unknown;
}

export function useIniciarAnalise(instanceId?: string): IniciarAnalise {
  const navigate = useNavigate();
  const escopo = useCanonicalScope();
  const intent = useIdempotencyIntent();
  const create = useCreateAnalysis();

  // O 409 tem tratamento próprio: o contrato não publica qual análise atendeu a intenção
  // repetida, então a tela não a adivinha nem navega para lugar nenhum.
  const conflito = problemCodeOf(create.error) === "idempotency_conflict";

  function iniciar() {
    if (!escopo || create.isPending) return;
    // Chave por INTENÇÃO explícita: gerada aqui, reusada em retry da mesma intenção; reset no
    // desfecho definitivo. Sucesso é um desfecho; recusa por repetição é outro — insistir com a
    // mesma chave conflitaria de novo, para sempre. Reset NÃO é retry automático: nada é
    // reenviado, e um segundo início exige um segundo clique de uma pessoa.
    const idempotencyKey = intent.ensure();
    create.mutate(
      { scope: escopo, idempotencyKey, instanceId },
      {
        onSuccess: (handle) => {
          intent.reset();
          navigate(`/analyses/${encodeURIComponent(handle.analysis_id)}`);
        },
        onError: (erro) => {
          if (problemCodeOf(erro) === "idempotency_conflict") intent.reset();
        },
      },
    );
  }

  return { iniciar, escopo, conflito, pendente: create.isPending, erro: create.error };
}
