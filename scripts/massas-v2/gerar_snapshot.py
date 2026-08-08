"""Etapa 1 da geração das massas v2: o SNAPSHOT REAL, pelo reducer real do Analytics.

Roda no venv do `sentinela-analytics-service`. Escreve os snapshots em JSON no diretório de
saída; a etapa 2 (venv do assembler) os consome.

Nada aqui inventa número: o que é sintético é a ENTRADA (o dataset canônico), e a entrada é a
única coisa que pode ser sintética sem a massa deixar de provar algo. Todo agregado sai de
`reducer.agregacao.calcular` e de `reducer.publicacao.construir`.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from analytics_service.contracts.projecao_publica import ProjecaoPublica
from analytics_service.reducer.agregacao import calcular
from analytics_service.reducer.publicacao import Procedencia, construir

SAIDA = Path(sys.argv[1])

# ── as declarações ───────────────────────────────────────────────────────────────────────

CANAL = {
    "dimension_id": "canal",
    "source_field": "channel",
    "value_type": "categorical_code",
    "semantic_role": "count",
    "privacy_classification": "non_personal",
    "nullable": True,
    "aggregation_capabilities": ["not_aggregable"],
    "max_label_length": 32,
}
QUANDO = {
    "dimension_id": "quando",
    "source_field": "timestamp",
    "value_type": "timestamp",
    "semantic_role": "instant",
    "privacy_classification": "non_personal",
    "nullable": True,
    "aggregation_capabilities": ["not_aggregable"],
    "timezone_policy": "UTC",
}
#: `integer` + `summable` — as duas exigências para haver concentração (Pareto).
TURNOS = {
    "measure_id": "declared_turns",
    "value_type": "integer",
    "unit": "turns",
    "semantic_role": "sum",
    "privacy_classification": "non_personal",
    "aggregation_capabilities": ["summable"],
    "nullable": True,
}
CUSTO = {
    "measure_id": "custo",
    "value_type": "decimal",
    "unit": "BRL",
    "semantic_role": "sum",
    "privacy_classification": "non_personal",
    "aggregation_capabilities": ["summable"],
    "nullable": True,
}
RESOLVIDO = {
    "measure_id": "resolvido",
    "value_type": "boolean",
    "unit": "boolean",
    "semantic_role": "flag",
    "privacy_classification": "non_personal",
    "aggregation_capabilities": ["recompute_from_components"],
    "nullable": True,
}

INICIO = datetime(2026, 7, 1, tzinfo=UTC)

#: 100 registros — a contagem B dos facts da massa A (`observed_conversations = 100`). A
#: invariante B == C do Assembler recusaria a montagem com qualquer outro tamanho.
TOTAL = 100

#: 45 + 30 + 15 + 10 = 100, todos acima do piso de 10: nenhum rótulo é retido.
CANAIS = ["whatsapp"] * 45 + ["chat"] * 30 + ["email"] * 15 + ["phone"] * 10


def _linha(indice: int, *, canal: str, resolvido: bool | None = None) -> bytes:
    # Turnos concentrados de propósito: poucas conversas longas concentram o volume, que é
    # exatamente o que as duas perguntas de Pareto medem. Os coortes têm 12/20/68 entidades —
    # todos acima do piso de 10, para as faixas saírem publicadas em vez de suprimidas.
    turnos = 40 if indice < 12 else (12 if indice < 32 else 3)
    registro: dict[str, Any] = {
        "conversation_id": f"c{indice:04d}",
        "assistant_text": "uma resposta",
        "channel": canal,
        # Espalhado por ~6 meses: com 100 registros, a janela DIÁRIA não alcançaria o piso e a
        # escada engrossaria até sobrar uma janela só. A série publicada é decisão do
        # publicador; o que se prepara aqui é o intervalo.
        "timestamp": (INICIO + timedelta(days=(indice * 17) % 180, hours=indice % 7)).isoformat(),
        "measures": {
            "measures": [
                {"measure_id": "declared_turns", "value": turnos},
                {"measure_id": "custo", "value": round(0.05 + (indice % 9) * 0.01, 4)},
                {
                    "measure_id": "resolvido",
                    "value": (indice % 4 != 0) if resolvido is None else resolvido,
                },
            ]
        },
    }
    return json.dumps(registro, ensure_ascii=False).encode("utf-8") + b"\n"


def _dataset() -> list[bytes]:
    return [_linha(i, canal=CANAIS[i]) for i in range(TOTAL)]


def _snapshot(linhas: list[bytes]):
    return calcular(
        iter(linhas),
        measure_schema=[TURNOS, CUSTO, RESOLVIDO],
        dimension_schema=[CANAL, QUANDO],
        # O cruzamento canal × resolvido entra nos DOIS casos. No `ready` ele é publicável e
        # serve para provar a nota honesta da tela ("o documento trouxe blocos que esta versão
        # não apresenta"); no `parcial` é ele que o avaliador conjunto remove.
        cruzamentos=[("canal", "resolvido")],
    )


PROCEDENCIA = Procedencia(
    analysis_id="an-massa-a",
    snapshot_digest="s" * 64,
    input_artifact_id="11111111-1111-4111-8111-111111111111",
    input_checksum_sha256="c" * 64,
)


def _publicar(snapshot) -> ProjecaoPublica:
    return construir(snapshot, procedencia=PROCEDENCIA).projecao


def _gravar(nome: str, projecao: ProjecaoPublica) -> None:
    corpo = {
        "component_status": projecao.component_status,
        "projection_digest": projecao.projection_digest,
        "snapshot_contract_version": projecao.snapshot_contract_version,
        "snapshot": None
        if projecao.snapshot is None
        else projecao.snapshot.model_dump(mode="json"),
        "record_count": None if projecao.snapshot is None else projecao.snapshot.record_count,
    }
    (SAIDA / nome).write_text(json.dumps(corpo, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{nome}: {projecao.component_status}", flush=True)


def main() -> None:
    SAIDA.mkdir(parents=True, exist_ok=True)

    pronta = _publicar(_snapshot(_dataset()))
    _gravar("ready.json", pronta)

    # ── PARCIAL: o par que vaza ─────────────────────────────────────────────────────────
    #
    # Dois canais (70 / 30) e o cruzamento canal × resolvido. No `phone`, apenas 3 conversas
    # resolvidas: a célula fica abaixo do piso e a linha inteira é suprimida. Sobra UMA linha
    # publicada de um universo de duas — e a marginal da flag entrega a outra por subtração.
    #
    # É a condição que o avaliador conjunto procura (`universo - publicadas == 1`). Quem decide
    # remover o bloco é ELE; aqui só se prepara a condição.
    canais = ["whatsapp"] * 70 + ["phone"] * 30
    linhas = [
        _linha(
            i,
            canal=canais[i],
            # `whatsapp` fica equilibrado (células folgadas); `phone` resolve só 3 vezes.
            resolvido=(i % 2 == 0) if canais[i] == "whatsapp" else (i >= 97),
        )
        for i in range(TOTAL)
    ]
    _gravar("parcial.json", _publicar(_snapshot(linhas)))

    # ── RETIDO: nada pôde ser liberado ──────────────────────────────────────────────────
    #
    # `withheld` NÃO é alcançável a partir de um dataset bem-formado: ele é o ramo de "a
    # avaliação não convergiu ou a declaração é contraditória", e o reducer não produz
    # declaração contraditória. O próprio teste do serviço o alcança do mesmo jeito — quebrando
    # `distinct_observed` — e é a única forma que existe.
    #
    # O que continua REAL é o que interessa à tela: o envelope sai do publicador de verdade,
    # com a decisão dele. E ele não carrega número analítico nenhum, por definição.
    real = _snapshot(_dataset())
    canal = real.dimensions[0]
    contraditorio = real.model_copy(
        update={"dimensions": (canal.model_copy(update={"distinct_observed": 1}),)}
    )
    _gravar("retido.json", _publicar(contraditorio))

    print("OK", flush=True)


if __name__ == "__main__":
    main()
