// COLEÇÃO · a lista de Instâncias do workspace. É a porta de entrada da INST-01.
//
// ## Por que esta linha é a MAIS CURTA do sistema, e por que isso é o certo
//
// O arquétipo COLEÇÃO existe para responder "devo abrir isto?", e no protótipo ele carrega o
// número que decide, a tendência e o estado. Aqui carrega nome e data de criação — e para.
//
// Porque é isso que o contrato publica. `data/instance.ts` diz por escrito: *"o contrato publica
// `instance_id`, `name` e `created_at`, e mais nada"*. Saúde, contagem de análises e "última
// execução" exigiriam contar no navegador, e o Gate da missão proíbe: **o Front não calcula
// estado de backend.**
//
// Um espaço fixo para saúde aqui forçaria uma de duas mentiras: um traço, que se lê como medida
// faltando, ou um número computado no browser. O slot só existe se o dado existe — é a regra que
// faz este arquétipo servir a quatro rotas sem inventar nada em nenhuma delas.
//
// ## O vazio continua sendo o caso interessante
//
// Workspace autorizado sem nenhuma Instância é estado LEGÍTIMO, e o produtor real devolve
// `{"items": [], "next_cursor": null}` — medido no gate E2E da BD02, não fixture inventada. Ele
// precisa se distinguir de carregando, de erro e de não-autorizado; por isso são três ramos
// separados e nenhum cai no outro por omissão.
//
// Sem CTA de criação: criar Instância não tem missão dona, e botão morto ou "em breve" seriam
// piores que a ausência. O empty state explica O QUE É uma Instância, que é a informação útil
// que resta quando não há "como começar" para oferecer.

import { Link } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import {
  CabecalhoDeTrabalho,
  EmptyState,
  ErrorState,
  LinhaDeColecao,
  ListaDeColecao,
  LoadingState,
} from "@/design/patterns";
import { useRevelacao } from "@/design/motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCanonicalScope } from "@/features/canonical-analysis/ui/scope";
import { useInstancesList } from "./data/instance";

export default function InstancesListPage() {
  const { t, language } = useLanguage();
  const scope = useCanonicalScope();
  const lista = useInstancesList(scope);
  // A chave é o que remonta a revelação quando o dado chega: o observador montado sobre a árvore
  // de carregamento não observa linha nenhuma, e a lista apareceria parada.
  const raiz = useRevelacao<HTMLDivElement>(lista.isPending ? "carregando" : lista.dataUpdatedAt);

  const dia = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ""
      : new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : "en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(d);
  };

  return (
    <AppShell>
      <PageFrame>
        <div ref={raiz}>
          <CabecalhoDeTrabalho
            titulo={t("instances.listTitle")}
            contexto={t("instances.listSubtitle")}
          />

          <div className="mt-6">
            {lista.isPending ? (
              <LoadingState rotulo={t("instances.loading")} />
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
              <EmptyState
                titulo={t("instances.listTitle")}
                explicacao={t("instances.emptyWorkspace")}
                acao={null}
              />
            ) : (
              <ListaDeColecao>
                {lista.data.items.map((inst) => (
                  <LinhaDeColecao
                    key={inst.instance_id}
                    item={{
                      chave: inst.instance_id,
                      titulo: inst.name,
                      subtitulo: inst.instance_id,
                      destino: `/instances/${inst.instance_id}`,
                      quando: inst.created_at
                        ? `${t("instances.createdOn")} ${dia(inst.created_at)}`
                        : undefined,
                    }}
                    Envoltorio={({ destino, children, className }) => (
                      <Link to={destino ?? "#"} className={className}>
                        {children}
                      </Link>
                    )}
                  />
                ))}
              </ListaDeColecao>
            )}
          </div>
        </div>
      </PageFrame>
    </AppShell>
  );
}
