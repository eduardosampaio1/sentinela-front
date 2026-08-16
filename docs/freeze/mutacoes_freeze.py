# -*- coding: utf-8 -*-
"""FREEZE — a campanha de mutação do congelamento de estados.

Congelar é a afirmação mais fácil de escrever e a mais fácil de fingir: um documento dizendo "o
vocabulário está congelado" não impede nada. O gate precisa reprovar quando o vocabulário muda, nos
DOIS sentidos — e precisa reprovar quando ele próprio para de enxergar.

Uso:  python docs/freeze/mutacoes_freeze.py
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
NPX = "npx.cmd" if sys.platform == "win32" else "npx"
ESTADOS = RAIZ / "src/design/patterns/estados.ts"
CONTRATO = RAIZ / "src/lib/v1/contract/public-v1.types.ts"
SPEC = "src/test/v1/freeze-estados.test.ts"


@dataclass(frozen=True)
class Mutacao:
    nome: str
    arquivo: Path
    de: str
    para: str
    porque: str


MUTACOES: list[Mutacao] = [
    Mutacao(
        nome="1 · um estado NOVO entra no ciclo de vida",
        arquivo=ESTADOS,
        de='  | "recovering"\n',
        para='  | "recovering"\n  | "paused"\n',
        porque=(
            "É o caso real que o gate existe para pegar. Um membro novo numa união COMPILA, passa "
            "em tudo, e cai no `default` do `switch` da tela — renderizando o banner errado sem "
            "aviso. Foi assim que a M14 achou `needs_mapping` no `default` do AnalysisPage."
        ),
    ),
    Mutacao(
        nome="2 · um estado SOME do ciclo de vida",
        arquivo=ESTADOS,
        de='  | "recovering"\n',
        para="",
        porque=(
            "O outro sentido. Remover é tão perigoso quanto acrescentar: o produtor continua "
            "publicando `recovering`, e a tela deixa de ter um caso para ele. Congelar tem de ser "
            "nos dois sentidos, ou é só um teto."
        ),
    ),
    Mutacao(
        nome="3 · o vocabulário do CONTRATO muda",
        arquivo=CONTRATO,
        de='"ready" | "partial" | "withheld" | "failed" | "unknown"',
        para='"ready" | "partial" | "withheld" | "failed"',
        porque=(
            "`AnalyticsComponentStatus` é do contrato, não do Design System: mexer nele é mexer no "
            "que o produtor publica. E `unknown` é justamente o estado que carrega a distinção mais "
            "cara do programa — *nada está sendo afirmado* não é *falhou*."
        ),
    ),
    Mutacao(
        nome="4 · o extrator para de enxergar",
        arquivo=RAIZ / SPEC,
        de='  const i = fonte.indexOf(`export type ${nome} =`);',
        para='  const i = fonte.indexOf(`export interface ${nome} =`);',
        porque=(
            "Sem piso de instrumento, um extrator cego devolve lista vazia e `[] === []` aprova "
            "qualquer vocabulário. É a vacuidade que a M45.8 pegou no gate de cobertura de rotas, "
            "aqui aplicada ao próprio congelamento."
        ),
    ),
]


def rodar() -> tuple[int, str]:
    p = subprocess.run(
        [NPX, "vitest", "run", SPEC, "--reporter=verbose"],
        cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def main() -> int:
    print("=" * 88)
    print("FREEZE · campanha de mutação — congelar tem de reprovar nos dois sentidos")
    print("=" * 88)

    print("\n[base] o gate precisa estar verde ANTES...")
    codigo, saida = rodar()
    if codigo != 0:
        print("ABORTADO — a base já está vermelha.")
        print(saida[-2000:])
        return 1
    print("[base] verde.")

    sobreviventes: list[str] = []

    for m in MUTACOES:
        print("\n" + "-" * 88)
        print(f"MUTAÇÃO {m.nome}")
        print(f"  por quê: {m.porque}")

        original = m.arquivo.read_text(encoding="utf-8")
        de = m.de.replace("\n", "\r\n") if "\r\n" in original else m.de
        para = m.para.replace("\n", "\r\n") if "\r\n" in original else m.para

        if original.count(de) != 1:
            print(f"  !! ÂNCORA NÃO CASOU ({original.count(de)}x) — mutação INVÁLIDA, não é prova")
            sobreviventes.append(f"{m.nome} [âncora inválida]")
            continue

        m.arquivo.write_text(original.replace(de, para), encoding="utf-8")
        try:
            codigo, saida = rodar()
        finally:
            m.arquivo.write_text(original, encoding="utf-8")

        if codigo == 0:
            print("  >> SOBREVIVEU — o congelamento não congela nada.")
            sobreviventes.append(m.nome)
        else:
            quem = [l.split(">")[-1].strip()[:76] for l in saida.splitlines() if l.strip().startswith("×")]
            print(f"  >> MORTA por {len(quem)} caso(s):")
            for a in dict.fromkeys(quem):
                print(f"       · {a}")

    print("\n" + "=" * 88)
    if sobreviventes:
        print(f"SOBREVIVENTES ({len(sobreviventes)}/{len(MUTACOES)}):")
        for s in sobreviventes:
            print(f"  · {s}")
        return 1
    print(f"TODAS MORTAS — {len(MUTACOES)}/{len(MUTACOES)}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
