// Área das medidas numéricas. Recebe view model pronto: não busca, não calcula, não interpreta.

import { useLanguage } from "@/contexts/LanguageContext";
import type { MeasureView } from "../../result/adapterV2";
import { Cartao, Contagens, Nota } from "./primitivas";

export function AreaDeMedidas({ medidas }: { medidas: readonly MeasureView[] }) {
  const { t } = useLanguage();
  if (medidas.length === 0) return null;
  return (
    <section aria-labelledby="an-medidas" className="space-y-3">
      <h3 id="an-medidas" className="text-base font-semibold text-foreground">
        {t("canonicalAnalysis.result.analytics.measuresTitle")}
      </h3>
      <ul className="grid gap-4 sm:grid-cols-2">
        {medidas.map((m) => (
          <Cartao key={m.id} titulo={`${m.label} · ${m.unit}`}>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
              {m.stats.map((s) => (
                <div key={s.label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  {/* Ausência não vira zero: `—` é o texto de "não há número", e o motivo
                      (piso de privacidade × não medido) vem na nota abaixo, declarado pela
                      origem. */}
                  <dd className="truncate font-medium text-foreground">{s.display ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <Contagens itens={m.counts} />
            {/* Sem este aviso, `Mínimo: —` seria indistinguível de "ninguém mediu" — e as duas
                pedem ações opostas: a primeira é privacidade funcionando, a segunda é dado
                faltando. */}
            {m.suppressed && <Nota>{t("canonicalAnalysis.result.analytics.suppressedStats")}</Nota>}
          </Cartao>
        ))}
      </ul>
    </section>
  );
}
