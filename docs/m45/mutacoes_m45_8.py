# -*- coding: utf-8 -*-
"""M45.8 — a campanha de mutação do gate de COBERTURA.

A M45 inteira se chamou "endurecimento da experiência" e mediu 24 journeys sobre um router de 39
rotas. Sete tranches fecharam verdes sem que nada medisse a COBERTURA — e a M45.7 chegou a publicar
54 nós de a11y como "o total" quando o que ela não tinha olhado guardava 105.

O gate desta tranche afirma uma coisa sobre o CONJUNTO: nenhuma rota existe sem journey ou sem
motivo escrito. Afirmação sobre conjunto é a mais fácil de escrever e a mais fácil de fingir — um
extrator cego devolve lista vazia, e lista vazia passa em tudo.

Cada mutação ataca uma peça diferente. A #2 é a mais importante: ela reencena o defeito REAL que o
gate teve na estreia, quando lia só aspas duplas e acusou quatro rotas cobertas.

Uso:  python docs/m45/mutacoes_m45_8.py
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
GATE = RAIZ / "src" / "test" / "v1" / "matriz-cobre-o-router.test.ts"
MATRIZ = RAIZ / "e2e" / "m45-matriz.spec.ts"

NPX = "npx.cmd" if sys.platform == "win32" else "npx"


@dataclass(frozen=True)
class Mutacao:
    nome: str
    arquivo: Path
    de: str
    para: str
    porque: str
    # "vitest" é o gate de cobertura (2s); "playwright" é a matriz (40s). Rodar o caro quando o
    # barato já responde só encarece a campanha e faz ninguém a repetir.
    suite: str


MUTACOES: list[Mutacao] = [
    Mutacao(
        nome="1 · uma rota perde o motivo escrito",
        arquivo=GATE,
        de='  "/auth/callback": "handshake do provedor — sem superfície própria",\n',
        para="",
        porque=(
            "Se remover a declaração não reprovar, `FORA_DA_MATRIZ` é decorativo e o gate aceita "
            "rota sem journey e sem motivo — que é exatamente o NO CREDIT que a M45 herdou."
        ),
        suite="vitest",
    ),
    Mutacao(
        nome="2 · o extrator volta a ser cego a template literal",
        arquivo=GATE,
        de="  const modelos = [...fonte.matchAll(/rota:\\s*`([^`]+)`/g)].map((m) =>",
        para="  const modelos = [].map((m: { 1: string }) =>",
        porque=(
            "REENCENA O DEFEITO REAL DA ESTREIA. Lendo só aspas duplas, o gate perde toda journey "
            "com identificador e acusa como descobertas quatro rotas que TÊM journey. Se esta "
            "mutação sobrevivesse, o gate poderia mentir nos dois sentidos sem ninguém notar."
        ),
        suite="vitest",
    ),
    Mutacao(
        nome="3 · uma rota morta ganha motivo",
        arquivo=GATE,
        de='  "/manage-context": "redirect → /workspaces",',
        para='  "/rota-que-o-router-nao-tem": "redirect → /workspaces",',
        porque=(
            "A outra ponta da catraca. Sem ela, `FORA_DA_MATRIZ` vira cemitério de rotas mortas — "
            "e lista de exceções que ninguém poda deixa de ser lida."
        ),
        suite="vitest",
    ),
    Mutacao(
        nome="4 · a dívida de cobertura cresce em silêncio",
        arquivo=GATE,
        de='  "/analyses/compare/:analysisAId/:analysisBId": "DÍVIDA — superfície real, ainda fora da matriz",',
        para='  "/analyses/compare/:analysisAId/:analysisBId": "coberta por suíte própria",',
        porque=(
            "Trocar o rótulo DÍVIDA por uma justificativa que soa razoável é o caminho fácil mais "
            "provável — e é como uma dívida some do relatório sem sumir do produto."
        ),
        suite="vitest",
    ),
    Mutacao(
        nome="5 · o teto de a11y do produto inteiro sobe",
        arquivo=MATRIZ,
        de='      "o total de dívida de a11y declarada mudou",\n    ).toBe(159);',
        para='      "o total de dívida de a11y declarada mudou",\n    ).toBe(160);',
        porque=(
            "159 é o número que a M45.8 apurou somando o que a M45.7 mediu (54) ao que ela não "
            "tinha olhado (105). Se ele puder divergir do medido, a consolidação é prosa."
        ),
        suite="playwright",
    ),
]


def rodar(suite: str) -> tuple[int, str]:
    if suite == "vitest":
        cmd = [NPX, "vitest", "run", "src/test/v1/matriz-cobre-o-router.test.ts", "--reporter=dot"]
    else:
        cmd = [NPX, "playwright", "test", "e2e/m45-matriz.spec.ts", "--workers=4", "--reporter=line"]
    proc = subprocess.run(cmd, cwd=RAIZ, capture_output=True, text=True,
                          encoding="utf-8", errors="replace")
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def acusadores(saida: str, suite: str) -> list[str]:
    """QUEM matou — não só QUE morreu.

    O extrator da M45.7 pegava a primeira linha com "›" e o `--reporter=line` imprime a lista de
    PROGRESSO com o mesmo caractere; ele creditou o teste [1/68], que tinha apenas começado. Aqui o
    bloco de falhas é localizado explicitamente em cada reporter.
    """
    linhas = saida.splitlines()
    if suite == "vitest":
        return [l.split(">")[-1].strip()[:80] for l in linhas if l.strip().startswith("FAIL")] or [
            l.strip()[:80] for l in linhas if "AssertionError" in l
        ]
    inicio = next((i for i, l in enumerate(linhas) if "failed" in l and "passed" not in l), None)
    if inicio is None:
        return []
    return list(dict.fromkeys(
        l.split("›")[-1].strip()[:80] for l in linhas[inicio:] if "›" in l and "M45" in l
    ))


def main() -> int:
    print("=" * 88)
    print("M45.8 · campanha de mutação — o gate de cobertura do router")
    print("=" * 88)

    for suite in ("vitest", "playwright"):
        print(f"\n[base·{suite}] precisa estar verde ANTES de qualquer mutação...")
        codigo, saida = rodar(suite)
        if codigo != 0:
            print(f"ABORTADO — {suite} já está vermelho. Nenhuma morte provaria nada.")
            print(saida[-2500:])
            return 1
        print(f"[base·{suite}] verde.")

    sobreviventes: list[str] = []

    for m in MUTACOES:
        print("\n" + "-" * 88)
        print(f"MUTAÇÃO {m.nome}   [{m.suite}]")
        print(f"  por quê: {m.porque}")

        original = m.arquivo.read_text(encoding="utf-8")
        de = m.de.replace("\n", "\r\n") if "\r\n" in original else m.de
        para = m.para.replace("\n", "\r\n") if "\r\n" in original else m.para

        # Âncora que não casa produz arquivo INTACTO, suíte verde e relatório anunciando
        # "sobreviveu" sobre código que nunca foi tocado.
        if original.count(de) != 1:
            print(f"  !! ÂNCORA NÃO CASOU ({original.count(de)}x) — mutação INVÁLIDA, não é prova")
            sobreviventes.append(f"{m.nome} [âncora inválida]")
            continue

        m.arquivo.write_text(original.replace(de, para), encoding="utf-8")
        try:
            codigo, saida = rodar(m.suite)
        finally:
            m.arquivo.write_text(original, encoding="utf-8")

        if codigo == 0:
            print("  >> SOBREVIVEU — a peça atacada não é medida por ninguém.")
            sobreviventes.append(m.nome)
        else:
            quem = acusadores(saida, m.suite)
            print(f"  >> MORTA por {len(quem)} teste(s):")
            for a in quem:
                print(f"       · {a}")
            if not quem:
                print("       !! morreu, mas o instrumento não soube dizer quem matou")

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
