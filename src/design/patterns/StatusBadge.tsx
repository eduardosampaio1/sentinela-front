// M11 — o badge de estado. **Um** componente para os **dois** vocabulários.
//
// ## O defeito que ele existe para impedir
//
// Sem ele, cada superfície escreve o próprio mapeamento e, seis meses depois, `running` é uma
// coisa na Home, outra no Resultado e uma terceira na Instância. Nenhum teste reclama, porque cada
// mapeamento está correto isoladamente. É o critério 17 de UI COMPLETE, e a defesa é estrutural:
// existir num lugar só.
//
// ## V6 é obrigatório, e é por isso que não há prop de ícone
//
// Cor nunca é canal único. Todo badge sai daqui com **três** canais: tom, **forma** (ícone) e
// **rótulo**. O ícone não é configurável de propósito — se fosse, um chamador poderia omiti-lo e
// o estado passaria a depender só de cor, sem nada acusar. A forma vem da tabela, sempre.
//
// ## O que ele NÃO faz
//
// Não lê backend, não conhece Análise/Instância/Workspace e não traduz. O rótulo chega pronto por
// prop, como na `Bar` da M10: quem sabe o texto congelado é a camada de produto.

import {
  ArrowDownToLine,
  Check,
  CircleDashed,
  Cog,
  CircleHelp,
  Clock,
  Hourglass,
  Loader2,
  Lock,
  Minus,
  PieChart,
  RotateCw,
  Play,
  UserRoundPen,
  X,
} from "lucide-react";
import { Chip, type EnfaseDoChip } from "@/design/primitives";
import { cn } from "@/lib/utils";
import {
  aparenciaDeEixo,
  aparenciaPublica,
  type EstadoDeEixo,
  type EstadoPublico,
  type FormaDoEstado,
  type TomDoEstado,
} from "./estados";

/** Cada forma tem ícone PRÓPRIO. Duas formas nunca compartilham desenho: seria perder o canal. */
const ICONE: Record<FormaDoEstado, typeof Check> = {
  reservado: CircleDashed,
  recebendo: ArrowDownToLine,
  espera: Hourglass,
  andamento: Loader2,
  montando: Cog,
  retomada: RotateCw,
  pessoa: UserRoundPen,
  partida: Play,
  concluido: Check,
  parcial: PieChart,
  retido: Lock,
  desconhecido: CircleHelp,
  indisponivel: Minus,
  expirado: Clock,
  falha: X,
};

/** Tom → token. Nenhum valor nasce aqui: todos já existiam antes da M11. */
const TOM_CLASSE: Record<TomDoEstado, string> = {
  neutro: "text-muted-foreground",
  positivo: "text-success",
  atencao: "text-warning",
  negativo: "text-destructive",
};

const TOM_ENFASE: Record<TomDoEstado, EnfaseDoChip> = {
  neutro: "neutro",
  positivo: "contorno",
  atencao: "contorno",
  negativo: "contorno",
};

/** Só as formas EM CURSO giram. Movimento aqui é informação: distingue "andando" de "parado". */
const GIRA: ReadonlySet<FormaDoEstado> = new Set<FormaDoEstado>(["andamento", "montando"]);

type Props = {
  /** Texto já traduzido. Esta camada não conhece i18n de produto. */
  rotulo: string;
  className?: string;
} & (
  | { vocabulario: "publico"; estado: EstadoPublico }
  | { vocabulario: "eixo"; estado: EstadoDeEixo }
);

export function StatusBadge(props: Props) {
  // União discriminada em vez de um `estado: string`: impede passar um estado de eixo onde se
  // espera um estado público, e vice-versa. Os dois conjuntos se sobrepõem em alguns nomes e
  // divergem em outros — `pending` não é estado público, `needs_mapping` não é estado de eixo.
  const aparencia =
    props.vocabulario === "publico"
      ? aparenciaPublica(props.estado)
      : aparenciaDeEixo(props.estado);

  const Icone = ICONE[aparencia.forma];

  return (
    <Chip
      enfase={TOM_ENFASE[aparencia.tom]}
      className={cn(TOM_CLASSE[aparencia.tom], props.className)}
      data-estado={props.estado}
      data-forma={aparencia.forma}
      data-tom={aparencia.tom}
    >
      {/* Decorativo: o rótulo ao lado já diz o mesmo, e anunciar os dois duplicaria a leitura.
          O ícone existe para quem VÊ — é o canal que sobrevive à escala de cinza. */}
      <Icone
        aria-hidden="true"
        className={cn("h-3 w-3 shrink-0", GIRA.has(aparencia.forma) && "motion-safe:animate-spin")}
      />
      {props.rotulo}
    </Chip>
  );
}
