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

function Moldura({
  rotulo,
  className,
  children,
}: Pick<Comum, "rotulo" | "className"> & { children: React.ReactNode }) {
  return (
    <Stack espaco="xs" className={cn("border-b border-border/60 py-2", className)}>
      <Text papel="rotulo" tom="discreto">
        {rotulo}
      </Text>
      {children}
    </Stack>
  );
}
