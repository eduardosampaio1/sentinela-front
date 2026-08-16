# -*- coding: utf-8 -*-
"""M47 — a campanha de mutação da DECOMPOSIÇÃO.

Decompor não muda comportamento, e por isso é a refatoração mais fácil de fazer errado sem que
nada reclame: as 386 provas E2E e as 1678 unitárias passariam igual se uma seção tivesse ficado
para trás na composição. Nenhuma delas afirmava o conteúdo dessas duas páginas.

A decomposição CRIOU esse risco — enquanto eram um arquivo, ninguém apaga uma seção sem ver; agora
é um acidente de uma linha. As mutações abaixo verificam a contrapartida.

Uso:  python docs/m47/mutacoes_m47.py
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
NPX = "npx.cmd" if sys.platform == "win32" else "npx"

LANDING = RAIZ / "src/features/landing/LandingPage.tsx"
AION = RAIZ / "src/features/aion/AionPage.tsx"


@dataclass(frozen=True)
class Mutacao:
    nome: str
    arquivo: Path
    de: str
    para: str
    porque: str
    spec: str


MUTACOES: list[Mutacao] = [
    Mutacao(
        nome="1 · uma seção some da composição",
        arquivo=LANDING,
        de="        <PricingSection />\n",
        para="",
        porque=(
            "O risco central desta missão. A página continuaria alcançando estado terminal, com "
            "axe limpo e sem estourar largura — verde em tudo que a M45 mede, e sem o preço."
        ),
        spec="e2e/m47-composicao.spec.ts",
    ),
    Mutacao(
        nome="2 · uma seção SEM TÍTULO some",
        arquivo=AION,
        de="        <MetricsSection />\n",
        para="",
        porque=(
            "`MetricsSection` não usa `h2`. Um gate que só olhasse títulos não a veria sumir — e "
            "seria um gate que mede a própria lista, não a página."
        ),
        spec="e2e/m47-composicao.spec.ts",
    ),
    Mutacao(
        nome="3 · duas seções trocam de lugar",
        arquivo=LANDING,
        de="        <ProblemSection />\n        <PlatformSection />",
        para="        <PlatformSection />\n        <ProblemSection />",
        porque=(
            "A ordem é ARGUMENTO, não estilo: problema antes de solução. Uma composição reordenada "
            "por engano tem todas as seções presentes e diz outra coisa."
        ),
        spec="e2e/m47-composicao.spec.ts",
    ),
    Mutacao(
        nome="4 · a a11y continua medida depois da decomposição",
        arquivo=RAIZ / "src/features/aion/tokens.ts",
        de='  muted:      "#8695AD",',
        para='  muted:      "#64748B",',
        porque=(
            "Os 76 nós que a M46 zerou vinham deste token. Se a decomposição tivesse tirado a "
            "página do alcance do gate, esta mutação passaria — e o '76 → 0' teria virado ficção "
            "por mudança de arquivo, não por correção desfeita."
        ),
        spec="e2e/m45-matriz.spec.ts",
    ),
]


def rodar(spec: str) -> tuple[int, str]:
    p = subprocess.run(
        [NPX, "playwright", "test", spec, "--workers=4", "--reporter=line"],
        cwd=RAIZ, capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def acusadores(saida: str) -> list[str]:
    """QUEM matou. O `--reporter=line` imprime a lista de PROGRESSO com o mesmo `›` das falhas."""
    linhas = saida.splitlines()
    ini = next((i for i, l in enumerate(linhas) if "failed" in l and "passed" not in l), None)
    if ini is None:
        return []
    return list(dict.fromkeys(l.split("›")[-1].strip()[:80] for l in linhas[ini:] if "›" in l))


def main() -> int:
    print("=" * 88)
    print("M47 · campanha de mutação — a decomposição não pode desmontar em silêncio")
    print("=" * 88)

    for spec in ("e2e/m47-composicao.spec.ts", "e2e/m45-matriz.spec.ts"):
        print(f"\n[base] {spec} ...")
        codigo, saida = rodar(spec)
        if codigo != 0:
            print(f"ABORTADO — {spec} já está vermelho.")
            print(saida[-2000:])
            return 1
    print("[base] verde. A campanha pode começar.")

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
            codigo, saida = rodar(m.spec)
        finally:
            m.arquivo.write_text(original, encoding="utf-8")

        if codigo == 0:
            print("  >> SOBREVIVEU — ninguém mede isto.")
            sobreviventes.append(m.nome)
        else:
            quem = acusadores(saida)
            print(f"  >> MORTA por {len(quem)} teste(s):")
            for a in quem:
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
