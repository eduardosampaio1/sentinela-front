// As duas primitivas visuais das áreas analíticas. Só tokens semânticos, nenhum hex.
//
// Elas não recebem dado do backend: recebem view model já pronto. Nenhum número é calculado
// aqui, e a escala das barras vem decidida do adapter.

import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Uma barra proporcional. **A largura é escala VISUAL, não estatística publicada.**
 *
 * O número fica SEMPRE escrito ao lado — e isso não é redundância de layout, é a regra de não
 * depender só de cor/comprimento. Quem não distingue as barras (ou não as vê) continua lendo a
 * contagem, que é o fato; a barra é a leitura rápida da ordem de grandeza.
 *
 * A largura chega PRONTA, relativa ao maior item da MESMA lista. Não há percentual publicado
 * aqui, e não pode haver: a proporção de cada item sobre a população exigiria um denominador —
 * que é exatamente o cálculo que esta camada não faz.
 */
export function Barra({
  rotulo,
  valor,
  largura,
  retida = false,
}: {
  rotulo: string;
  /** Texto pronto. `null` quando não há número — a barra some, e o rótulo explica. */
  valor: string | null;
  /** Valor CSS já pronto (`"63.0%"`), decidido no adapter. NENHUMA conta acontece aqui. */
  largura: string;
  retida?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <li className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate text-muted-foreground" title={rotulo}>
        {rotulo}
      </span>
      <span className="h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {/* Retida NÃO desenha barra de largura zero: uma barra vazia e uma barra de valor zero
            são indistinguíveis, e as duas afirmam coisas opostas. */}
        {!retida && <span className="block h-full rounded-full bg-primary" style={{ width: largura }} />}
      </span>
      <span className={retida ? "text-muted-foreground" : "font-medium text-foreground"}>
        {valor ?? t("canonicalAnalysis.result.analytics.windowSuppressed")}
      </span>
    </li>
  );
}

/** As contagens de um bloco — quatro fatos distintos, nunca somados nem convertidos. */
export function Contagens({ itens }: { itens: readonly { label: string; display: string }[] }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
      {itens.map((c) => (
        <div key={c.label} className="flex items-baseline justify-between gap-2">
          <dt className="text-muted-foreground">{c.label}</dt>
          <dd className="font-medium text-foreground">{c.display}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Aviso discreto dentro de um bloco. `role="note"` — informa, não alarma. */
export function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p role="note" className="mt-2 text-xs text-muted-foreground">
      {children}
    </p>
  );
}

/** Moldura de um bloco analítico: mesma borda, mesmo fundo e mesmo espaçamento do resto. */
export function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">{titulo}</p>
      {children}
    </li>
  );
}
