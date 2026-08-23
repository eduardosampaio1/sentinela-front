// Barra proporcional. **A largura é escala VISUAL, não estatística publicada.**
//
// Promovida na M10 de `features/canonical-analysis/ui/analytics/primitivas.tsx`. A mudança que a
// tornou primitive de fato: ela importava `useLanguage` para escrever o rótulo do caso suprimido.
// Isso é i18n de PRODUTO, que a Constituição §3 proíbe nesta camada — e o gate da M04 reprova.
//
// O rótulo virou prop. Quem sabe o que dizer quando não há valor é a camada de produto, que já
// conhece o vocabulário congelado; a barra só sabe desenhar. A regra que isso preserva é a mesma
// de antes: `withheld` não vira zero, e ausência não vira barra vazia.
//
// O número fica SEMPRE escrito ao lado. Não é redundância de layout: é a regra de não depender só
// de cor ou comprimento. Quem não distingue as barras continua lendo a contagem, que é o fato.
//
// A largura chega PRONTA (`"63.0%"`), relativa ao maior item da MESMA lista. Nenhuma conta
// acontece aqui, e não pode acontecer: proporção sobre a população exigiria um denominador, que é
// exatamente o cálculo que esta camada não faz.

export function Bar({
  rotulo,
  valor,
  largura,
  suprimida = false,
  rotuloSuprimido,
}: {
  rotulo: string;
  /** Texto pronto. `null` quando não há número — a barra some e o rótulo explica. */
  valor: string | null;
  /** Valor CSS já pronto, decidido fora. NENHUMA conta acontece aqui. */
  largura: string;
  suprimida?: boolean;
  /** O que escrever quando não há valor. Vem do produto: esta camada não traduz. */
  rotuloSuprimido: string;
}) {
  return (
    /* Os tres nomes (`rot`, `barra-g`, `qtd`) sao o vocabulario da folha portada do Molde.
       Eles NAO substituem os utilitarios: convivem, e a folha so os alcanca dentro do
       escopo dela. Fora dele a barra continua exatamente como era. */
    <li className="grid grid-cols-[minmax(6rem,10rem)_1fr_auto] items-center gap-3 text-sm">
      <span className="rot truncate text-muted-foreground" title={rotulo}>
        {rotulo}
      </span>
      <span className="barra-g h-2 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        {/* Suprimida NÃO desenha barra de largura zero: uma barra vazia e uma barra de valor zero
            são indistinguíveis, e as duas afirmam coisas opostas. */}
        {!suprimida && (
          // `data-revelar="barra"` — A RECEITA JÁ EXISTIA E NÃO TINHA CONSUMIDOR.
          //
          // O motor de movimento declara `barra` desde que nasceu: `scaleX(0)` → `scaleX(1)`,
          // `--ds-duration-deliberate`, `--ds-easing-emphasis`, origem à esquerda "porque é de lá
          // que ela é medida". Varri o produto e o atributo não aparecia em lugar nenhum: o gesto
          // estava escrito e desligado.
          //
          // Não há duração literal aqui, e nem poderia — o motor lê os tokens em runtime, e é isso
          // que mantém as cinco durações congeladas valendo para todo mundo.
          <span
            data-revelar="barra"
            className="block h-full rounded-full bg-primary"
            style={{ width: largura }}
          />
        )}
      </span>
      <span
        className={
          suprimida ? "qtd text-muted-foreground" : "qtd font-medium tabular-nums text-foreground"
        }
      >
        {valor ?? rotuloSuprimido}
      </span>
    </li>
  );
}
