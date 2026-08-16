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
export {
  Campo,
  Composicao,
  PainelDoQueSeraProduzido,
  type PecaProduzida,
} from "./Entrada";
export {
  IdentidadeDoObjeto,
  SecaoDoObjeto,
  SinaisVitais,
  type SinalVital,
} from "./Objeto";
export { OuEntao, Portal } from "./Portal";
export { Terminal } from "./Terminal";
export { ProgressiveState, type EixoExibido } from "./ProgressiveState";
export { ProvenanceMargin, type ItemDeProcedencia } from "./ProvenanceMargin";
export { Toolbar } from "./Toolbar";
