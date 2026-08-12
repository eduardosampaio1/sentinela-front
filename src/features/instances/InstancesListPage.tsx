// M36 — a lista de Instâncias do workspace. É a porta de entrada da INST-01.
//
// ## O que esta tela NÃO tem, e por quê
//
// Sem status, sem saúde, sem contador de análises, sem "última execução", sem badge. A Instância
// publica três campos — identidade, nome e data de criação — e mais nada. Um contador aqui
// exigiria contar no browser, e o Gate da missão proíbe: *o Front não calcula estado de backend*.
//
// Sem CTA de criação. Criar Instância NÃO tem missão dona — INST-04 é nova ANÁLISE a partir da
// Instância, não criação, e o Blueprint não tem superfície de criar. Botão morto ou "em breve" seriam
// piores que a ausência: o primeiro mente sobre o que a tela faz, o segundo anuncia cronograma que
// ninguém tem. Owner semântico da lacuna: Produto/Arquitetura de Instância.
//
// ## O vazio é o caso interessante
//
// Workspace autorizado sem nenhuma Instância é estado LEGÍTIMO, e o produtor real devolve
// `{"items": [], "next_cursor": null}` — medido no gate E2E da BD02, não fixture inventada. Ele
// tem de se distinguir de carregando, de erro e de não-autorizado; por isso são três ramos
// separados e nenhum deles cai no outro por omissão.
//
// O empty state explica O QUE É uma Instância em vez de oferecer ação: o padrão pede "o que é +
// por que está vazio + como começar", e aqui o "como começar" ainda não existe. Explicar o
// conceito é a informação útil que resta.

import { Link } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import { EmptyState, ErrorState, LoadingState } from "@/design/patterns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCanonicalScope } from "@/features/canonical-analysis/ui/scope";
import { useInstancesList } from "./data/instance";

export default function InstancesListPage() {
  const { t } = useLanguage();
  const scope = useCanonicalScope();
  const lista = useInstancesList(scope);

  return (
    <AppShell>
      <PageFrame>
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">{t("instances.listTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("instances.listSubtitle")}</p>
        </header>

        <div className="mt-6">
          {lista.isPending ? (
            <LoadingState message={t("instances.loading")} size="md" />
          ) : lista.isError ? (
            <ErrorState
              titulo={t("instances.listTitle")}
              explicacao={t("instances.errorHistory")}
              acao="tentar"
              botao={
                <button
                  type="button"
                  onClick={() => void lista.refetch()}
                  className="text-sm font-medium underline underline-offset-4"
                >
                  {t("canonicalAnalysis.list.retry")}
                </button>
              }
            />
          ) : lista.data.items.length === 0 ? (
            // Sem `acao`: a única ação útil seria criar, e criar não tem missão dona.
            <EmptyState
              titulo={t("instances.listTitle")}
              explicacao={t("instances.emptyWorkspace")}
              acao={null}
            />
          ) : (
            <ul className="grid gap-px overflow-hidden rounded-lg border border-border bg-border">
              {lista.data.items.map((inst) => (
                <li key={inst.instance_id} className="bg-card">
                  <Link
                    to={`/instances/${inst.instance_id}`}
                    className="block px-4 py-3 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-sm font-medium text-foreground">{inst.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PageFrame>
    </AppShell>
  );
}
