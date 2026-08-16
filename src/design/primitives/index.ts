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
export { Medida, TrilhoDeMedida } from "./Medida";
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
