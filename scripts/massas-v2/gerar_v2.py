"""Etapa 2 da geração das massas v2: `assemble_v2` REAL sobre facts reais + projeção real.

Roda com o `sentinela-result-assembler` no path. Consome os envelopes da etapa 1 e produz os
documentos `analysis-result-v2` que viram fixture do frontend.

Nenhum número é digitado: os facts são o golden do assembler (saída do código analítico real do
`sentinela`), a projeção é a saída do reducer/publicador real do Analytics, e a montagem é a
função de produção.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from result_assembler.assembler.assemble_v2 import assemble_v2
from result_assembler.contracts.analytics import AnalyticsComponent
from result_assembler.contracts.facts import AnalysisFacts

MASSAS = Path(sys.argv[1])
FACTS = Path(sys.argv[2])


def _facts() -> AnalysisFacts:
    return AnalysisFacts.model_validate(json.loads(FACTS.read_text(encoding="utf-8")))


def _montar(nome: str) -> dict[str, Any]:
    envelope = json.loads((MASSAS / f"{nome}.json").read_text(encoding="utf-8"))
    componente = AnalyticsComponent(
        component_status=envelope["component_status"],
        projection_digest=envelope["projection_digest"],
        snapshot_contract_version=envelope["snapshot_contract_version"],
        data=envelope["snapshot"],
        record_count=envelope["record_count"],
    )
    resultado = assemble_v2(_facts(), componente)
    return resultado.public_result.model_dump(mode="json")


def main() -> None:
    for nome in ("ready", "parcial", "retido"):
        documento = _montar(nome)
        destino = MASSAS / f"v2_{nome}.json"
        destino.write_text(
            json.dumps(documento, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(
            f"{nome}: {documento['result_schema_version']} "
            f"analytics={documento['analytics']['component_status']} "
            f"A={documento['summary']['engine_window_record_count']} "
            f"C={documento['analytics']['record_count']}",
            flush=True,
        )
    print("OK", flush=True)


if __name__ == "__main__":
    main()
