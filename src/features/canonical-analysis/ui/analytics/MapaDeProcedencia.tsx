// O MAPA DE PROCEDÊNCIA — de onde veio este número, em quatro níveis.
//
// ## A pergunta que ele responde
//
// A visão Medidas sempre foi sobre *"por que temos esses números?"*. O painel de texto já
// respondia, item por item; o que faltava era ver a CADEIA — que o total nasce de um denominador,
// que a massa se divide em válido, nulo, inválido e ausente, e que sobre ela roda um método com
// versão e parâmetros.
//
// Nada aqui é inventado. Os quatro níveis são exatamente o que `ResumoNumerico` publica, e a raiz
// é `record_count`, que o contrato descreve como *"o denominador verdadeiro — todo o resto é
// contado sobre ele"*.
//
//   1. DENOMINADOR  `record_count`
//   2. MEDIDA       `measure_id`, `unit`, `semantic_role`
//   3. MASSA        `valid_count`, `null_count`, `invalid_count`, `absent_count`
//   4. MÉTODO       `method_id` v`method_version`, `method_parameters`, digest
//
// ## Acessibilidade: o mapa é a SEGUNDA forma, nunca a única
//
// Um grafo com pan e zoom não é navegável por teclado nem legível por leitor de tela — e a
// procedência é justamente o que alguém precisa auditar. Por isso o canvas inteiro é
// `aria-hidden`, e ao lado dele vai uma LISTA semântica com os mesmos fatos, visível apenas para
// tecnologia assistiva.
//
// Não é redundância de layout: é a mesma regra que faz o número ficar sempre escrito ao lado da
// barra. Quem não vê o desenho continua lendo o fato.
//
// ## Por que o layout é calculado aqui, e não por uma biblioteca de grafo
//
// A procedência é uma árvore RASA e de forma conhecida — quatro níveis, ramificação só no
// terceiro. Um algoritmo de layout genérico resolveria um problema que não temos e traria uma
// segunda dependência. `x` é a profundidade, `y` é a posição na coluna.

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
import type { ResumoNumerico } from "../../result/analyticsProjection";

/** Largura de uma coluna e altura de uma faixa. O layout é determinístico. */
const COLUNA = 230;
const FAIXA = 74;

type Papel = "raiz" | "medida" | "massa" | "metodo" | "ausente";

interface DadoDoNo extends Record<string, unknown> {
  papel: Papel;
  rotulo: string;
  valor: string;
}

/**
 * O nó.
 *
 * `ausente` recebe a hachura do léxico — a mesma classe que a linha de coleção usa. Uma contagem
 * suprimida por privacidade não é zero, e no mapa isso precisa ficar tão visível quanto na lista.
 */
function No({ data }: { data: DadoDoNo }) {
  const suprimido = data.papel === "ausente";
  return (
    <div
      className={[
        "min-w-[11rem] max-w-[13rem] rounded-lg border px-3 py-2",
        suprimido ? "medida-ausente border-border" : "border-border bg-card",
        data.papel === "raiz" ? "border-l-2 border-l-primary" : "",
      ].join(" ")}
    >
      <div className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">
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
  medida,
  denominador,
}: {
  medida: ResumoNumerico;
  /** `record_count` do snapshot — a raiz da cadeia, não um número desta medida. */
  denominador: number;
}) {
  const { t } = useLanguage();

  const { nos, arestas, linhas } = useMemo(() => {
    const nos: Node<DadoDoNo>[] = [];
    const arestas: Edge[] = [];
    /** A mesma árvore em texto, para quem não vê o desenho. */
    const linhas: { nivel: number; rotulo: string; valor: string }[] = [];

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
      linhas.push({ nivel: coluna, rotulo, valor });
      if (de) arestas.push({ id: `${de}->${id}`, source: de, target: id });
    };

    // 1 · o denominador
    por("raiz", "raiz", t("canonicalAnalysis.analyticsView.mapDenominator"), denominador.toLocaleString(), 0, 1.5);

    // 2 · a medida
    por(
      "medida",
      "medida",
      t("canonicalAnalysis.analyticsView.mapMeasure"),
      medida.measure_id,
      1,
      1.5,
      "raiz",
    );

    // 3 · a massa. `suppression_applied` muda o que os nulos SIGNIFICAM, e por isso troca a forma
    //     do nó em vez de virar um rótulo ao lado.
    const massa: [string, number, boolean][] = [
      [t("canonicalAnalysis.analyticsView.mapValid"), medida.valid_count, false],
      [t("canonicalAnalysis.analyticsView.mapNull"), medida.null_count, medida.suppression_applied],
      [t("canonicalAnalysis.analyticsView.mapInvalid"), medida.invalid_count, false],
      [t("canonicalAnalysis.analyticsView.mapAbsent"), medida.absent_count, false],
    ];
    massa.forEach(([rotulo, valor, suprimido], i) => {
      por(
        `massa-${i}`,
        suprimido ? "ausente" : "massa",
        rotulo,
        suprimido ? t("canonicalAnalysis.analyticsView.mapSuppressed") : valor.toLocaleString(),
        2,
        i,
        "medida",
      );
    });

    // 4 · o método, e os parâmetros que ele recebeu
    por(
      "metodo",
      "metodo",
      t("canonicalAnalysis.analyticsView.mapMethod"),
      `${medida.method_id} · v${medida.method_version}`,
      3,
      1.5,
      "massa-0",
    );

    const params = Object.entries(medida.method_parameters ?? {});
    params.forEach(([chave, valor], i) => {
      por(`param-${i}`, "metodo", chave, valor, 4, i, "metodo");
    });

    return { nos, arestas, linhas };
  }, [medida, denominador, t]);

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
