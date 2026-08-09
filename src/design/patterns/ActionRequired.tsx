// M13 — "precisa de você", e a distinção que impede a promessa vazia.
//
// Um estado que pede ação humana e não oferece o caminho é pior que informar e calar: a pessoa
// clica, nada acontece, e a próxima vez ela não confia no aviso. Foi o que custou D21.
//
// Por isso o pattern tem DUAS formas explícitas em vez de uma prop booleana: `acao` quando a
// operação existe, e `semOperacao` quando ela ainda não existe — e nesse caso ele diz isso, em vez
// de mostrar um botão que mente.

import { StatusBadge } from "./StatusBadge";
import { Stack, Text } from "@/design/primitives";
import { cn } from "@/lib/utils";

type Base = { titulo: string; explicacao: string; rotuloDoEstado: string; className?: string };

/** Há operação real: o CTA leva a algum lugar. */
export function ActionRequired({ titulo, explicacao, rotuloDoEstado, acao, className }: Base & { acao: React.ReactNode }) {
  return (
    <Moldura titulo={titulo} explicacao={explicacao} rotuloDoEstado={rotuloDoEstado} className={className}>
      <div className="pt-1">{acao}</div>
    </Moldura>
  );
}

/**
 * NÃO há operação real ainda.
 *
 * O estado é publicado pelo contrato e a tela sabe exibi-lo, mas a operação que o resolve não
 * atravessou a fronteira pública. O pattern informa e **não age** — e o motivo aparece, porque
 * "precisa de você" sem caminho, sem explicação, é só frustração.
 */
export function ActionRequiredSemOperacao({
  titulo,
  explicacao,
  rotuloDoEstado,
  motivo,
  className,
}: Base & { motivo: string }) {
  return (
    <Moldura titulo={titulo} explicacao={explicacao} rotuloDoEstado={rotuloDoEstado} className={className}>
      <Text papel="rotulo" tom="discreto">
        {motivo}
      </Text>
    </Moldura>
  );
}

function Moldura({
  titulo,
  explicacao,
  rotuloDoEstado,
  className,
  children,
}: Base & { children: React.ReactNode }) {
  return (
    // `status`, não `alert`: nada quebrou. Pintar de erro faria procurar defeito onde há pergunta.
    <div role="status" className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <Stack espaco="sm">
        <StatusBadge vocabulario="publico" estado="needs_mapping" rotulo={rotuloDoEstado} />
        <Text papel="titulo">{titulo}</Text>
        <Text tom="discreto">{explicacao}</Text>
        {children}
      </Stack>
    </div>
  );
}
