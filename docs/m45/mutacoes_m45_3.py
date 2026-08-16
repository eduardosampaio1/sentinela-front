"""M45.3 - mutacao de RES-01 e do que a tranche corrigiu.

RES-01 esta CONGELADA (Blueprint 4.6): serve deep link antigo, nao recebe feature nova. Esta
tranche nao achou defeito de produto NELA -- e isso e medicao, nao ausencia de medicao. O unico
defeito achado estava no primitive que ela usa, e as demais mutacoes protegem a MEDICAO: sem
elas, a superficie volta a nao ser medida e ninguem nota.

Quatro mutacoes:

 1  o gatilho do Disclosure perde a marca visual -- volta a parecer titulo
 2  a marca rouba o nome acessivel do botao -- a correcao virando outro defeito
 3  o predicado de caminho volta a ser glob de prefixo -- a listagem engole /result e /timeline
 4  o laco de responsive para de reinstalar a montagem base -- J15 mede outra tela

Disciplina de instrumento herdada: gate validado no fonte ANTES de rodar; ancora ausente ou
ambigua e falha do INSTRUMENTO, nunca morte; GATE_VAZIO separado de morte; CRLF normalizado;
restauracao por snapshot e verificacao de arvore limpa ao fim.

Uso:  python docs/m45/mutacoes_m45_3.py [n ...]
"""

from __future__ import annotations

import dataclasses
import os
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]

MATRIZ = "e2e/m45-matriz.spec.ts"
PRIMITIVES_T = "src/design/primitives/primitives.test.tsx"
DISCLOSURE = "src/design/primitives/Disclosure.tsx"


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
    M(1, "o gatilho perde a marca visual", DISCLOSURE,
      "<ChevronDown",
      "<span hidden",
      "o gatilho tem marca visual", PRIMITIVES_T,
      "no mobile de RES-01 o gatilho e a palavra 'Procedencia' sozinha entre o numero e a "
      "descricao: le-se como titulo, e a procedencia -- o argumento de confianca da tela -- fica "
      "invisivel para quem nao adivinhar tocar"),

    M(2, "a marca rouba o nome acessivel do botao", DISCLOSURE,
      'aria-hidden="true"',
      'aria-label="abrir"',
      "continua se chamando pelo texto", PRIMITIVES_T,
      "a correcao virando outro defeito: um icone que vira o nome do botao e o que o docstring do "
      "gatilho ja proibia"),

    # A PRIMEIRA versao desta mutacao trocava o predicado de caminho de volta pelo glob de prefixo,
    # e SOBREVIVEU -- corretamente. Com `/result` e `/timeline` mockados explicitamente, o glob e
    # inofensivo: as rotas especificas sao registradas depois e vencem. O predicado protege contra
    # um subrecurso FUTURO entrar sem mock, que e higiene, nao comportamento com gate. Mutacao sem
    # gate capaz de reprovar e mutacao morta, e trocar por uma real vale mais que manter a fachada.
    M(3, "a montagem base deixa de servir o documento de RES-01", MATRIZ,
      "        result_schema_version: String(V2_READY.result_schema_version),",
      "        result_schema_version: \"analysis-result-v9-inexistente\",",
      "J15", MATRIZ,
      "sem documento legivel a superficie congelada volta a nao ser medida, e a perda de cobertura "
      "e silenciosa -- foi assim que E5 ficou sete missoes como NO CREDIT"),

    M(4, "o laco de responsive para de reinstalar a montagem base", MATRIZ,
      "        await montarProduto(page);\n        await j.montar?.(page);",
      "        await j.montar?.(page);",
      "estoura a largura", MATRIZ,
      "page.route acumula e a ultima vence: sem reinstalar, o emEstado de J12 (falha terminal) "
      "seguia valendo em J13-J16 e J15 media RES-01 de uma analise que falhou"),
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
