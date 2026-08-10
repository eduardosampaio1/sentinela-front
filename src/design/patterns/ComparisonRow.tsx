// M13 — comparação entre dois pontos, com a BASE declarada e a quebra explícita.
//
// D26: quando a versão do vocabulário muda, os valores **deixam de ser a mesma série**. O pattern
// tem duas formas explícitas em vez de uma prop, porque a diferença não é de aparência: no caso
// comparável existe delta; no caso quebrado **não existe**, e mostrar um número ali seria afirmar
// uma variação que ninguém mediu.
//
// Em nenhuma das duas o Front calcula: o delta chega pronto, com direção e base, do view model.

import { ArrowRight, Unlink } from "lucide-react";
import { Stack, Text } from "@/design/primitives";
import { cn } from "@/lib/utils";

interface Comum {
  /** O que está sendo comparado. */
  rotulo: string;
  /** Valores já formatados. `null` é AUSÊNCIA — nunca vira zero. */
  antes: string | null;
  depois: string | null;
  /** Rótulo do que é "antes" — a base do delta, sem a qual a comparação é anedota. */
  base: string;
  className?: string;
}

/** Os dois pontos são comparáveis: o delta existe e chega pronto. */
export function ComparisonRow({
  rotulo,
  antes,
  depois,
  base,
  delta,
  className,
}: Comum & {
  /** Texto pronto, com sinal e unidade. O Front não calcula variação. */
  delta: string | null;
}) {
  return (
    <Moldura rotulo={rotulo} className={className}>
      <Stack direcao="horizontal" espaco="sm" alinhamento="base" className="flex-wrap">
        {/* M31 — a base vem ANTES do número que ela nomeia. Ela morava numa linha abaixo do par,
            e `80 → 80` com a palavra "anterior" embaixo obrigava o leitor a deduzir qual dos dois
            números era o anterior. Continua sempre visível; mudou de posição, não de existência. */}
        <Text papel="rotulo" tom="discreto">{base}</Text>
        <Text numerico tom="discreto">{antes ?? "—"}</Text>
        <ArrowRight aria-hidden="true" className="h-3 w-3 shrink-0 text-muted-foreground" />
        <Text numerico>{depois ?? "—"}</Text>
        {delta !== null && (
          <Text papel="rotulo" numerico tom="secundario">
            {delta}
          </Text>
        )}
      </Stack>
    </Moldura>
  );
}

/**
 * A comparabilidade QUEBROU — mudou o schema ou o registro de indicadores.
 *
 * Não há delta, e não pode haver. Os dois valores continuam visíveis porque cada um é verdadeiro
 * no seu segmento; o que some é a seta e o número da variação. O ícone de elo partido é o segundo
 * canal: a quebra não pode depender de o leitor notar a ausência da seta.
 */
export function ComparisonRowQuebrada({
  rotulo,
  antes,
  depois,
  base,
  motivo,
  className,
}: Comum & { motivo: string }) {
  return (
    <Moldura rotulo={rotulo} className={className}>
      <Stack direcao="horizontal" espaco="sm" alinhamento="base" className="flex-wrap">
        <Text papel="rotulo" tom="discreto">{base}</Text>
        <Text numerico tom="discreto">{antes ?? "—"}</Text>
        <Unlink aria-hidden="true" className="h-3 w-3 shrink-0 text-muted-foreground" />
        <Text numerico tom="discreto">{depois ?? "—"}</Text>
      </Stack>
      <Text papel="rotulo" tom="discreto">
        {motivo}
      </Text>
    </Moldura>
  );
}

/**
 * Uma linha é UMA linha — M31.
 *
 * A moldura empilhava rótulo, valores e base em três alturas. Com catorze indicadores isso dava
 * ~950px, quase 40% da página, para dizer catorze vezes `80 → 80`. A captura da tela inteira
 * mostrou a comparação ocupando mais espaço vertical que os próprios indicadores que ela compara.
 *
 * Agora o rótulo e os valores dividem a mesma linha de base: rótulo à esquerda, par à direita,
 * alinhados numa grade. **Nada foi escondido nem colapsado atrás de gatilho** — os catorze pares
 * continuam todos visíveis, na mesma ordem, com os mesmos valores. Mudou a altura, não o conteúdo.
 *
 * Abaixo de `sm` volta a empilhar: 342px de coluna útil não comportam rótulo e par lado a lado sem
 * quebrar o par no meio, e um par partido em duas linhas é pior que duas linhas declaradas.
 */
function Moldura({
  rotulo,
  className,
  children,
}: Pick<Comum, "rotulo" | "className"> & { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "grid gap-x-4 gap-y-0.5 border-b border-border/60 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-baseline",
        className,
      )}
    >
      <Text papel="rotulo" tom="discreto">
        {rotulo}
      </Text>
      <Stack espaco="xs" className="sm:items-end">
        {children}
      </Stack>
    </div>
  );
}
