// M13 — os três estados que TODA superfície precisa ter, e precisa ter DISTINTOS.
//
// Vazio, erro e carregando são fatos diferentes, e o defeito clássico é achatá-los: a tela que
// mostra "nada encontrado" quando a requisição falhou faz o usuário procurar dado que existe, e a
// que mostra esqueleto para sempre esconde uma falha.
//
// Nenhum deles conhece domínio, query ou i18n: todo texto chega pronto por prop.

import { AlertTriangle, Inbox } from "lucide-react";
import { Stack, Text } from "@/design/primitives";
import { cn } from "@/lib/utils";

/**
 * VAZIO é convite, não erro.
 *
 * O CTA é **obrigatório** de propósito. Um vazio sem próximo passo deixa a pessoa sem saída, e a
 * regra congelada é *o que é isto + por que está vazio + como começar*. Quando não há ação
 * possível, isso não é vazio — é indisponibilidade, e o pattern certo é outro.
 */
export function EmptyState({
  titulo,
  explicacao,
  acao,
  className,
}: {
  titulo: string;
  /** Por que está vazio. Sem isto, o vazio parece defeito. */
  explicacao: string;
  acao: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn("rounded-lg border border-border bg-card p-6 text-center", className)}
    >
      <Inbox aria-hidden="true" className="mx-auto h-6 w-6 text-muted-foreground" />
      <Text as="p" papel="titulo" className="mt-3">
        {titulo}
      </Text>
      <Text as="p" tom="discreto" className="mt-1">
        {explicacao}
      </Text>
      <div className="mt-4 flex justify-center">{acao}</div>
    </div>
  );
}

/** Como o erro pede para ser resolvido. Vocabulário de APRESENTAÇÃO — o mapa a partir do código
 *  público vive junto do contrato (`lib/v1`), que é quem conhece os códigos. */
export type AcaoDeErro = "entrar" | "tentar" | "aguardar" | "voltar" | "suporte" | "nenhuma";

/**
 * ERRO é direção: o quê + por quê + como resolver.
 *
 * `role="alert"` só quando há falha de verdade. E `detalhe` é **código público**, nunca mensagem
 * de infraestrutura: o contrato garante que `detail` jamais carrega SQL, host, bucket ou trace, e
 * repassar qualquer outra coisa aqui quebraria essa garantia do lado do cliente.
 */
export function ErrorState({
  titulo,
  explicacao,
  acao,
  botao,
  detalhe,
  className,
}: {
  titulo: string;
  explicacao: string;
  acao: AcaoDeErro;
  /** Só existe quando `acao !== "nenhuma"`. Prometer ação sem operação é o erro que custou D21. */
  botao?: React.ReactNode;
  /** Código público correlacionável. Opcional, e curto. */
  detalhe?: string;
  className?: string;
}) {
  if (acao !== "nenhuma" && botao === undefined) {
    throw new Error(
      `ErrorState: ação "${acao}" declarada sem botão. Um erro que diz como resolver e não ` +
        "oferece o caminho é pior que um erro mudo.",
    );
  }
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border border-destructive/40 bg-destructive/10 p-4",
        className,
      )}
    >
      <Stack direcao="horizontal" espaco="sm" alinhamento="inicio">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <Stack espaco="xs" className="min-w-0 flex-1">
          <Text papel="titulo">{titulo}</Text>
          <Text tom="discreto">{explicacao}</Text>
          {detalhe !== undefined && (
            <Text papel="rotulo" tom="discreto" literal>
              {detalhe}
            </Text>
          )}
          {botao !== undefined && <div className="pt-1">{botao}</div>}
        </Stack>
      </Stack>
    </div>
  );
}

/**
 * CARREGANDO nunca finge progresso.
 *
 * Não existe barra com percentual aqui, e isso não é limitação: não há fonte confiável para "37%",
 * e inventar um número é a forma mais rápida de o cliente perder a confiança no resto da tela.
 * O esqueleto pulsa devagar (≤ 1 Hz) e some sob `prefers-reduced-motion`, onde o rótulo textual
 * assume — porque "carregando" precisa continuar sendo dito quando o movimento é removido.
 */
export function LoadingState({
  rotulo,
  linhas = 3,
  className,
}: {
  /** Sempre presente: é o que resta quando o movimento é desligado. */
  rotulo: string;
  linhas?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-2", className)}>
      <span className="sr-only">{rotulo}</span>
      {Array.from({ length: linhas }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="block h-4 rounded bg-muted motion-safe:animate-pulse"
          // O período vem do token, não do componente: a regra "não pulsa mais rápido que 1 Hz"
          // é da Constituição, e um literal aqui a deixaria à mercê de quem editar esta linha.
          style={{ animationDuration: "var(--ds-skeleton-pulse-period)" }}
        />
      ))}
      <Text papel="rotulo" tom="discreto" className="motion-safe:sr-only">
        {rotulo}
      </Text>
    </div>
  );
}
