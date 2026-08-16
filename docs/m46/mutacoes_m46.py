# -*- coding: utf-8 -*-
"""M46 — a campanha de mutação das correções.

A M45.8 fechou com 159 nós de a11y CONTADOS e travados. A M46 baixou para 6. Baixar um número que
um gate afirma é fácil de anunciar e difícil de provar: se o gate não medisse de verdade, o número
teria descido igual.

Cada mutação abaixo desfaz UMA correção e exige que alguém reprove. Se sobreviver, aquela correção
não está sendo medida — e um número não medido é exatamente o que esta umbrella existe para acabar.

Uso:  python docs/m46/mutacoes_m46.py
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
NPX = "npx.cmd" if sys.platform == "win32" else "npx"


@dataclass(frozen=True)
class Mutacao:
    nome: str
    arquivo: Path
    de: str
    para: str
    porque: str
    suite: str  # "matriz" (playwright, ~45s) · "vitest:<caminho>" (~3s)


MUTACOES: list[Mutacao] = [
    Mutacao(
        nome="1 · o cinza do AION volta a reprovar",
        arquivo=RAIZ / "src/features/aion/tokens.ts",
        de='  muted:      "#8695AD",',
        para='  muted:      "#64748B",',
        porque=(
            "Este token sozinho era 76 nós — metade da dívida do produto. Se voltar sem ninguém "
            "reprovar, o '76 → 0' da M46 é um número que eu escrevi, não que eu medi."
        ),
        suite="matriz",
    ),
    Mutacao(
        nome="2 · o AION volta a rolar na horizontal no celular",
        arquivo=RAIZ / "src/features/aion/AionPage.tsx",
        de='            <div className="min-w-0">',
        para="            <div>",
        porque=(
            "226px de rolagem horizontal num celular. O defeito existia desde sempre e passou "
            "despercebido porque o gate varre `main *` e a página não tinha `<main>`. Agora tem — "
            "e o gate precisa provar que enxerga."
        ),
        suite="matriz",
    ),
    Mutacao(
        nome="3 · a casca de entrada perde o `<main>`",
        arquivo=RAIZ / "src/shell/AuthShell.tsx",
        de="      <main\n        className={cn(",
        para="      <div\n        className={cn(",
        porque=(
            "Login, criação de conta e recuperação compartilham esta casca. Sem `<main>`, quem usa "
            "leitor de tela não tem 'pular para o conteúdo' em NENHUMA porta do produto — e o gate "
            "de responsive, que varre `main *`, volta a medir zero elemento nas três."
        ),
        suite="matriz",
    ),
    Mutacao(
        nome="4 · o marcador de estouro intencional se espalha",
        arquivo=RAIZ / "src/features/aion/AionPage.tsx",
        de='            <div className="min-w-0">',
        para='            <div data-overflow-ok="conserta-depois" className="min-w-0">',
        porque=(
            "`data-overflow-ok` desliga o gate de responsive numa subárvore inteira. É o caminho "
            "fácil mais provável para calar uma reprovação — e por isso ele tem catraca NOMINAL, "
            "lida do código-fonte."
        ),
        suite="matriz",
    ),
    Mutacao(
        nome="5 · a superfície congelada volta a ter vocabulário próprio",
        arquivo=RAIZ / "src/i18n/en.json",
        de='"seriesTitle": "Time series"',
        para='"seriesTitle": "Over time"',
        porque=(
            "A mesma medida com dois nomes em duas telas do mesmo produto. Sem gate, a correção "
            "dura até a próxima pessoa editar um dos lados — que é como a divergência nasceu."
        ),
        suite="vitest:src/test/v1/vocabulario-unico.test.ts",
    ),
    Mutacao(
        nome="6 · um `any` volta ao código",
        arquivo=RAIZ / "src/test/v1/scenarios-catalogo.test.ts",
        de="// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver o bloco acima\ntype CorpoServido = any;",
        para="type CorpoServido = any;",
        porque=(
            "Os nove erros de lint atravessaram a M45 inteira aparecendo como errata em três "
            "DOC-CLOSEs. Dívida que só dói na prosa do relatório é dívida que fica."
        ),
        suite="vitest:src/test/v1/lint-catraca.test.ts",
    ),
]


def rodar(suite: str) -> tuple[int, str]:
    if suite == "matriz":
        cmd = [NPX, "playwright", "test", "e2e/m45-matriz.spec.ts", "--workers=4", "--reporter=line"]
    else:
        cmd = [NPX, "vitest", "run", suite.split(":", 1)[1], "--reporter=dot"]
    p = subprocess.run(cmd, cwd=RAIZ, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def acusadores(saida: str, suite: str) -> list[str]:
    """QUEM matou. O `--reporter=line` imprime a lista de PROGRESSO com o mesmo `›` das falhas, e
    a campanha da M45.7 chegou a creditar o teste [1/68] — que tinha apenas começado."""
    linhas = saida.splitlines()
    if suite.startswith("vitest"):
        return [l.split(">")[-1].strip()[:78] for l in linhas if l.strip().startswith("FAIL")]
    ini = next((i for i, l in enumerate(linhas) if "failed" in l and "passed" not in l), None)
    if ini is None:
        return []
    return list(dict.fromkeys(
        l.split("›")[-1].strip()[:78] for l in linhas[ini:] if "›" in l and "M45" in l
    ))


def main() -> int:
    print("=" * 88)
    print("M46 · campanha de mutação — 159 nós viraram 6, e cada queda tem de ser medida")
    print("=" * 88)

    for suite in ("matriz", "vitest:src/test/v1/vocabulario-unico.test.ts",
                  "vitest:src/test/v1/lint-catraca.test.ts"):
        print(f"\n[base] {suite} ...")
        codigo, saida = rodar(suite)
        if codigo != 0:
            print(f"ABORTADO — {suite} já está vermelho. Nenhuma morte provaria nada.")
            print(saida[-2000:])
            return 1
    print("[base] tudo verde. A campanha pode começar.")

    sobreviventes: list[str] = []

    for m in MUTACOES:
        print("\n" + "-" * 88)
        print(f"MUTAÇÃO {m.nome}   [{m.suite.split(':')[0]}]")
        print(f"  por quê: {m.porque}")

        original = m.arquivo.read_text(encoding="utf-8")
        de = m.de.replace("\n", "\r\n") if "\r\n" in original else m.de
        para = m.para.replace("\n", "\r\n") if "\r\n" in original else m.para

        # Âncora que não casa deixa o arquivo INTACTO, a suíte verde, e o relatório anunciando
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
            print("  >> SOBREVIVEU — a correção atacada não é medida por ninguém.")
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
