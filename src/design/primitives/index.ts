// Superfície pública dos primitives.
//
// Barril estreito, e de propósito: um `index` que reexporta o Design System inteiro faz o bundler
// arrastar tudo quando a página quis um componente. Aqui só há primitives, todos pequenos e todos
// usados juntos nas mesmas superfícies.
//
// ## O que NÃO está aqui, e por quê
//
// `Button`, `Input`, `Label`, `Dialog`, `Sheet`, `DropdownMenu`, `Tooltip` e `Toast` **já existem**
// em `src/components/ui/` como envoltórios de Radix, com 27 consumidores só no botão. Criar uma
// segunda versão deles aqui produziria exatamente o defeito que a M08 acabou de matar no nível do
// token: dois vocabulários para o mesmo papel. Eles convergem para cá quando forem tocados por
// missão própria — não por cópia.

export { Bar } from "./Bar";
export { Chip, type EnfaseDoChip } from "./Chip";
export { DefinitionGrid } from "./DefinitionGrid";
export { Disclosure } from "./Disclosure";
export { IconeDecorativo, IconeInformativo } from "./Icon";
// `Medida` e `TrilhoDeMedida` (o trilho com faixa esperada ao fundo e valor à frente) foram
// removidos junto com `SinaisVitais`, e pela mesma razão: eles desenhavam uma medida COM RÉGUA
// PUBLICADA, e nenhuma superfície fora de ARGOS/Analytics tem uma para mostrar.
//
// O léxico não morreu com eles — ele vive onde é consumido: `ValorDaMedida` tipa os quatro
// fatos, `leituraDaMedida` estreita o union num lugar só, `tomPelaFaixa` mantém o julgamento
// preso à régua, `Tendencia` desenha a série curta, e as classes `.medida-ausente` e
// `.medida-nao-medida` dão forma à ausência na célula de número da COLEÇÃO.
export {
  leituraDaMedida,
  tomPelaFaixa,
  type FaixaEsperada,
  type TomDaMedida,
  type ValorDaMedida,
} from "./valorDaMedida";
export { Note } from "./Note";
export { Panel } from "./Panel";
export { Stack, type EspacoDaPilha } from "./Stack";
export { Tendencia } from "./Tendencia";
export { Text } from "./Text";
