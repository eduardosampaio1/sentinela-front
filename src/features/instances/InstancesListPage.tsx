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
// O CTA de criação existe, e isto MUDOU. A frase anterior era "criar Instância não tem missão
// dona, e botão morto ou 'em breve' seriam piores que a ausência" — verdadeira enquanto
// ninguém tinha decidido a capability. Ela foi decidida: qualquer pessoa cria a própria.
//
// O backend já sabia fazer isso o tempo todo (`POST /v1/instances`, idempotente por
// `Idempotency-Key`). O que faltava era o front pedir — nem o método existia no cliente.
//
// Diferente do Workspace, aqui a criação NAVEGA para dentro: a Instance nasce no workspace
// que o token já autoriza, então não há claim nova para esperar.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/shell/AppShell";
import { PageFrame } from "@/shell/PageFrame";
import {
  CabecalhoDeTrabalho,
  EmptyState,
  ErrorState,
  LinhaDeColecao,
  ListaDeColecao,
  LoadingState,
  CriarPorNome,
} from "@/design/patterns";
import { Button } from "@/components/ui/button";
import { useV1Client } from "@/features/canonical-analysis/data/client";
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
  const cliente = useV1Client();
  const navegar = useNavigate();
  const [dialogoAberto, setDialogoAberto] = useState(false);

  const criar = async (nome: string) => {
    const inst = await cliente.createInstance(scope, nome);
    setDialogoAberto(false);
    // Vai direto para a Instance recem-criada. Voltar para a lista obrigaria a pessoa a
    // procurar na tela o que ela acabou de criar -- e o proximo passo dela e sempre dentro.
    navegar(`/instances/${inst.instance_id}`);
  };

  const textosDeCriacao = {
    titulo: t("instances.createTitle"),
    descricao: t("instances.createDescription"),
    rotulo: t("instances.createLabel"),
    ajuda: t("instances.createHelp"),
    exemplo: t("instances.createExample"),
    enviar: t("instances.createSubmit"),
    enviando: t("instances.createSubmitting"),
    cancelar: t("instances.createCancel"),
    erroVazio: t("instances.createEmptyError"),
    erroAoCriar: t("instances.createFailed"),
  };

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
    <AppShell topBarTitle={t("shell.nav.instances")}>
      <PageFrame>
        <div ref={raiz}>
          <CabecalhoDeTrabalho
            titulo={t("instances.listTitle")}
            contexto={t("instances.listSubtitle")}
            // Um ponto focal por estado: com lista o CTA mora aqui, vazio ele e o centro do
            // empty state. Nunca nos dois ao mesmo tempo.
            acoes={
              !lista.isPending && !lista.isError && (lista.data?.items.length ?? 0) > 0 ? (
                <Button size="sm" onClick={() => setDialogoAberto(true)}>
                  {t("instances.createCta")}
                </Button>
              ) : undefined
            }
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
                acao={
                  <Button size="sm" onClick={() => setDialogoAberto(true)}>
                    {t("instances.createCta")}
                  </Button>
                }
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

          <CriarPorNome
            aberto={dialogoAberto}
            aoFechar={() => setDialogoAberto(false)}
            textos={textosDeCriacao}
            aoCriar={criar}
          />
        </div>
      </PageFrame>
    </AppShell>
  );
}
