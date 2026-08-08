// Export do resultado. **Função pura sobre o VIEW MODEL** — nunca sobre o payload.
//
// A escolha da fonte é a decisão inteira deste arquivo. Exportar a partir do documento bruto
// daria um arquivo com números que a tela não mostrou (e, pior, com campos que a tela decidiu não
// mostrar — o digest, os ids não apresentados). Exportar do view model garante, por construção,
// que o arquivo e a tela dizem a mesma coisa: os dois leem a mesma estrutura já formatada.
//
// Por isso não há formatação aqui. Os textos já vêm prontos do adapter; reformatá-los seria abrir
// a segunda casa de formatação que `formatacao.ts` existe para não ter.

import type { ResultV2ViewModel } from "./adapterV2";
import type { ResultViewModel } from "./adapter";

/** Uma linha do arquivo. `secao` e `bloco` situam o número; `valor` é o texto EXIBIDO. */
interface Linha {
  secao: string;
  bloco: string;
  item: string;
  valor: string;
}

/**
 * Escapa um campo para CSV. Aspas duplicadas, e o campo inteiro entre aspas.
 *
 * Sempre entre aspas, e não "só quando precisa": os valores exibidos carregam separador de
 * milhar, que em vários locales é a própria vírgula. Um arquivo que quebrasse a coluna conforme
 * o idioma do usuário seria pior que arquivo nenhum.
 */
function campo(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

function paraCsv(linhas: Linha[]): string {
  const cabecalho = ["section", "block", "item", "value"];
  const corpo = linhas.map((l) => [l.secao, l.bloco, l.item, l.valor].map(campo).join(","));
  return [cabecalho.map(campo).join(","), ...corpo].join("\r\n");
}

function linhasDaEngine(v: ResultViewModel | ResultV2ViewModel): Linha[] {
  const linhas: Linha[] = [];
  for (const ind of v.indicators) {
    linhas.push({
      secao: "indicators",
      bloco: ind.id,
      item: "value",
      // Estado sem valor exporta o ESTADO, não uma célula vazia: célula vazia num CSV é lida
      // como zero por praticamente toda planilha, e zero é o que a plataforma inteira recusa
      // usar para representar ausência.
      valor: ind.display === null ? ind.state : `${ind.display}${ind.unitSuffix ?? ""}`,
    });
    if (ind.coverageDisplay !== null) {
      linhas.push({
        secao: "indicators",
        bloco: ind.id,
        item: "coverage",
        valor: ind.coverageDisplay,
      });
    }
  }
  for (const rec of v.recommendations) {
    linhas.push({ secao: "recommendations", bloco: rec.id, item: rec.priority, valor: rec.title });
  }
  return linhas;
}

function linhasAnaliticas(v: ResultV2ViewModel): Linha[] {
  const linhas: Linha[] = [];
  linhas.push({
    secao: "analytics",
    bloco: "component",
    item: "status",
    valor: v.analytics.status,
  });
  // `withheld` exporta o estado e para. Um arquivo com as seções analíticas vazias sugeriria
  // que não havia dado; o que houve foi uma decisão de não liberar.
  if (v.analytics.status === "withheld") return linhas;

  const c = v.analytics.content;
  linhas.push({
    secao: "analytics",
    bloco: "component",
    item: "record_count",
    valor: c.recordCountDisplay,
  });
  for (const m of c.measures) {
    for (const s of m.stats) {
      linhas.push({
        secao: "measures",
        bloco: m.id,
        item: s.label,
        // Suprimida é dita, não deixada em branco.
        valor: s.display ?? (m.suppressed ? "withheld" : "not_measured"),
      });
    }
    for (const n of m.counts) {
      linhas.push({ secao: "measures", bloco: m.id, item: n.label, valor: n.display });
    }
  }
  for (const [secao, lista] of [
    ["dimensions", c.dimensions],
    ["distributions", c.distributions],
  ] as const) {
    for (const d of lista) {
      for (const g of d.groups) {
        linhas.push({ secao, bloco: d.id, item: g.label, valor: g.countDisplay });
      }
      if (d.otherCountDisplay !== null) {
        linhas.push({ secao, bloco: d.id, item: "other", valor: d.otherCountDisplay });
      }
    }
  }
  for (const conc of c.concentrations) {
    for (const e of conc.statistics) {
      linhas.push({
        secao: "concentration",
        bloco: conc.id,
        item: e.id,
        valor: e.display ?? (e.withheldLabel ?? "not_published"),
      });
    }
    for (const b of conc.bands) {
      linhas.push({
        secao: "concentration_bands",
        bloco: conc.id,
        item: b.label,
        valor: b.entityCountDisplay,
      });
    }
  }
  for (const s of c.series) {
    for (const w of s.windows) {
      linhas.push({
        secao: "time_series",
        bloco: s.id,
        item: w.label,
        valor: w.countDisplay ?? "withheld",
      });
    }
  }
  return linhas;
}

/**
 * O CSV do que está na tela. Serve os dois contratos — o v2 acrescenta as seções analíticas.
 *
 * A procedência entra como linhas próprias: um arquivo baixado sobrevive à aba que o gerou, e
 * sem as versões ninguém consegue dizer, meses depois, sob qual contrato aqueles números
 * saíram. O digest NÃO entra, pela mesma razão que ele não está na tela.
 */
export function exportarCsv(resolvido: { contrato: "v1" | "v2"; view: ResultViewModel | ResultV2ViewModel }): string {
  const v = resolvido.view;
  const linhas: Linha[] = [
    { secao: "analysis", bloco: "identity", item: "analysis_id", valor: v.analysisId },
    { secao: "analysis", bloco: "identity", item: "result_schema_version", valor: v.schemaVersion },
    {
      secao: "analysis",
      bloco: "identity",
      item: "indicator_registry_version",
      valor: v.indicatorRegistryVersion,
    },
    {
      secao: "analysis",
      bloco: "summary",
      item: "records_analyzed",
      valor:
        resolvido.contrato === "v2"
          ? (v as ResultV2ViewModel).summary.engineWindowRecordCountDisplay
          : String((v as ResultViewModel).summary.recordCount),
    },
    ...linhasDaEngine(v),
  ];
  if (resolvido.contrato === "v2") {
    const v2 = v as ResultV2ViewModel;
    linhas.push({
      secao: "analytics",
      bloco: "lineage",
      item: "snapshot_contract_version",
      valor: v2.analytics.lineage.snapshotContractVersion,
    });
    linhas.push(...linhasAnaliticas(v2));
  }
  return paraCsv(linhas);
}

/** Nome do arquivo. Só a identidade da análise — nenhum dado do cliente no nome. */
export function nomeDoArquivo(analysisId: string): string {
  const seguro = analysisId.replace(/[^A-Za-z0-9._-]/g, "-") || "analysis";
  return `${seguro}.csv`;
}
