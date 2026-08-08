"""Etapa 3: os três documentos v2 viram um módulo TypeScript de massas.

Transcrição literal. Nenhum número é reescrito — `json.dumps` do documento produzido pela
etapa 2, indentado, sob um cabeçalho que declara a procedência.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

MASSAS = Path(sys.argv[1])
DESTINO = Path(sys.argv[2])

CABECALHO = '''// Massas do documento INTEGRADO `analysis-result-v2` — PRODUZIDAS pelo caminho real.
//
// PROVENIÊNCIA, em três etapas, todas com código de produção:
//
//   1  dataset canônico sintético (100 registros)
//        → sentinela-analytics-service::reducer.agregacao.calcular      → SnapshotAnalitico
//        → sentinela-analytics-service::reducer.publicacao.construir    → ProjecaoPublica
//   2  fixtures/massa_a_principal.facts.json  (facts REAIS do assembler, saída do código
//      analítico do repo `sentinela`)
//        + a projeção acima
//        → sentinela-result-assembler::assemble_v2                      → analysis-result-v2
//   3  transcrição literal do JSON para este arquivo
//
// O que é sintético é a ENTRADA — e só ela pode ser, sem a massa deixar de provar nada. Todo
// agregado abaixo (distribuições, concentração, séries, supressões) saiu do reducer real; a
// decisão de publicar, do publicador real; a montagem, da função de produção.
//
// Os três estados NÃO foram escolhidos: eles caíram das condições preparadas na entrada.
//
//   V2_READY    nada retido. Traz um `flag_cross` publicável — é ele que faz a tela exercitar a
//               nota honesta "o documento trouxe blocos que esta versão não apresenta".
//   V2_PARTIAL  o cruzamento canal x resolvido tem uma linha abaixo do piso; sobra UMA linha de
//               um universo de duas, e a marginal da flag entrega a outra por subtração. O
//               avaliador CONJUNTO removeu o bloco — e é isso que faz o desfecho ser `partial`.
//   V2_WITHHELD nada pôde ser liberado. Este estado NÃO é alcançável a partir de dataset
//               bem-formado: ele é o ramo de "a declaração é contraditória", e o reducer não
//               produz contradição. O próprio teste do serviço o alcança quebrando
//               `distinct_observed`, e foi o que se fez aqui. O ENVELOPE continua saindo do
//               publicador real — e, por definição, ele não carrega número analítico nenhum.
//
// Regenerar: os três scripts em `scratchpad/gerar_snapshot.py`, `gerar_v2.py`,
// `montar_fixture.py` (documentados em docs/MF6-4B-MASSAS.md).

import type { AnalysisResultView } from "@/lib/v1";

'''

RODAPE = '''
/**
 * O envelope do contrato público em volta de um documento.
 *
 * `result_schema_version` é o DISCRIMINADOR, e ele viaja no envelope — não dentro do `result`.
 * Deixá-lo parametrizável é o que permite provar a recusa por versão sem forjar o documento.
 */
export function envelopeV2(
  documento: unknown,
  versao = "analysis-result-v2",
): AnalysisResultView {
  return {
    analysis_id: "an-massa-a",
    result_schema_version: versao,
    indicator_registry_version: "indicators-1.0",
    result: documento,
  } as AnalysisResultView;
}
'''


def main() -> None:
    partes = [CABECALHO]
    for nome, constante, titulo in (
        ("ready", "V2_READY", "Nada retido — o documento inteiro."),
        ("parcial", "V2_PARTIAL", "Um bloco removido pela avaliação conjunta."),
        ("retido", "V2_WITHHELD", "Nada liberável — `data` nulo, e é conclusão."),
    ):
        documento = json.loads((MASSAS / f"v2_{nome}.json").read_text(encoding="utf-8"))
        corpo = json.dumps(documento, indent=2, ensure_ascii=False)
        partes.append(f"/** {titulo} */\nexport const {constante} = {corpo} as const;\n")
    partes.append(RODAPE)
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text("\n".join(partes), encoding="utf-8")
    print(f"escrito: {DESTINO} ({DESTINO.stat().st_size} bytes)", flush=True)


if __name__ == "__main__":
    main()
