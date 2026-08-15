"""M45 - mutacao TRANSVERSAL, selecionada por risco.

Nao repete as campanhas de M41-M44: cada uma ja congelou os invariantes da sua superficie, e
reexecuta-las seria volume, nao medida. Aqui so entram os invariantes que atravessam superficies e
que NENHUMA missao anterior podia proteger, porque nenhuma delas via o produto inteiro.

Sete mutacoes, cada uma com motivo:

 1-2  ausencia x indisponibilidade, medidas TRANSVERSALMENTE (o colapso recorrente do programa)
 3    vocabulario interno vazando em qualquer superficie
 4    navegabilidade: superficie que deixa de alcancar estado terminal
 5    idioma provado por conteudo (a divida da M40)
 6    reprodutibilidade de scenario por nome (o invariante que substituiu a contagem)
 7    rolagem horizontal (o unico gate de responsive que vale em tres larguras)

Disciplina de instrumento herdada: gate validado no fonte ANTES de rodar; ancora ausente e falha
do instrumento, nao morte; restauracao por snapshot de conteudo.

Uso:  python docs/m45/mutacoes_m45.py [n ...]
"""

from __future__ import annotations

import dataclasses
import os
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]

MATRIZ = "e2e/m45-matriz.spec.ts"
CATALOGO_T = "src/test/v1/scenarios-catalogo.test.ts"

LISTA = "src/features/canonical-analysis/ui/AnalysesListPage.tsx"
INST = "src/features/instances/InstancePage.tsx"
SIDEBAR = "src/shell/Sidebar.tsx"
# `subscription-absent` mudou de arquivo na M44 (extracao por anti-monolito).
CATALOGO = "src/mocks/scenarios/assinaturas.ts"
SHELL = "src/shell/PageFrame.tsx"
SETTINGS = "src/features/settings/SettingsPage.tsx"


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
    M(1, "a lista de analises apresenta ausencia como falha", LISTA,
      't("canonicalAnalysis.list.empty")',
      't("canonicalAnalysis.list.errorGeneric")',
      "vazio ≠ erro", MATRIZ,
      "ausencia virando erro manda a pessoa esperar por algo que nao vem"),

    M(2, "a Instancia apresenta indisponibilidade como inexistencia", INST,
      'transitorio ? t("instances.unavailable") : t("instances.notFound")',
      't("instances.notFound")',
      "indisponível ≠ inexistente", MATRIZ,
      "o colapso que a M42 corrigiu; se voltar, a pessoa para de procurar o que existe"),

    M(3, "vocabulario interno vaza numa superficie", INST,
      "<h1 className=\"text-2xl font-semibold text-foreground\">{inst.name}</h1>",
      "<h1 className=\"text-2xl font-semibold text-foreground\">{inst.name} job_id</h1>",
      "alcança estado terminal", MATRIZ,
      "`nunca_publicos` na tela e fronteira dissolvida, e nenhuma suite por missao varre todas"),

    M(4, "uma superficie deixa de alcancar estado terminal", INST,
      "  if (instancia.isPending) {",
      "  if (true) {",
      "alcança estado terminal", MATRIZ,
      "esqueleto permanente nao e superficie navegavel -- foi o defeito achado na M42"),

    # A versao anterior mutava a barra LATERAL, e o gate G6 ancora no `main` -- mutacao fora da
    # regiao medida, inerte por construcao. Agora ela ataca o titulo da secao, que vive no `main`.
    M(5, "o idioma deixa de seguir a preferencia da conta", SETTINGS,
      't("account.signInTitle")',
      '"Password and sign-in"',
      "idioma provado pelo conteúdo", MATRIZ,
      "a divida da M40: idioma que parece certo por acidente de setup"),

    M(6, "um scenario declarado deixa de ser reproduzivel", CATALOGO,
      '    id: "subscription-absent",',
      '    id: "subscription-absent-renomeado",',
      "nenhum nome órfão", CATALOGO_T,
      "o invariante que substituiu a contagem de 27"),

    M(7, "uma superficie passa a estourar a largura", SHELL,
      "px-6 py-8",
      "px-6 py-8 min-w-[2000px]",
      "nenhuma superfície estoura a largura", MATRIZ,
      "responsive quebra primeiro no shell, e uma suite por missao so ve a propria rota"),
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
        if m.spec.endswith(".test.ts")
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
