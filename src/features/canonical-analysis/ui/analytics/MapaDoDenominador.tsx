import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useLanguage } from "@/contexts/LanguageContext";
import type { AnalysisIntake } from "@/lib/v1";
import type { SnapshotAnalitico } from "../../result/analyticsProjection";

const LARGURA = 178;
const ALTURA = 58;

const PONTOS = [
  { type: "target" as const, position: Position.Left, x: 0, y: ALTURA / 2 },
  { type: "source" as const, position: Position.Right, x: LARGURA, y: ALTURA / 2 },
  { type: "source" as const, position: Position.Bottom, x: LARGURA / 2, y: ALTURA },
];

type Papel = "principal" | "aceito" | "publicado" | "fora";

interface DadoDoNo extends Record<string, unknown> {
  papel: Papel;
  rotulo: string;
  valor: string;
}

function NoDoDenominador({ data }: { readonly data: DadoDoNo }) {
  return (
    <div className={`no-denom ${data.papel}`}>
      <Handle type="target" position={Position.Left} className="!h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent opacity-0" />
      <Handle type="source" position={Position.Right} className="!h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!h-px !w-px !min-h-0 !min-w-0 !border-0 !bg-transparent opacity-0" />
      <span>{data.rotulo}</span>
      <b className="tabular-nums">{data.valor}</b>
    </div>
  );
}

const TIPOS = { denom: NoDoDenominador };

function totalRetido(snapshot: SnapshotAnalitico) {
  return (
    snapshot.blocosNaoApresentados +
    snapshot.medidasNaoResumidas +
    snapshot.medidasNaoAutorizadas +
    snapshot.blocosIlegiveis
  );
}

function temDesvio(
  desvio: { valor: number | null | undefined },
): desvio is { valor: number } {
  return typeof desvio.valor === "number" && desvio.valor > 0;
}

export function MapaDoDenominador({
  snapshot,
  intake,
}: {
  readonly snapshot: SnapshotAnalitico;
  readonly intake: AnalysisIntake | null | undefined;
}) {
  const { t, language } = useLanguage();
  const locale = language === "pt" ? "pt-BR" : "en-US";

  const { nos, arestas, linhas, altura } = useMemo(() => {
    const numero = new Intl.NumberFormat(locale);
    const formatar = (valor: number) => numero.format(valor);
    const nodes: Node<DadoDoNo>[] = [];
    const edges: Edge[] = [];
    const rows: { rotulo: string; valor: string }[] = [];

    const adicionar = (
      id: string,
      papel: Papel,
      rotulo: string,
      valor: string,
      x: number,
      y: number,
      de?: string,
    ) => {
      nodes.push({
        id,
        type: "denom",
        position: { x, y },
        width: LARGURA,
        height: ALTURA,
        handles: PONTOS,
        data: { papel, rotulo, valor },
      });
      rows.push({ rotulo, valor });
      if (de) edges.push({ id: `${de}->${id}`, source: de, target: id });
    };

    adicionar(
      "base",
      "principal",
      t("canonicalAnalysis.analyticsView.traceReceived"),
      intake ? formatar(intake.source_record_count) : "—",
      0,
      58,
    );
    adicionar(
      "aceitas",
      "aceito",
      t("canonicalAnalysis.analyticsView.traceAccepted"),
      formatar(snapshot.record_count),
      230,
      58,
      "base",
    );
    adicionar(
      "snapshot",
      "publicado",
      t("canonicalAnalysis.analyticsView.tracePublished"),
      formatar(snapshot.record_count),
      460,
      58,
      "aceitas",
    );

    const desvios = [
      {
        id: "contagem",
        valor: intake?.rejected_record_count,
        rotulo: t("canonicalAnalysis.analyticsView.traceCountedOnly"),
        de: "base",
      },
      {
        id: "nao-apresentados",
        valor: snapshot.blocosNaoApresentados,
        rotulo: t("canonicalAnalysis.analyticsView.notPresented"),
        de: "snapshot",
      },
      {
        id: "nao-resumidas",
        valor: snapshot.medidasNaoResumidas,
        rotulo: t("canonicalAnalysis.analyticsView.notSummarized"),
        de: "snapshot",
      },
      {
        id: "nao-autorizadas",
        valor: snapshot.medidasNaoAutorizadas,
        rotulo: t("canonicalAnalysis.analyticsView.notAuthorized"),
        de: "snapshot",
      },
      {
        id: "ilegiveis",
        valor: snapshot.blocosIlegiveis,
        rotulo: t("canonicalAnalysis.analyticsView.unreadable"),
        de: "snapshot",
      },
    ].filter(temDesvio);

    desvios.forEach((desvio, indice) => {
      adicionar(
        desvio.id,
        "fora",
        desvio.rotulo,
        formatar(desvio.valor),
        desvio.de === "base" ? 0 : 230 + indice * 135,
        160,
        desvio.de,
      );
    });

    return {
      nos: nodes,
      arestas: edges,
      linhas: rows,
      altura: desvios.length > 0 || totalRetido(snapshot) > 0 ? 250 : 150,
    };
  }, [intake, locale, snapshot, t]);

  if (typeof globalThis.ResizeObserver === "undefined") {
    return (
      <ol className="mapa-denom mapa-denom-fallback">
        {linhas.map((linha, i) => (
          <li key={`${linha.rotulo}-${i}`}>
            <span>{linha.rotulo}</span>
            <b className="tabular-nums">{linha.valor}</b>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="mapa-denom">
      <div aria-hidden="true" style={{ height: altura }}>
        <ReactFlow
          nodes={nos}
          edges={arestas}
          nodeTypes={TIPOS}
          fitView
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        </ReactFlow>
      </div>
      <ul className="sr-only">
        {linhas.map((linha, i) => (
          <li key={`${linha.rotulo}-${i}`}>
            {linha.rotulo}: {linha.valor}
          </li>
        ))}
      </ul>
    </div>
  );
}
