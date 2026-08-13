// M40 · INST-05 — a análise de REFERÊNCIA da Instância.
//
// ## A pergunta que esta seção responde, e a que ela não responde
//
// Responde: **qual análise é a referência ativa desta Instância?**
// Não responde: "como esta análise evoluiu contra a referência?" — isso é EVO-03, não tem produtor
// e nada aqui insinua que tem.
//
// É a distinção que a BD10 provou existir ao entregar uma sem a outra. Por isso não há delta,
// direção, tendência, melhora, piora nem ranking; e por isso a copy diz *"análise de referência"*
// e nunca *"análise contra a qual calculamos evolução"*.
//
// ## O Front não decide quem é elegível
//
// A lista de candidatos vem de `?instance_id=&baseline_eligible=true`. Ela chega **carimbada**: o
// produtor já aplicou tenant, Instância, associação e conclusão, no `where` da mesma instrução que
// autoriza a escolha. Recortar aqui por `status === "completed"` faria a regra existir em dois
// lugares — e o Front seria o errado.
//
// A ausência mais importante deste arquivo é essa: não há `filter`, não há `sort` por data e não
// há "primeiro da lista". Nada aqui escolhe.
//
// ## D25 — a escolha é sempre um ato
//
// *"Não é a primeira execução automaticamente, nem janela móvel… Substituir é ação explícita…
// Nunca muda silenciosamente."*
//
// Cada botão carrega a identidade da análise que ele elege, no nome acessível. Não existe seleção
// prévia, sugestão, destaque de "mais recente" nem valor padrão — abrir a tela e esperar não
// produz referência nenhuma.
//
// ## A troca é UMA chamada
//
// `POST` da nova análise, e só. Não se chama `DELETE` antes: a substituição é atômica no produtor,
// e passar por `NO_BASELINE` abriria uma janela que o contrato não tem — e que a tela mostraria.

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/design/patterns";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProblemNotice } from "@/features/canonical-analysis/ui/notices";
import { workspaceKeys, type AnalysisListPage, type CanonicalScope } from "@/lib/v1";
import {
  useBaseline,
  useBaselineCandidates,
  useDefinirBaseline,
  useRemoverBaseline,
} from "./data/instance";

interface Props {
  scope: CanonicalScope | null;
  instanceId: string | undefined;
  /** Nome da Instância — entra nos rótulos acessíveis, nunca na identidade da operação. */
  instanceName: string;
}

type Candidato = AnalysisListPage["items"][number];

export function ReferenciaDaInstancia({ scope, instanceId, instanceName }: Props) {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();

  const baseline = useBaseline(scope, instanceId);
  const candidatos = useBaselineCandidates(scope, instanceId);
  const definir = useDefinirBaseline();
  const remover = useRemoverBaseline();

  const formatarData = useMemo(
    () =>
      new Intl.DateTimeFormat(language === "en" ? "en-US" : "pt-BR", { dateStyle: "medium" }),
    [language],
  );

  // Reconciliação pelo mecanismo que já existe. Um cache paralelo aqui seria a segunda fonte da
  // mesma verdade — e a que envelhece primeiro.
  const reconciliar = () => {
    if (!scope || !instanceId) return;
    void queryClient.invalidateQueries({
      queryKey: workspaceKeys.instanceBaseline(scope.workspaceId, instanceId),
    });
  };

  const emVoo = definir.isPending || remover.isPending;
  const erroDaMutacao = definir.error ?? remover.error;

  if (baseline.isPending || candidatos.isPending) {
    return (
      <Secao t={t}>
        <LoadingState rotulo={t("baseline.loading")} />
      </Secao>
    );
  }

  if (baseline.isError || candidatos.isError) {
    return (
      <Secao t={t}>
        <ErrorState
          titulo={t("baseline.title")}
          explicacao={t("baseline.error")}
          acao="tentar"
          botao={
            <button
              type="button"
              onClick={() => {
                void baseline.refetch();
                void candidatos.refetch();
              }}
              className="text-sm font-medium underline underline-offset-4"
            >
              {t("canonicalAnalysis.list.retry")}
            </button>
          }
        />
      </Secao>
    );
  }

  const atual = baseline.data.baseline_analysis_id;
  const definidaEm = baseline.data.baseline_set_at;
  const lista = candidatos.data.items;

  const escolher = (analysisId: string) => {
    if (!scope || !instanceId) return;
    // UMA chamada. A troca A→B não passa por remoção.
    definir.mutate({ scope, instanceId, analysisId }, { onSuccess: reconciliar });
  };

  return (
    <Secao t={t}>
      {/* O estado corrente vem primeiro: quem abre a seção quer saber se há régua antes de
          escolher uma. */}
      {atual ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("baseline.currentLabel")}
          </p>
          <p className="mt-1 break-all font-medium text-foreground">{atual}</p>
          {/* `set_at` é o instante de um ATO DE CONFIGURAÇÃO. Não é início de série, não é janela
              analítica e não é data de comparação — e a copy diz isso com a palavra "definida". */}
          {definidaEm && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("baseline.setOn", { date: formatarData.format(new Date(definidaEm)) })}
            </p>
          )}
          <div className="mt-3">
            <Button
              variant="outline"
              onClick={() => {
                if (!scope || !instanceId) return;
                remover.mutate({ scope, instanceId }, { onSuccess: reconciliar });
              }}
              disabled={emVoo}
              aria-busy={remover.isPending}
              aria-label={t("baseline.removeFrom", { name: instanceName })}
            >
              {remover.isPending ? t("baseline.removing") : t("baseline.remove")}
            </Button>
          </div>
        </div>
      ) : (
        // `NO_BASELINE` é estado LEGÍTIMO, e a copy o trata como tal: nem erro, nem pendência,
        // nem convite a "corrigir".
        <p role="status" className="text-sm text-muted-foreground">
          {t("baseline.none")}
        </p>
      )}

      <div className="mt-3 empty:mt-0">
        <ProblemNotice error={erroDaMutacao} />
      </div>

      {/* Os candidatos. `[]` é resposta, não falha: a consulta aconteceu e encontrou zero. */}
      {lista.length === 0 ? (
        <div className="mt-4">
          {/* `acao` é null de propósito: não há ação a oferecer. A saída daqui é uma análise
              concluir, e um botão inventado ("criar análise") mudaria a superfície da INST-05 para
              a da INST-04 no exato momento em que a pessoa procura uma referência. */}
          <EmptyState
            titulo={t("baseline.noCandidatesTitle")}
            explicacao={t("baseline.noCandidates")}
            acao={null}
          />
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-medium text-foreground">
            {atual ? t("baseline.replaceTitle") : t("baseline.chooseTitle")}
          </h3>
          <ul className="space-y-2">
            {lista.map((c) => (
              <LinhaDeCandidato
                key={c.analysis_id}
                candidato={c}
                atual={c.analysis_id === atual}
                emVoo={emVoo}
                pendente={definir.isPending && definir.variables?.analysisId === c.analysis_id}
                data={c.created_at ? formatarData.format(new Date(c.created_at)) : null}
                onEscolher={() => escolher(c.analysis_id)}
                t={t}
              />
            ))}
          </ul>
        </div>
      )}
    </Secao>
  );
}

function Secao({ t, children }: { t: (k: string) => string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="inst-referencia" className="mt-8 space-y-3">
      <div>
        <h2 id="inst-referencia" className="text-lg font-semibold text-foreground">
          {t("baseline.title")}
        </h2>
        {/* Explica o que a referência É, sem prometer o que ela ainda não faz. "Serve de ponto de
            partida para leituras futuras" seria promessa de comparação — e comparação não existe. */}
        <p className="text-sm text-muted-foreground">{t("baseline.subtitle")}</p>
      </div>
      {children}
    </section>
  );
}

function LinhaDeCandidato({
  candidato,
  atual,
  emVoo,
  pendente,
  data,
  onEscolher,
  t,
}: {
  candidato: Candidato;
  atual: boolean;
  emVoo: boolean;
  pendente: boolean;
  data: string | null;
  onEscolher: () => void;
  t: (k: string, v?: Record<string, string>) => string;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="break-all text-sm font-medium text-foreground">{candidato.analysis_id}</p>
        {/* Data de CRIAÇÃO da análise. Ela é procedência, e não critério: nenhuma ordenação aqui
            elege coisa alguma, e a mais recente não recebe destaque. */}
        {data && <p className="text-xs text-muted-foreground">{data}</p>}
      </div>
      {atual ? (
        // A régua atual não ganha botão de "definir de novo": a ação não acrescentaria nada, e
        // oferecê-la convidaria ao clique que não muda estado.
        <span className="flex-none rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {t("baseline.currentBadge")}
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="flex-none"
          onClick={onEscolher}
          disabled={emVoo}
          aria-busy={pendente}
          // O nome acessível carrega a IDENTIDADE escolhida — é o que torna a ação inequívoca
          // para quem não vê a vizinhança da linha, e é o que D25 exige de uma escolha explícita.
          aria-label={t("baseline.setAria", { id: candidato.analysis_id })}
        >
          {pendente ? t("baseline.setting") : t("baseline.set")}
        </Button>
      )}
    </li>
  );
}
