"""M45.2 - mutacao da JORNADA da analise.

Nao repete a transversal da M45.0 nem a das duas visoes (M45.4). Aqui entra um alvo por correcao
desta tranche -- correcao sem mutacao que a mate e correcao que ninguem protege.

Sete mutacoes:

 1  a leitura do progresso FALHA e volta a virar "nao medido"
 2  a leitura do progresso NAO VOLTOU e volta a virar "nao medido"
 3  a parada de mapping para de dizer que a operacao que a resolve nao existe
 4  o rotulo de carregando volta a ser o nome de um estado
 5  a contagem nao publicada volta a ser dita como indisponibilidade
 6  a barra de topo volta a dizer "Nova analise" numa analise que ja existe
 7  a matriz para de aplicar a montagem por journey -- os estados vivos somem

Disciplina de instrumento herdada: gate validado no fonte ANTES de rodar; ancora ausente ou
ambigua e falha do INSTRUMENTO, nunca morte; GATE_VAZIO separado de morte, porque `-t`/`-g` que
seleciona zero teste sai com codigo de sucesso e parece verde; CRLF normalizado; restauracao por
snapshot e verificacao de arvore limpa ao fim.

Uso:  python docs/m45/mutacoes_m45_2.py [n ...]
"""

from __future__ import annotations

import dataclasses
import os
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]

# specs
MATRIZ = "e2e/m45-matriz.spec.ts"
BARRA_T = "src/test/v1/an01-m33-barra.test.tsx"
JORNADA_T = "src/features/canonical-analysis/data/jornadaCanonica.test.ts"
MAPPING_T = "src/features/canonical-analysis/ui/needsMapping.test.tsx"

# alvos
PAINEL = "src/features/canonical-analysis/ui/PainelDeEixos.tsx"
PAGINA = "src/features/canonical-analysis/ui/AnalysisPage.tsx"
EN = "src/i18n/en.json"
PT = "src/i18n/pt.json"


@dataclasses.dataclass(frozen=True)
class Mut:
    n: int
    titulo: str
    arquivo: str
    ancora: str
    troca: str
    gate: str
    spec: str
    porque: str


M = Mut
MUTACOES: list[Mut] = [
    M(1, "a leitura que FALHOU volta a virar 'nao medido'", PAINEL,
      "{leitura != null ? (",
      "{false ? (",
      "indisponível ≠ não medido no painel de progresso", MATRIZ,
      "503 e 404 imprimiam a mesma frase que o produtor usa quando de fato nao mediu -- a pessoa "
      "lia uma afirmacao sobre os DADOS dela durante uma queda do sistema"),

    M(2, "a leitura que NAO VOLTOU volta a virar 'nao medido'", PAINEL,
      ") : carregando ? (",
      ") : false ? (",
      "carregando ≠ não medido no painel de progresso", MATRIZ,
      "com um produtor lento a afirmacao falsa fica na tela o tempo todo da espera"),

    M(3, "a parada de mapping para de dizer o que a bloqueia", PAGINA,
      '{t("canonicalAnalysis.needsMapping.blocked")}',
      '{""}',
      "mostra o que falta e oferece reconsultar", MAPPING_T,
      "so a Home dizia; quem clica no chip aterrissa AQUI e fica insistindo num botao que nunca "
      "resolveria"),

    M(4, "o carregando volta a ser o nome de um estado", EN,
      '"loading": "Loading the analysis…"',
      '"loading": "Preparing"',
      "o rótulo de CARREGANDO não é o nome de nenhum estado", JORNADA_T,
      "carregando e estado sao duas telas distintas; a mesma palavra pelos dois motivos apaga a "
      "diferenca"),

    M(5, "a contagem nao publicada volta a ser indisponibilidade", PT,
      '"recordsUnknown": "Contagem não publicada"',
      '"recordsUnknown": "Registros indisponíveis"',
      "contagem não publicada NÃO é dita como indisponibilidade", JORNADA_T,
      "record_count null e o produtor nao ter publicado -- nao e o sistema fora do ar"),

    M(6, "a barra volta a dizer 'Nova analise' na analise que existe", PAGINA,
      ': t("canonicalAnalysis.topBar")',
      ': t("canonicalAnalysis.entry.title")',
      "ela nunca é uma análise nova", BARRA_T,
      "capturas 05 e 07: uma analise que FALHOU e uma rodando, anunciando a rota de criacao"),

    M(7, "a matriz para de aplicar a montagem por journey", MATRIZ,
      "      await montarProduto(page);\n      await j.montar?.(page);\n      await page.goto(j.rota);\n\n      // Terminal",
      "      await montarProduto(page);\n      await page.goto(j.rota);\n\n      // Terminal",
      "alcança estado terminal", MATRIZ,
      "sem a sobreposicao as sete journeys novas pousam no `completed` da montagem base, e os "
      "estados VIVOS deixam de ser medidos sem ninguem notar"),
]


def _ler(p: pathlib.Path) -> str:
    with open(p, encoding="utf-8", newline="") as f:
        return f.read()


def _escrever(p: pathlib.Path, t: str) -> None:
    with open(p, "w", encoding="utf-8", newline="") as f:
        f.write(t)


def _gate_existe(m: Mut) -> bool:
    return m.gate in _ler(RAIZ / m.spec)


def _aplicar(m: Mut) -> tuple[bool, str, str]:
    p = RAIZ / m.arquivo
    original = _ler(p)
    crlf = "\r\n" in original
    anc = m.ancora.replace("\n", "\r\n") if crlf else m.ancora
    tro = m.troca.replace("\n", "\r\n") if crlf else m.troca
    n = original.count(anc)
    if n != 1:
        return False, original, f"ANCORA_AUSENTE_OU_AMBIGUA ({n}x, crlf={crlf})"
    _escrever(p, original.replace(anc, tro, 1))
    return True, original, ""


def _rodar(m: Mut) -> tuple[int, str]:
    env = dict(os.environ)
    env["SENTINELA_CONTRACT_ORIGIN"] = "../sentinela-facts/docs/contracts"
    argv = (
        ["npx", "vitest", "run", m.spec, "-t", m.gate]
        if m.spec.endswith((".test.ts", ".test.tsx"))
        else ["npx", "playwright", "test", m.spec, "--reporter=line", "-g", m.gate]
    )
    proc = subprocess.run(
        argv, cwd=RAIZ, env=env, capture_output=True, text=True, errors="replace",
        timeout=1800, shell=os.name == "nt",
    )
    return proc.returncode, proc.stdout + proc.stderr


def _selecionou_zero(saida: str) -> bool:
    baixa = saida.lower()
    return "no tests found" in baixa or ("passed" not in baixa and "failed" not in baixa)


def _classificar(saida: str) -> str:
    if _selecionou_zero(saida):
        return "GATE_VAZIO (nenhum teste selecionado)"
    for acidente in ("Transform failed", "Failed to load", "esbuild", "SyntaxError"):
        if acidente in saida:
            return f"MORTE_SUSPEITA ({acidente})"
    return "MORTA"


def main(argv: list[str]) -> int:
    escolhidas = {int(a) for a in argv} if argv else None
    resultados: list[tuple[Mut, str]] = []
    antes = {a: _ler(RAIZ / a) for a in sorted({m.arquivo for m in MUTACOES})}

    for m in MUTACOES:
        if escolhidas is not None and m.n not in escolhidas:
            continue
        if not _gate_existe(m):
            resultados.append((m, f"INSTRUMENTO: GATE_INEXISTENTE ({m.gate})"))
            print(f"[{m.n}] INSTRUMENTO  {m.titulo} -- gate `{m.gate}` nao existe", flush=True)
            continue
        p = RAIZ / m.arquivo
        aplicou, original, motivo = _aplicar(m)
        if not aplicou:
            resultados.append((m, f"INSTRUMENTO: {motivo}"))
            print(f"[{m.n}] INSTRUMENTO  {m.titulo} -- {motivo}", flush=True)
            continue
        try:
            rc, saida = _rodar(m)
            veredito = _classificar(saida) if rc != 0 else "SOBREVIVEU"
        finally:
            _escrever(p, original)
        resultados.append((m, veredito))
        print(f"[{m.n}] {veredito:<34} {m.titulo}  (gate {m.gate})", flush=True)

    mortas = sum(1 for _, v in resultados if v == "MORTA")
    print(f"\n{mortas}/{len(resultados)} mortas pelo gate nomeado")
    for m, v in resultados:
        if v != "MORTA":
            print(f"  !! {m.n} {v} -- {m.titulo}")

    nao_restaurado = [a for a in sorted(antes) if _ler(RAIZ / a) != antes[a]]
    if nao_restaurado:
        print("\nARQUIVO MUTADO NAO RESTAURADO:")
        print("\n".join(f"  {a}" for a in nao_restaurado))
        return 2
    return 0 if mortas == len(resultados) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
