// O que aconteceu com o ARQUIVO — em números, e não em "não deu".
//
// ## O caso que originou
//
// Medido em homologação em 2026-08-24, com base real de atendimento (Chatwoot): 61.423 turnos
// entraram, 61.323 eram válidos, 100 foram recusados. Como a política de aceitação é estrita, o
// dataset inteiro foi rejeitado.
//
// Os 100 eram fenômenos normais de uma base de atendimento: 71 conversas em que ninguém
// respondeu ao cliente, e 29 mensagens que continham apenas um documento e ficaram vazias
// depois do Privacy Gate. Nenhum deles corrigível por quem enviou o arquivo.
//
// A tela mostrava: "Couldn't complete. The analysis couldn't be completed."
//
// O sistema tinha o número exato — gravado e publicado pelo Ingestion, lido pelo Gateway — e não
// o contava. Este componente é onde ele passa a contar.
//
// ## Por que ele não diz o que fazer
//
// Porque a ação depende de uma escolha que a pessoa faz ANTES, na confirmação de mapeamento
// (`min_valid_ratio`). Sugerir aqui "tente com outro limite" prometeria um botão que não existe
// nesta tela. O que cabe aqui é o fato; a decisão tem lugar próprio.

import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalysisIntake } from "@/lib/v1";

/** Formata com separador de milhar do idioma — 61423 vira "61,423" ou "61.423". */
function numero(valor: number, idioma: string): string {
  return new Intl.NumberFormat(idioma).format(valor);
}

export function AvisoDeIntake({ intake }: { intake: AnalysisIntake | null }): JSX.Element | null {
  const { t, language } = useLanguage();

  // Sem medição não há o que contar, e inventar zero afirmaria "nada foi recusado" sobre um
  // arquivo que talvez nem tenha sido lido.
  if (!intake) return null;

  const total = intake.source_record_count;
  const aceitos = intake.canonical_record_count;
  const recusados = intake.rejected_record_count;

  // `null` em qualquer um dos três: a frase que este componente existe para dizer é uma
  // comparação, e comparação com ausência não é frase.
  if (total === null || aceitos === null || recusados === null) return null;

  // Zero recusados é notícia boa e também é notícia. Dizer nada aqui faria a ausência do aviso
  // significar duas coisas — "não medimos" e "deu tudo certo" —, e ninguém consegue distinguir.
  if (recusados === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="intake-tudo-aceito">
        {t("canonicalAnalysis.intake.allGood", { total: numero(total, language) })}
      </p>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="intake-com-recusa"
      className="rounded-md border border-border bg-muted/40 p-4 space-y-1"
    >
      <p className="text-sm font-medium">{t("canonicalAnalysis.intake.title")}</p>
      <p className="text-sm text-muted-foreground">
        {t("canonicalAnalysis.intake.summary", {
          accepted: numero(aceitos, language),
          total: numero(total, language),
          rejected: numero(recusados, language),
        })}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("canonicalAnalysis.intake.strictNote")}
      </p>
    </div>
  );
}
