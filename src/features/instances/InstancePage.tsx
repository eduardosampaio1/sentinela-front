// M36 — INST-01 (visão atual) + INST-03 (histórico), na mesma página.
//
// ## Por que as duas juntas, e não duas rotas
//
// O Blueprint separa as superfícies por PERGUNTA, não por endereço: INST-01 responde "o que é
// esta Instância" e INST-03 "o que já rodou nela". Quem abre uma Instância quer as duas de
// relance — separá-las em telas obrigaria a navegar para descobrir se há histórico, e a Instância
// sem suas execuções é um cabeçalho sem conteúdo. É o mesmo raciocínio da RES-01, onde medida e
// procedência ficam lado a lado em vez de em abas.
//
// ## O que a tela NÃO mostra
//
// Nenhum estado, saúde, contador, "última execução" ou badge sobre a Instância. Ela publica três
// campos — identidade, nome e data de criação. INST-02 (Estado) foi retirada do produto porque
// não tem produtor, e a proibição vale também para insinuação: derivar "ativa" da existência de
// análises seria exatamente a inferência que a BD02 recusou no backend.
//
// ## Identidade vem da ROTA, não de estado carregado
//
// `useParams` → `getInstance`. A tela nunca lê a Instância de uma listagem que talvez tenha sido
// carregada antes: é isso que faz deep link, refresh e carga fria funcionarem igual. Depender do
// cache da lista daria uma tela que funciona clicando e quebra colando a URL — e o defeito só
// apareceria em produção, na primeira vez que alguém compartilhasse um link.
//
// ## O erro não desfaz a decisão do contrato
//
// Instância de outro workspace e inexistente colapsam no MESMO código público, de propósito.
// A copy diz "não encontramos esta instância neste workspace" — verdadeira nos dois casos, e sem
// revelar qual. Dizer "não existe" ou "sem permissão" reintroduziria o oráculo que o backend
// fecha.

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { EmptyState, ErrorState, LoadingState } from "@/design/patterns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCanonicalScope } from "@/features/canonical-analysis/ui/scope";
import { useInstance, useInstanceHistory } from "./data/instance";
import { HistoricoDaInstancia } from "./HistoricoDaInstancia";

export default function InstancePage() {
  const { t, language } = useLanguage();
  const scope = useCanonicalScope();
  const { instanceId } = useParams<{ instanceId: string }>();

  // Cursor OPACO, com pilha para voltar sem offset local — o mesmo mecanismo da listagem
  // canônica. O front nunca decodifica o cursor nem calcula posição a partir dele.
  const [cursor, setCursor] = useState<string | null>(null);
  const [pilha, setPilha] = useState<(string | null)[]>([]);

  const instancia = useInstance(scope, instanceId);
  const historico = useInstanceHistory(scope, instanceId, cursor);

  if (instancia.isPending) {
    return (
      <AppShell>
        <PageFrame>
          <LoadingState message={t("instances.loading")} size="md" />
        </PageFrame>
      </AppShell>
    );
  }

  if (instancia.isError) {
    return (
      <AppShell>
        <PageFrame>
          <ErrorState
            titulo={t("instances.label")}
            explicacao={t("instances.notFound")}
            acao="voltar"
            botao={
              <Link to="/instances" className="text-sm font-medium underline underline-offset-4">
                {t("instances.backToList")}
              </Link>
            }
          />
        </PageFrame>
      </AppShell>
    );
  }

  const inst = instancia.data;
  // `created_at` é nullable no contrato. Formatar aqui e deixar o DS decidir a ausência: o
  // `ProvenanceMargin` converte `null` em texto de ausência, nunca em `0` nem em data inventada.
  const criadaEm = inst.created_at
    ? new Intl.DateTimeFormat(language === "en" ? "en-US" : "pt-BR", {
        dateStyle: "long",
      }).format(new Date(inst.created_at))
    : null;

  return (
    <AppShell>
      <PageFrame>
        <header className="space-y-1">
          {/* Volta para a lista. Sem ela, quem chega por deep link fica sem saber onde está na
              hierarquia — o Trunk Test pergunta "onde estou?" e a tela não respondia. O link
              existe SEMPRE, e não só no erro: chegar por URL é o caminho normal desta tela. */}
          <Link
            to="/instances"
            className="inline-block text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            {t("instances.backToList")}
          </Link>
          {/* O rótulo diz QUE COISA é isto; o título é o nome que a pessoa deu. O identificador
              opaco não aparece: ele é endereço, não informação de tela. */}
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("instances.label")}
          </p>
          <h1 className="text-2xl font-semibold text-foreground">{inst.name}</h1>
        </header>

        {/* A procedência fica JUNTO do título, não numa margem flutuante.
            `ProvenanceMargin` foi recusado aqui, e a razão veio da captura: ele existe para
            acompanhar um INDICADOR — em RES-01, o número e a régua que o sustenta lado a lado.
            A Instância não tem indicador nenhum; usá-lo repetia o nome como se fosse medida e
            deixava a margem pairando à direita, longe do que explicava. Reusar componente pela
            forma, e não pela função, é o que produz tela que parece certa e não é. */}
        <p className="mt-2 text-sm text-muted-foreground">
          {criadaEm ? `${t("instances.createdOn")} ${criadaEm}` : t("instances.createdUnknown")}
        </p>

        <section aria-labelledby="inst-historico" className="mt-8 space-y-3">
          <h2 id="inst-historico" className="text-lg font-semibold text-foreground">
            {t("instances.historyTitle")}
          </h2>

          {historico.isPending ? (
            <LoadingState message={t("instances.loadingHistory")} size="md" />
          ) : historico.isError ? (
            <ErrorState
              titulo={t("instances.historyTitle")}
              explicacao={t("instances.errorHistory")}
              acao="tentar"
              botao={
                <button
                  type="button"
                  onClick={() => void historico.refetch()}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {t("canonicalAnalysis.list.retry")}
                </button>
              }
            />
          ) : historico.data.items.length === 0 ? (
            // Sem CTA: iniciar análise A PARTIR da Instância é INST-04/M37, e um botão que
            // levasse à criação genérica perderia justamente o contexto que a tela tem.
            <EmptyState
              titulo={t("instances.historyTitle")}
              explicacao={t("instances.emptyHistory")}
              acao={null}
            />
          ) : (
            <HistoricoDaInstancia
              itens={historico.data.items}
              temProxima={Boolean(historico.data.next_cursor)}
              temAnterior={pilha.length > 0}
              aoAvancar={() => {
                const proxima = historico.data.next_cursor;
                if (!proxima) return;
                setPilha((s) => [...s, cursor]);
                setCursor(proxima);
              }}
              aoVoltar={() => {
                setPilha((s) => {
                  const copia = [...s];
                  setCursor(copia.pop() ?? null);
                  return copia;
                });
              }}
            />
          )}
        </section>
      </PageFrame>
    </AppShell>
  );
}
