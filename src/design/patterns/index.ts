// Superfície pública dos patterns do Design System.

export { StatusBadge } from "./StatusBadge";
export {
  aparenciaDeEixo,
  aparenciaPublica,
  ESTADOS_DE_EIXO,
  ESTADOS_PUBLICOS,
  type AparenciaDoEstado,
  type EstadoDeEixo,
  type EstadoPublico,
  type FormaDoEstado,
  type TomDoEstado,
} from "./estados";

export { ActionRequired, ActionRequiredSemOperacao } from "./ActionRequired";
export {
  CabecalhoDeTrabalho,
  LinhaDeColecao,
  ListaDeColecao,
  type ItemDeColecao,
} from "./Colecao";
export { ComparisonRow, ComparisonRowQuebrada } from "./ComparisonRow";
export { ConfirmDestructive } from "./ConfirmDestructive";
export { DataTable, type ColunaDaTabela } from "./DataTable";
export {
  Documento,
  DestaqueDeDocumento,
  IndiceDeDocumento,
  type SecaoDeDocumento,
} from "./Documento";
export { useSecaoAtiva } from "./secaoAtiva";
export { EmptyState, ErrorState, LoadingState, type AcaoDeErro } from "./EstadosDeTela";
// ENTRADA foi removido antes de nascer, e o motivo fica registrado porque a decisão pode
// precisar ser revertida: o arquétipo previa uma tela que COMPÕE uma análise — intervalo,
// referência, painel do que será produzido —, e essa tela não existe. `/analyses/new` é um botão
// só: a jornada canônica cria a intenção primeiro e recebe os dados depois.
//
// Manter os três componentes aqui seria peça escrita e nunca ligada, que é exatamente a dívida
// que esta missão apagou em `AuthExperienceShell`. A regra vale para o código novo também — e é
// aplicá-la ao próprio trabalho que mostra se ela é regra ou discurso.
//
// O desenho continua no protótipo. Quando existir superfície de composição, ele volta com um
// consumidor no mesmo commit.
export { IdentidadeDoObjeto, SecaoDoObjeto, type NaturezaDaSecao } from "./Objeto";
export { OuEntao, Portal } from "./Portal";
export { Terminal } from "./Terminal";
export { ProgressiveState, type EixoExibido } from "./ProgressiveState";
export { ProvenanceMargin, type ItemDeProcedencia } from "./ProvenanceMargin";
export { Toolbar } from "./Toolbar";
