// A RÉGUA DE FAIXAS — as três zonas NOMEADAS, e os cortes na posição deles.
//
// ## Por que ela mora em `design/primitives` e não ao lado de quem a usa
//
// Ela nasceu em `ui/argos/` e o cadeado `backend-first-result` a reprovou na hora: nenhum
// componente de `canonical-analysis/ui` pode conter `Math.*`, `* 100` ou `reduce`. A regra
// existe para impedir que a tela FABRIQUE número analítico, e ela estava certa em apontar —
// mesmo que aqui a conta seja só GEOMETRIA (onde cai o marcador na barra), a distinção entre
// «conta de desenho» e «conta de medida» não é visível para um grep, e não deve ser: seria
// exatamente a brecha por onde a primeira conta de verdade entraria.
//
// A saída é a mesma do `Bullet`, que faz a mesma aritmética e sempre morou aqui: geometria
// de desenho pertence à camada de desenho. O produto passa números e palavras; esta camada
// decide pixels.
//
// ## O que ela corrige, sem desfazer a correção anterior
//
// O `Bullet` desenha as mesmas três zonas em 8px de altura e escreve só as PONTAS da régua
// (`0` e `100`). Isso veio de uma correção do owner: escrever `60 · 75` nas extremidades dizia
// que a régua terminava em 75, quando o `behavior_score` vive em 0..100.
//
// A correção estava certa e continua valendo aqui: as pontas seguem sendo `0` e `100`. O que
// muda é que os cortes deixam de ser invisíveis — eles aparecem **na fração em que estão**, e
// não numa extremidade. Um número embaixo da barra, alinhado com a fronteira que ele nomeia,
// não pode ser lido como fim de eixo: ele está visivelmente no meio.
//
// E as zonas ganham NOME dentro da própria faixa. Sem isso, três cores dizem "há três coisas"
// e deixam para o leitor adivinhar quais — e adivinhar cor é justamente o que a #24 e o
// requisito de contraste existem para evitar.
//
// ## Zona é REGIÃO, veredito é sobre o VALOR
//
// `verdictOk` diz *"Within the expected range"* — uma frase sobre onde o número caiu. O nome da
// faixa é outra coisa: identifica um trecho da régua, exista valor nele ou não. Por isso os
// rótulos aqui são substantivos curtos, e dois deles reusam as MESMAS palavras dos cortes
// (`thresholdCritical`, `thresholdWarn`): a faixa abaixo do corte crítico é a faixa crítica.
// Só a terceira precisou de palavra nova.
//
// ## Nada é calculado aqui
//
// `warn`, `critical` e o valor vêm do documento. A régua (`piso`/`teto`) vem da ESCALA, não do
// limiar — deduzir extremos a partir dos cortes inventaria um máximo que ninguém publicou.

import { fracao, zonaDoValor, type ZonaDoBullet } from "./zonaDoBullet";

const TOM: Record<ZonaDoBullet, string> = {
  ok: "hsl(var(--ds-success))",
  atencao: "hsl(var(--ds-warning))",
  critico: "hsl(var(--ds-danger))",
};

/** Sem casas quando inteiro; no máximo duas quando não. Igual ao `Bullet`, pela mesma razão. */
function escrito(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

export interface ReguaDeFaixasProps {
  /** O número medido. `null` desenha as zonas SEM marcador — o vão com referência. */
  readonly valor: number | null;
  readonly warn: number;
  readonly critical: number;
  /** Os extremos da RÉGUA, da escala. Nunca deduzidos dos cortes. */
  readonly piso: number;
  readonly teto: number;
  /** Frase pronta para leitor de tela. A camada de produto escreve; esta não traduz. */
  readonly descricao: string;
  /**
   * O nome de cada faixa. Vem PRONTO, pelo mesmo motivo que `descricao`: esta camada desenha,
   * nao traduz. Ela escolhe QUAL nome vai em cada posicao (a orientacao depende dos cortes);
   * QUAIS sao as palavras e conhecimento de produto.
   */
  readonly nomes: Record<ZonaDoBullet, string>;
}

export function ReguaDeFaixas({
  valor,
  warn,
  critical,
  piso,
  teto,
  descricao,
  nomes,
}: ReguaDeFaixasProps) {
  const menorEPior = critical < warn;
  const baixo = Math.min(warn, critical);
  const alto = Math.max(warn, critical);
  const a = fracao(baixo, piso, teto);
  const b = fracao(alto, piso, teto);

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
    <div className="flex w-full flex-col gap-1.5">
      <div
        role="img"
        aria-label={descricao}
        className="relative h-7 w-full overflow-hidden rounded-sm"
      >
        {faixas.map((f) => (
          <span
            key={f.zona}
            aria-hidden="true"
            className="absolute inset-y-0 flex items-center overflow-hidden px-2"
            style={{
              left: `${f.de * 100}%`,
              width: `${Math.max(0, f.ate - f.de) * 100}%`,
              backgroundColor: TOM[f.zona],
              // Mesma opacidade do `Bullet`, pela mesma razão medida: abaixo disto, sobre
              // superfície escura, as três zonas deixam de se distinguir entre si.
              opacity: 0.85,
            }}
          >
            {/* `truncate` para a faixa estreita: em 0..100 com cortes 60/75, a de atenção tem
                15% da largura. Ela pode não caber, e o que não cabe é CORTADO — nunca empurra
                a faixa vizinha nem quebra a linha. */}
            <span className="truncate text-[0.625rem] font-semibold uppercase tracking-wider text-background/90">
              {nomes[f.zona]}
            </span>
          </span>
        ))}
        {posicao !== null && zona !== null ? (
          <span
            aria-hidden="true"
            /* NOME, e nao so estilo. O gate do heroi identificava o marcador por
               `span[style*='left']:not([style*='opacity'])` — um proxy da FORMA do CSS. Ele
               funcionava enquanto o marcador era o unico elemento posicionado da regua; os
               rotulos dos cortes tambem sao, e o proxy passou a contar tres onde ha um.
               Atributo proprio nao envelhece com o desenho. */
            data-marcador="valor"
            className="absolute inset-y-0 w-[3px] -translate-x-1/2 rounded-sm bg-foreground"
            style={{ left: `${posicao * 100}%` }}
          />
        ) : null}
      </div>

      {/* Os cortes NA FRAÇÃO em que estão. `relative` + `left:%` porque `justify-between`
          distribuiria por igual e mentiria sobre onde cada fronteira fica. */}
      <div className="relative h-4 text-[0.6875rem] tabular-nums text-muted-foreground">
        <span className="absolute left-0">{escrito(piso)}</span>
        {/* O rótulo nomeia o CORTE, não a zona à esquerda dele. Quando MENOR é pior o corte
            baixo é o crítico; quando MAIOR é pior a ordem inverte, e é o de atenção que fica
            embaixo. Escrever a zona aqui trocaria os dois nomes em metade das medidas. */}
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${a * 100}%` }}>
          {menorEPior ? nomes.critico : nomes.atencao}{" "}
          <b className="font-semibold">{escrito(baixo)}</b>
        </span>
        <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${b * 100}%` }}>
          {menorEPior ? nomes.atencao : nomes.critico}{" "}
          <b className="font-semibold">{escrito(alto)}</b>
        </span>
        <span className="absolute right-0">{escrito(teto)}</span>
      </div>
    </div>
  );
}

export default ReguaDeFaixas;
