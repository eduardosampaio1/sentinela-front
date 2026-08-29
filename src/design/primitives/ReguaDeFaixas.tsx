// A RÉGUA DE FAIXAS — o desenho da V4, com a matemática lida da escala.
//
// ## Por que ela mora em `design/primitives` e não ao lado de quem a usa
//
// Ela nasceu em `ui/argos/` e o cadeado `backend-first-result` a reprovou na hora: nenhum
// componente de `canonical-analysis/ui` pode conter `Math.*`, `* 100` ou `reduce`. A regra
// existe para impedir que a tela FABRIQUE número analítico, e estava certa em apontar — mesmo
// que aqui a conta seja só GEOMETRIA (onde cai o marcador na barra), a distinção entre «conta de
// desenho» e «conta de medida» não é visível para um grep, e não deve ser: seria exatamente a
// brecha por onde a primeira conta de verdade entraria.
//
// A saída é a mesma do `Bullet`, que faz a mesma aritmética e sempre morou aqui: geometria de
// desenho pertence à camada de desenho. O produto passa números e palavras; esta decide pixels.
//
// ## O NÚMERO mora dentro da régua
//
// Essa é a decisão da V4, e ela tem razão escrita no molde: *«o número mora aqui, na barra que
// o julga — e leva junto a sustentação»*. Antes ele ficava acima, e a barra abaixo; os dois se
// liam como dois blocos, e a pessoa tinha de associá-los. Juntos, o veredito é uma coisa só.
//
// ## As zonas são posicionadas, não empilhadas
//
// Cada faixa é um `span` absoluto com `left`/`width` em porcentagem da régua, e os NOMES delas
// são `span`s separados, também posicionados. Nome dentro da faixa (que é como eu tinha feito)
// some quando a faixa é estreita — em 0..100 com cortes 60/75, a de atenção tem 15% da largura.
// Fora, ele começa na fronteira e vaza para a faixa vizinha sem sumir.
//
// ## Nada é calculado a partir dos cortes
//
// `warn`, `critical` e o valor vêm do documento. A régua (`piso`/`teto`) vem da ESCALA — deduzir
// os extremos a partir dos cortes inventaria um máximo que ninguém publicou, e faria o marcador
// exagerar toda variação.

import { fracao, zonaDoValor, type ZonaDoBullet } from "./zonaDoBullet";

/** Sem casas quando inteiro; no máximo duas quando não. Igual ao `Bullet`, pela mesma razão. */
function escrito(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(2)));
}

export interface ReguaDeFaixasProps {
  /** O número medido. `null` desenha as zonas SEM agulha — o vão com referência. */
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
   * não traduz. Ela escolhe QUAL nome vai em cada posição (a orientação depende dos cortes);
   * QUAIS são as palavras é conhecimento de produto.
   */
  readonly nomes: Record<ZonaDoBullet, string>;
  /** O valor JÁ ESCRITO, com a unidade e as casas que o contrato declara. */
  readonly valorEscrito?: string | null;
  /** O que sustenta o número — confiança, corte. Frase pronta. */
  readonly sustentacao?: string | null;
  /** O sufixo da escala (`/100`). Ausente quando a escala não tem máximo declarado. */
  readonly sufixo?: string | null;
}

export function ReguaDeFaixas({
  valor,
  warn,
  critical,
  piso,
  teto,
  descricao,
  nomes,
  valorEscrito,
  sustentacao,
  sufixo,
}: ReguaDeFaixasProps) {
  const menorEPior = critical < warn;
  const baixo = Math.min(warn, critical);
  const alto = Math.max(warn, critical);
  const a = fracao(baixo, piso, teto);
  const b = fracao(alto, piso, teto);
  const posicao = valor === null ? null : fracao(valor, piso, teto);
  const zona = valor === null ? null : zonaDoValor(valor, warn, critical);

  return (
    <div className="regua">
      {valorEscrito ? (
        <div className="cabeca-regua">
          <b>{valorEscrito}</b>
          {sufixo ? <span className="un">{sufixo}</span> : null}
          {sustentacao ? <span className="sust">{sustentacao}</span> : null}
        </div>
      ) : null}

      <div
        className="faixa"
        role="meter"
        aria-label={descricao}
        aria-valuemin={piso}
        aria-valuemax={teto}
        aria-valuenow={valor ?? undefined}
      >
        {/* A ZONA CRÍTICA e a CONFORME trocam de lado conforme a direção dos cortes. Escrever
            «a primeira é a crítica» valeria só para as medidas em que menor é pior — e o
            contrato publica as duas orientações. */}
        <span
          className={`zona ${menorEPior ? "critico" : "ok"}`}
          style={{ left: 0, width: `${a * 100}%` }}
        />
        <span
          className="zona atencao"
          style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}
        />
        <span
          className={`zona ${menorEPior ? "ok" : "critico"}`}
          style={{ left: `${b * 100}%`, right: 0 }}
        />

        {/* Os NOMES começam na fronteira e vazam para dentro. Dentro da faixa eles sumiriam na
            estreita; aqui a estreita ainda mostra a primeira palavra. */}
        <span
          className={`rot-zona ${menorEPior ? "critico" : "ok"}`}
          style={{ left: 10 }}
        >
          {menorEPior ? nomes.critico : nomes.ok}
        </span>
        <span className="rot-zona atencao" style={{ left: `calc(${a * 100}% + 8px)` }}>
          {nomes.atencao}
        </span>
        <span
          className={`rot-zona ${menorEPior ? "ok" : "critico"}`}
          style={{ left: `calc(${b * 100}% + 8px)` }}
        >
          {menorEPior ? nomes.ok : nomes.critico}
        </span>

        <span className="corte" style={{ left: `${a * 100}%` }} />
        <span className="corte" style={{ left: `${b * 100}%` }} />
        {posicao !== null && zona !== null ? (
          <span
            aria-hidden="true"
            data-revelar="barra"
            data-preenchimento="valor"
            className={`progresso ${zona}`}
            style={{ width: `${posicao * 100}%` }}
          />
        ) : null}
        {posicao !== null && zona !== null ? (
          /* NOME, e não só estilo. O gate do herói identificava a agulha por
             `span[style*='left']:not([style*='opacity'])` — um proxy da FORMA do CSS, que
             funcionava enquanto ela fosse o único elemento posicionado da régua. Ela não é.
             Atributo próprio não envelhece com o desenho. */
          <span
            aria-hidden="true"
            data-marcador="valor"
            className={`agulha ${zona}`}
            style={{ left: `${posicao * 100}%` }}
          />
        ) : null}
      </div>

      {/* Os cortes NOMEADOS, embaixo. As pontas são a RÉGUA (`0` e `100`) e não os cortes:
          número na extremidade de uma barra se lê como fim do eixo, e escrever `60 · 75` ali
          diria que a régua termina em 75. Correção do owner, e ela continua valendo. */}
      <div className="cortes">
        <span>{escrito(piso)}</span>
        <span>
          {menorEPior ? nomes.critico : nomes.atencao} <b>{escrito(baixo)}</b>
        </span>
        <span>
          {menorEPior ? nomes.atencao : nomes.critico} <b>{escrito(alto)}</b>
        </span>
        <span>{escrito(teto)}</span>
      </div>
    </div>
  );
}

export default ReguaDeFaixas;
