// A identidade da análise — o cabeçalho que esta tela não tinha.
//
// ## O buraco
//
// `/analyses/:id` é o hub de uma análise e não dizia QUAL análise. Não havia título, nem
// identificador, nem a que Instância ela pertence: o `StateBanner` abria a tela dizendo "Em
// execução", e quem chegou por link direto — que é o caminho normal desta rota — não tinha como
// confirmar que estava olhando a análise certa.
//
// O Trunk Test pergunta "em que página estou?". A M33 já tinha corrigido metade disso na barra
// superior; o corpo continuava mudo.
//
// ## Dois campos publicados que a tela descartava
//
// `instance_id` e `updated_at` estão em `AnalysisStatusView` e não apareciam em lugar nenhum.
//
//   • **A Instância** é a identidade durável entre execuções — é por ela que a navegação
//     reconstrói o contexto depois de um refresh. Sem ela, a análise flutua: a pessoa sabe o
//     estado e não sabe de quem é.
//   • **`updated_at`** é o que separa "está andando" de "está parado" numa tela que consulta
//     sozinha. Sem ele, uma análise travada há uma hora tem exatamente a mesma cara de uma que
//     mudou de estado agora.
//
// ## Por que o nome da Instância é buscado, e por que a falha é silenciosa
//
// O contrato de status publica o `instance_id`, não o nome. Buscar o nome é uma leitura a mais —
// e ela NÃO pode derrubar nada: se falhar ou demorar, o link continua existindo com o
// identificador, que é o que a rota precisa. Uma tela cujo assunto é o estado de uma análise não
// pode ficar mais frágil por causa de um rótulo.
//
// Análise sem Instância (toda a legada) simplesmente não mostra a linha. `null` ali é "não tem",
// não "não veio".

import { Link } from "react-router-dom";
import { StatusBadge } from "@/design/patterns";
import type { EstadoPublico } from "@/design/patterns/estados";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCanonicalScope } from "./scope";
import { useInstance } from "@/features/instances/data/instance";

export function IdentidadeDaAnalise({
  analysisId,
  estado,
  instanceId,
  atualizadaEm,
}: {
  analysisId: string;
  /** `undefined` enquanto a leitura de status não respondeu — o badge não nasce carregando. */
  estado?: EstadoPublico;
  instanceId: string | null;
  atualizadaEm: string | null;
}) {
  const { t, language } = useLanguage();
  const scope = useCanonicalScope();
  const instancia = useInstance(scope, instanceId ?? undefined);

  const quando = atualizadaEm
    ? new Intl.DateTimeFormat(language === "pt" ? "pt-BR" : "en-US", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(atualizadaEm))
    : null;

  return (
    <header data-revelar className="grid gap-2 border-b border-border pb-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("canonicalAnalysis.topBar")}
        </h1>
        {/* Só aparece quando o estado chegou. Um badge de "carregando" inventaria um nono estado
            público, e o vocabulário é fechado. Mesma regra do `AnalysisShell`. */}
        {estado ? (
          <StatusBadge
            vocabulario="publico"
            estado={estado}
            rotulo={t(`estadoPublico.${estado}`)}
          />
        ) : null}
        {quando && (
          <span className="text-xs text-muted-foreground">
            {t("canonicalAnalysis.list.lastChange")} {quando}
          </span>
        )}
      </div>

      {/* A identidade é o que torna a análise retomável por deep link — e é ela que a pessoa cola
          num chamado. Fica legível, não escondida num atributo. */}
      <p className="text-sm text-muted-foreground">
        <code className="font-mono text-xs">{analysisId}</code>
      </p>

      {instanceId && (
        <p className="text-xs text-muted-foreground">
          {t("canonicalAnalysis.list.belongsTo")}{" "}
          <Link
            to={`/instances/${encodeURIComponent(instanceId)}`}
            className="text-[hsl(var(--ds-accent-ink))] underline underline-offset-4"
          >
            {instancia.data?.name ?? instanceId}
          </Link>
        </p>
      )}
    </header>
  );
}
