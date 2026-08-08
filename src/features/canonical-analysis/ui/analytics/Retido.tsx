// O estado RETIDO — a extensão de Design System que esta fatia justifica.
//
// ## Por que ele NÃO é um ErrorState
//
// `withheld` é conclusão, não falha: a análise terminou, e a decisão foi não liberar. Apresentá-lo
// em vermelho, com "algo deu errado" e um botão de tentar de novo, reintroduziria na tela
// exatamente o que a MF5 congelou como decisão de privacidade — e mandaria o operador investigar
// um incidente que não existe.
//
// Também não é `EmptyState`: vazio é "não há dado". Aqui há dado, e ele foi protegido. As duas
// pedem ações opostas (uma manda buscar dado, a outra manda não insistir).
//
// ## Por que ele mora aqui, e não em `shared/states/`
//
// A auditoria da fatia propunha `shared/states/`, ao lado de `LoadingState`/`ErrorState`. Ao
// abrir os irmãos, eles usam hex hardcoded (`text-[#F1F5F9]`, `bg-[rgba(255,255,255,0.04)]`) —
// são superfície LEGADA, anterior à consolidação visual da Onda 6 E7. Um componente novo com
// tokens semânticos ficaria fora do padrão dos vizinhos; um com hex ficaria fora do padrão da
// jornada canônica, que é onde ele aparece.
//
// A vizinhança certa é `notices.tsx`: mesma feature, mesmos tokens, mesmo i18n por chave.

import { useLanguage } from "@/contexts/LanguageContext";

export function AnalyticsRetido() {
  const { t } = useLanguage();
  return (
    // `role="status"` e não `alert`: é informação sobre o desfecho, não interrupção.
    <div role="status" className="space-y-2 rounded-lg border border-border bg-card p-6">
      <p className="font-medium text-foreground">
        {t("canonicalAnalysis.result.analytics.withheldTitle")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("canonicalAnalysis.result.analytics.withheldBody")}
      </p>
      {/* A razão INTERNA da retenção nunca chega aqui: ela nomearia a população que a retenção
          existe para não revelar, e por isso não viaja no documento público. */}
      <p className="text-xs text-muted-foreground">
        {t("canonicalAnalysis.result.analytics.withheldHint")}
      </p>
    </div>
  );
}
