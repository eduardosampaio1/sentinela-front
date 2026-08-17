// O MAPA DE DESDOBRAMENTO — como um número se abre nos números que o compõem.
//
// ## O que ele NÃO faz, e por quê
//
// Ele não liga medidas DIFERENTES. "100 conversas → 200 mensagens → 30 turnos" seria a cadeia
// mais útil de todas, e o contrato **não a publica**: não há `parent`, `derived_from`,
// `depends_on` nem `composed_of` em lugar nenhum, e `semantic_role` descreve o tipo de agregação
// (`sum`, `mean`) e não uma relação. Desenhar aquela cadeia exigiria inventar o vínculo entre
// duas medidas independentes.
//
// ## Os quatro desdobramentos que EXISTEM
//
// Cada bloco do snapshot se abre de um jeito próprio, e o jeito vem do bloco — não de uma regra
// desta tela:
//
//   NUMÉRICO      massa → método. `suppression_applied` diz que os nulos são o PISO DE
//                 PRIVACIDADE, não ausência de dado.
//   DISTRIBUIÇÃO  massa → grupos rotulados + `other_count`. `null` ali significa *"nem a soma dos
//                 suprimidos alcança o piso"* — não é zero, e ganha a hachura.
//   CONCENTRAÇÃO  massa → faixas de valor com contagem de entidades. Carrega TRÊS recusas
//                 distintas: grosseirização, supressão e cardinalidade alta.
//   SÉRIE         massa → janelas. `count: null` acontece APENAS quando a janela foi suprimida;
//                 zero é valor.
//
// A raiz é sempre `record_count`, que o contrato descreve como *"o denominador verdadeiro: todo o
// resto é contado sobre ele"*.
//
// ## Acessibilidade: o mapa é a SEGUNDA forma, nunca a única
//
// Um grafo com pan e zoom não é navegável por teclado nem legível por leitor de tela — e
// procedência é justamente o que alguém precisa auditar. O canvas é `aria-hidden` e ao lado dele
// vai uma LISTA semântica com os mesmos fatos. É a mesma regra que faz o número ficar sempre
// escrito ao lado da barra.
//
// ## Nenhum corte silencioso
//
// Uma distribuição pode ter dezenas de grupos. O mapa desenha os primeiros e, quando sobra, diz
// **quantos** ficaram de fora num nó próprio. Truncar em silêncio faria o desenho afirmar
// completude que ele não tem.

import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useLanguage } from "@/contexts/LanguageContext";
import type {
  ResumoDeConcentracao,
  ResumoDeDistribuicao,
  ResumoNumerico,
  SerieTemporal,
} from "../../result/analyticsProjection";

const COLUNA = 220;
const FAIXA = 70;
/** Quantos filhos o desenho mostra antes de dizer quantos sobraram. */
const TETO_DE_FILHOS = 6;

type Papel = "raiz" | "bloco" | "massa" | "metodo" | "ausente" | "resto";

interface DadoDoNo extends Record<string, unknown> {
  papel: Papel;
  rotulo: string;
  valor: string;
}

/** O bloco a desdobrar. O tipo é o que decide a forma do desdobramento. */
export type BlocoDesdobravel =
  | { tipo: "numerico"; dado: ResumoNumerico }
  | { tipo: "distribuicao"; dado: ResumoDeDistribuicao }
  | { tipo: "concentracao"; dado: ResumoDeConcentracao }
  | { tipo: "serie"; dado: SerieTemporal };

/**
 * O nó.
 *
 * `ausente` recebe a hachura do léxico — a mesma classe da linha de coleção. Ausência tem textura
 * em todo lugar, ou não é léxico.
 */
function No({ data }: { data: DadoDoNo }) {
  const semDado = data.papel === "ausente";
  return (
    <div
      className={[
        "min-w-[10rem] max-w-[12.5rem] rounded-lg border px-3 py-2",
        semDado ? "medida-ausente border-border" : "border-border bg-card",
        data.papel === "raiz" ? "border-l-2 border-l-primary" : "",
      ].join(" ")}
    >
      <div className="truncate text-[0.6rem] uppercase tracking-wider text-muted-foreground" title={data.rotulo}>
        {data.rotulo}
      </div>
      <div className="tabular mt-0.5 truncate text-sm font-medium text-foreground" title={data.valor}>
        {data.valor}
      </div>
    </div>
  );
}

const TIPOS = { no: No };

export function MapaDeProcedencia({
  bloco,
  denominador,
}: {
  bloco: BlocoDesdobravel;
  /** `record_count` do snapshot — a raiz da cadeia, não um número deste bloco. */
  denominador: number;
}) {
  const { t } = useLanguage();

  const { nos, arestas, linhas } = useMemo(() => {
    const nos: Node<DadoDoNo>[] = [];
    const arestas: Edge[] = [];
    const linhas: { rotulo: string; valor: string }[] = [];
    const k = (s: string) => t(`canonicalAnalysis.analyticsView.${s}`);
    const n = (v: number | null) => (v === null ? k("mapSuppressed") : v.toLocaleString());

    const por = (
      id: string,
      papel: Papel,
      rotulo: string,
      valor: string,
      coluna: number,
      faixa: number,
      de?: string,
    ) => {
      nos.push({
        id,
        type: "no",
        position: { x: coluna * COLUNA, y: faixa * FAIXA },
        data: { papel, rotulo, valor },
      });
      linhas.push({ rotulo, valor });
      if (de) arestas.push({ id: `${de}->${id}`, source: de, target: id });
    };

    /** Desenha até o teto e, se sobrar, um nó dizendo quantos — nunca corte mudo. */
    const filhos = (
      itens: readonly { rotulo: string; valor: string; ausente?: boolean }[],
      coluna: number,
      de: string,
      prefixo: string,
    ) => {
      itens.slice(0, TETO_DE_FILHOS).forEach((f, i) => {
        por(`${prefixo}-${i}`, f.ausente ? "ausente" : "massa", f.rotulo, f.valor, coluna, i, de);
      });
      const sobra = itens.length - TETO_DE_FILHOS;
      if (sobra > 0) {
        por(`${prefixo}-resto`, "resto", k("mapMore"), String(sobra), coluna, TETO_DE_FILHOS, de);
      }
    };

    por("raiz", "raiz", k("mapDenominator"), denominador.toLocaleString(), 0, 1.5);

    // ── o bloco, a massa e o desdobramento próprio de cada tipo ───────────────────────────
    if (bloco.tipo === "numerico") {
      const m = bloco.dado;
      por("bloco", "bloco", k("mapMeasure"), m.measure_id, 1, 1.5, "raiz");
      filhos(
        [
          { rotulo: k("mapValid"), valor: m.valid_count.toLocaleString() },
          // `suppression_applied` muda o que os nulos SIGNIFICAM: eles passam a ser o piso de
          // privacidade, não dado que faltou. Por isso troca a FORMA, não um rótulo ao lado.
          {
            rotulo: k("mapNull"),
            valor: m.suppression_applied ? k("mapSuppressed") : m.null_count.toLocaleString(),
            ausente: m.suppression_applied,
          },
          { rotulo: k("mapInvalid"), valor: m.invalid_count.toLocaleString() },
          { rotulo: k("mapAbsent"), valor: m.absent_count.toLocaleString() },
        ],
        2,
        "bloco",
        "massa",
      );
      por("metodo", "metodo", k("mapMethod"), `${m.method_id} · v${m.method_version}`, 3, 1.5, "massa-0");
      Object.entries(m.method_parameters ?? {}).forEach(([chave, valor], i) => {
        por(`param-${i}`, "metodo", chave, valor, 4, i, "metodo");
      });
    }

    if (bloco.tipo === "distribuicao") {
      const d = bloco.dado;
      por("bloco", "bloco", k("mapDistribution"), d.measure_id, 1, 1.5, "raiz");
      const grupos = d.groups.map((g) => ({ rotulo: g.label, valor: g.count.toLocaleString() }));
      // `other_count === null` NÃO é zero: o contrato diz que é "nem a soma dos suprimidos alcança
      // o piso". Vira nó de ausência, com hachura.
      grupos.push({
        rotulo: k("mapOther"),
        valor: n(d.other_count),
        ausente: d.other_count === null,
      } as never);
      filhos(grupos, 2, "bloco", "grupo");
      por("distintos", "massa", k("mapDistinct"), d.distinct_observed.toLocaleString(), 3, 1.5, "bloco");
    }

    if (bloco.tipo === "concentracao") {
      const c = bloco.dado;
      por("bloco", "bloco", k("mapConcentration"), c.measure_id, 1, 1.5, "raiz");
      filhos(
        c.bands.map((b) => ({
          rotulo: `${b.lower_value.toLocaleString()} – ${b.upper_value.toLocaleString()}`,
          valor: b.entity_count.toLocaleString(),
        })),
        2,
        "bloco",
        "faixa",
      );
      // As três recusas são fatos DIFERENTES e cada uma vira seu próprio nó de ausência: agrupá-las
      // num "suprimido" único apagaria por que o número não veio.
      const recusas = [
        c.coarsening_applied ? k("mapCoarsened") : null,
        c.suppression_applied ? k("mapSuppressedBand") : null,
        c.high_cardinality_suppressed ? k("mapHighCardinality") : null,
      ].filter((x): x is string => x !== null);
      recusas.forEach((r, i) => {
        por(`recusa-${i}`, "ausente", k("mapWithheld"), r, 3, i, "bloco");
      });
    }

    if (bloco.tipo === "serie") {
      const s = bloco.dado;
      por("bloco", "bloco", k("mapSeries"), s.dimension_id, 1, 1.5, "raiz");
      filhos(
        // `count: null` acontece APENAS quando a janela foi suprimida. Zero é valor.
        s.windows.map((w) => ({
          rotulo: w.window_start,
          valor: n(w.count),
          ausente: w.count === null,
        })),
        2,
        "bloco",
        "janela",
      );
      por("granularidade", "massa", k("mapGranularity"), s.effective_granularity, 3, 1.5, "bloco");
      por("metodo", "metodo", k("mapMethod"), `${s.method_id} · v${s.method_version}`, 4, 1.5, "granularidade");
    }

    return { nos, arestas, linhas };
  }, [bloco, denominador, t]);

  return (
    <div className="grid gap-2">
      {/* `aria-hidden`: o canvas não é navegável por teclado nem legível por leitor de tela. A
          lista abaixo carrega os mesmos fatos, e é ela que responde a quem audita. */}
      <div
        aria-hidden="true"
        className="h-[19rem] overflow-hidden rounded-lg border border-border bg-background"
      >
        <ReactFlow
          nodes={nos}
          edges={arestas}
          nodeTypes={TIPOS}
          fitView
          // Sem edição: este mapa é LEITURA. Arrastar um nó sugeriria que a cadeia é rearranjável,
          // e ela é o que o produtor publicou.
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      <ul className="sr-only">
        {linhas.map((l, i) => (
          <li key={`${l.rotulo}-${i}`}>
            {l.rotulo}: {l.valor}
          </li>
        ))}
      </ul>
    </div>
  );
}
