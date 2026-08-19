// BULLET — o número contra as zonas que o produtor declarou.
//
// ## A razão da recusa caiu, e é por isso que ele existe agora
//
// `Heroi.tsx` recusou este medidor com um argumento correto na época: *"não há faixa esperada em
// contrato nenhum... desenhar a régua e inventar a marca transformaria julgamento meu em dado do
// produtor"*. Duas fatias de backend derrubaram a premissa — `PublicMeasurement.thresholds`
// publica os dois cortes que o motor APLICA (`THR_WARN`/`THR_CRIT`), em campo próprio.
//
// Então o bullet não inventa nada: ele DESENHA o que veio.
//
// ## Sem limiar, sem bullet
//
// `thresholds` ausente é o caso das 36 outras saídas, e ali este componente devolve `null`. Não
// há régua cinza "só para mostrar a escala": uma barra sem zonas convida a leitura de posição
// que nada sustenta, e o número escrito ao lado já é o fato.
//
// ## A direção vem da ORDEM, não de um campo
//
// `critical < warn` = menor é pior, e a zona boa fica acima de `warn`. `critical > warn` = maior
// é pior. O contrato não publica orientação de propósito: ela é função total da ordem, e um
// campo afirmando o que a ordem já diz seria segunda cópia do mesmo fato.
//
// ## Não depende de cor
//
// A posição do marcador e o número escrito carregam a informação inteira. As zonas dão contexto,
// e quem não distingue as cores continua lendo valor e limiares em texto — a mesma regra que a
// `Bar` já segue, e que a matriz de contraste desta casa cobra.

import { fracao, zonaDoValor, type ZonaDoBullet } from "./zonaDoBullet";

const TOM: Record<ZonaDoBullet, string> = {
  ok: "hsl(var(--ds-success))",
  atencao: "hsl(var(--ds-warning))",
  critico: "hsl(var(--ds-danger))",
};

/**
 * As pontas da régua, escritas.
 *
 * Sem casas quando o número é inteiro (`0`, `100`) e com no máximo duas quando não é (`0,8`).
 * `Intl` sozinho escreveria `0` e `1` para uma escala `ratio_unit`, que é o certo, e `0,75` onde
 * precisa — sem inventar precisão que a escala não tem.
 */
function rotuloDaRegua(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

export function Bullet({
  valor,
  warn,
  critical,
  piso,
  teto,
  rotuloDoValor,
  descricao,
}: {
  /** O número medido. `null` desenha as zonas SEM marcador — o vão com referência. */
  readonly valor: number | null;
  readonly warn: number;
  readonly critical: number;
  /** Os extremos da RÉGUA, não das zonas. Vêm da escala, não do limiar. */
  readonly piso: number;
  readonly teto: number;
  /** O número já escrito, para quem lê texto em vez de posição. */
  readonly rotuloDoValor: string;
  /** Frase pronta para leitor de tela. A camada de produto escreve; esta não traduz. */
  readonly descricao: string;
}) {
  const menorEPior = critical < warn;
  // Os dois cortes em fração da régua, sempre na ordem crescente do eixo.
  const a = fracao(Math.min(warn, critical), piso, teto);
  const b = fracao(Math.max(warn, critical), piso, teto);

  // Três faixas contíguas. Quando MENOR é pior, a crítica fica à esquerda; quando MAIOR é pior,
  // à direita. Nenhuma conta de cor acontece fora daqui.
  const faixas = menorEPior
    ? ([
        { de: 0, ate: a, zona: "critico" as const },
        { de: a, ate: b, zona: "atencao" as const },
        { de: b, ate: 1, zona: "ok" as const },
      ] as const)
    : ([
        { de: 0, ate: a, zona: "ok" as const },
        { de: a, ate: b, zona: "atencao" as const },
        { de: b, ate: 1, zona: "critico" as const },
      ] as const);

  const posicao = valor === null ? null : fracao(valor, piso, teto);
  const zona = valor === null ? null : zonaDoValor(valor, warn, critical);

  return (
    <div className="flex flex-col gap-1">
      {/* `img` com `aria-label`: uma barra é figura, e a frase pronta diz o que ela mostra.
          Sem isto o leitor de tela receberia uma sequência de divs sem sentido. */}
      <div role="img" aria-label={descricao} className="relative h-2 w-full rounded-full">
        {faixas.map((f) => (
          <span
            key={f.zona}
            aria-hidden="true"
            className="absolute inset-y-0 first:rounded-l-full last:rounded-r-full"
            style={{
              left: `${f.de * 100}%`,
              width: `${Math.max(0, f.ate - f.de) * 100}%`,
              // Zona LEGÍVEL, e isto mudou depois de ver a tela.
              //
              // A primeira versão usava `0.28` com o argumento de que "zona é contexto, não
              // alarme". O argumento tinha um furo: em `0.28` sobre superfície escura as três
              // zonas ficavam quase indistinguíveis entre si, e a régua parava de comunicar
              // exatamente o que ela existe para comunicar — onde termina cada faixa.
              //
              // O medo de competir com o número não se confirma: o número tem 104px e a barra
              // tem 8. Quem compete com o herói é outro texto grande, não uma faixa de 8px.
              backgroundColor: TOM[f.zona],
              opacity: 0.85,
            }}
          />
        ))}
        {/* O marcador. Ausente quando não há valor — e aí as zonas sozinhas dizem onde ficaria
            o bom, que é o vão COM referência em vez do traço solto. */}
        {posicao !== null && zona !== null ? (
          <span
            aria-hidden="true"
            className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-sm"
            style={{ left: `${posicao * 100}%`, backgroundColor: TOM[zona] }}
          />
        ) : null}
      </div>
      {/* As PONTAS DA RÉGUA, e não os cortes. Correção de leitura pedida pelo owner:
          *"por que colocamos 60 · 75? a escala deveria ser 0 a 100"* — e ele está certo.

          Número na extremidade de uma barra é lido como o FIM DO EIXO. Escrever `60 · 75` ali
          dizia que a régua terminava em 75, quando o `behavior_score` vive em 0..100 e o
          marcador estava posicionado contra 0..100. É o mesmo erro que a revisão adversarial já
          tinha pegado no contrato — limiar ocupando o lugar da régua —, e ele voltou pela porta
          do desenho.

          Os cortes NÃO somem: eles são as fronteiras das zonas coloridas, que é onde um limiar
          se lê sem virar eixo, e aparecem NOMEADOS na linha de detalhe da medição
          (`atenção 75 · crítico 60`). Aqui embaixo fica a régua, que é o que a posição precisa. */}
      <div className="flex justify-between text-[0.6875rem] tabular-nums text-muted-foreground">
        <span>{rotuloDaRegua(piso)}</span>
        <span>{rotuloDoValor}</span>
        <span>{rotuloDaRegua(teto)}</span>
      </div>
    </div>
  );
}
