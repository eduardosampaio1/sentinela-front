# -*- coding: utf-8 -*-
"""M45.7 — a campanha de mutação das superfícies PÚBLICAS.

O que esta tranche entregou não é uma correção de tela: é uma CATRACA. As quatro superfícies
públicas (landing, termos, entrada, sessão expirada) estavam fora de toda medição — NO CREDIT —, e
o que a matriz encontrou nelas foram 54 nós de a11y reprovados e três telas sem `<main>`.

Corrigir 43 violações de contraste cravadas em hex na landing é redesenho, e o Freeze não autoriza.
Então a entrega é outra: a dívida passa a ser CONTADA, e o número não pode crescer nem encolher em
silêncio. Uma catraca é uma promessa — e promessa sem mutação é docstring.

Cada mutação abaixo ataca uma peça DIFERENTE da catraca. Se alguma sobreviver, a peça que ela
atacou é decoração.

Uso:  python docs/m45/mutacoes_m45_7.py
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MATRIZ = RAIZ / "e2e" / "m45-matriz.spec.ts"


@dataclass(frozen=True)
class Mutacao:
    nome: str
    arquivo: Path
    de: str
    para: str
    porque: str
    # Quem DEVE matar. Registrar o assassino esperado é o que separa "morreu" de "morreu pelo
    # motivo certo" — o programa já teve mutação morta por erro de compilação e contada como prova.
    assassino_esperado: str


MUTACOES: list[Mutacao] = [
    Mutacao(
        nome="1 · a dívida da landing cresce em um nó",
        arquivo=MATRIZ,
        de='regiao: "body", axeConhecido: 43,',
        para='regiao: "body", axeConhecido: 44,',
        porque=(
            "Se o número declarado puder divergir do medido sem ninguém reprovar, a catraca é um "
            "comentário. Esta é a mutação que prova que o 43 é MEDIDO, e não escrito."
        ),
        assassino_esperado="G7 · J21 · axe sem violação aplicável (e G1-bis pelo total)",
    ),
    Mutacao(
        nome="2 · o teto total da dívida sobe",
        arquivo=MATRIZ,
        de='"o total de dívida de a11y declarada mudou",\n    ).toBe(54);',
        para='"o total de dívida de a11y declarada mudou",\n    ).toBe(55);',
        porque=(
            "O teto agregado é a peça que impede a dívida de migrar entre superfícies sem "
            "aparecer. Sem ele, baixar 1 na landing e subir 1 nos termos passaria despercebido."
        ),
        assassino_esperado="G1-bis · só as superfícies públicas conhecidas declaram dívida",
    ),
    Mutacao(
        nome="3 · a sessão NÃO é desfeita nas superfícies de entrada",
        arquivo=MATRIZ,
        de="    delete (window as unknown as Record<string, unknown>).__SENTINELA_E2E_AUTH__;",
        para="    void 0;",
        porque=(
            "Este é o achado da tranche virado gate. Com a sessão de pé, `/login` e "
            "`/session-expired` renderizam a HOME — duas journeys medindo uma tela que não é a "
            "delas. Se a matriz não reprovar isso, ela aceita dois nomes para a mesma superfície."
        ),
        assassino_esperado="G1 · J23 e J24 alcança estado terminal",
    ),
    Mutacao(
        nome="4 · a landing volta a declarar que tem `<main>`",
        arquivo=MATRIZ,
        de='{ id: "J21", nome: "landing pública", rota: "/", regiao: "body", axeConhecido: 43,',
        para='{ id: "J21", nome: "landing pública", rota: "/", axeConhecido: 43,',
        porque=(
            "A ausência de landmark tem de ser um FATO medido, não uma opinião no comentário. Se "
            "declarar `main` numa tela que não tem `main` passar, a coluna `regiao` não mede nada."
        ),
        assassino_esperado="G1 · J21 alcança estado terminal (e G1-bis pela lista nominal)",
    ),
]

ALVO = "e2e/m45-matriz.spec.ts"


def rodar() -> tuple[int, str]:
    proc = subprocess.run(
        ["npx.cmd" if sys.platform == "win32" else "npx", "playwright", "test", ALVO,
         "--workers=4", "--reporter=line"],
        cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def main() -> int:
    print("=" * 88)
    print("M45.7 · campanha de mutação — a catraca das superfícies públicas")
    print("=" * 88)

    # O PISO DO INSTRUMENTO. Sem a base verde, toda mutação "morre" e a campanha vira teatro.
    print("\n[base] a matriz precisa estar verde ANTES de qualquer mutação...")
    codigo, saida = rodar()
    if codigo != 0:
        print("ABORTADO — a base já está vermelha. Nenhuma morte abaixo provaria nada.")
        print(saida[-3000:])
        return 1
    print("[base] verde. A campanha pode começar.\n")

    sobreviventes: list[str] = []

    for m in MUTACOES:
        print("-" * 88)
        print(f"MUTAÇÃO {m.nome}")
        print(f"  por quê: {m.porque}")
        print(f"  assassino esperado: {m.assassino_esperado}")

        original = m.arquivo.read_text(encoding="utf-8")

        # A mutação PRECISA casar. Uma âncora que não bate produz um arquivo intacto, a suíte passa,
        # e o relatório anuncia "sobreviveu" sobre código que nunca foi tocado. O programa já pagou
        # por isso com âncora `\n` em árvore CRLF.
        de = m.de.replace("\n", "\r\n") if "\r\n" in original else m.de
        para = m.para.replace("\n", "\r\n") if "\r\n" in original else m.para
        if original.count(de) != 1:
            print(f"  !! ÂNCORA NÃO CASOU ({original.count(de)} ocorrências) — mutação INVÁLIDA")
            sobreviventes.append(f"{m.nome} [âncora inválida]")
            continue

        m.arquivo.write_text(original.replace(de, para), encoding="utf-8")
        try:
            codigo, saida = rodar()
        finally:
            m.arquivo.write_text(original, encoding="utf-8")

        if codigo == 0:
            print("  >> SOBREVIVEU — a peça atacada não é medida por ninguém.")
            sobreviventes.append(m.nome)
        else:
            # QUEM matou, e não só QUE morreu.
            #
            # A primeira versão deste extrator pegava a primeira linha com "›" — e o `--reporter=line`
            # imprime a lista de PROGRESSO com o mesmo caractere. Ele anunciava como assassino o
            # teste [1/68], que tinha apenas começado. Três das quatro mutações receberam crédito
            # errado antes desta correção.
            #
            # O bloco de falhas vem DEPOIS da linha "N failed"; só ele é acusação.
            linhas = saida.splitlines()
            inicio = next((i for i, l in enumerate(linhas) if "failed" in l and "passed" not in l), None)
            acusadores = []
            if inicio is not None:
                for l in linhas[inicio:]:
                    if "›" in l and "M45" in l:
                        acusadores.append(l.split("›")[-1].strip()[:90])
            print(f"  >> MORTA por {len(acusadores)} teste(s):")
            for a in dict.fromkeys(acusadores):
                print(f"       · {a}")
            if not acusadores:
                print("       !! nenhum acusador extraído — o instrumento não sabe quem matou")

    print("\n" + "=" * 88)
    if sobreviventes:
        print(f"SOBREVIVENTES ({len(sobreviventes)}/{len(MUTACOES)}):")
        for s in sobreviventes:
            print(f"  · {s}")
        return 1
    print(f"TODAS MORTAS — {len(MUTACOES)}/{len(MUTACOES)}. A catraca reprova em todas as peças.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
