"""M45.4 - mutacao das DUAS VISOES e da comparacao.

Nao repete a campanha transversal da M45.0 (docs/m45/mutacoes_m45.py): aquela congelou os
invariantes que atravessam superficies. Aqui entram os defeitos que esta tranche ACHOU, um alvo
por correcao. Uma correcao sem mutacao que a mate e uma correcao que ninguem protege -- e foi
exatamente esse o padrao que a M45.4 passou a missao inteira encontrando.

Nove mutacoes:

 1  a recusa do ARGOS volta a interromper (alert em vez de status)
 2  a recusa para de dizer o que resta acessivel
 3  o 404 result_not_available volta a cair no erro generico da comparacao
 4  a comparacao volta a abrir por indicadores, invertida em relacao a visao
 5  comparar volta a ser oferecido com uma unica analise
 6  o reason_code cru volta a substituir a palavra
 7  os dois lados da comparacao voltam a ser texto morto
 8  a montagem do evo02 perde a massa v3 -- a spec verde sobre tela que nao compara
 9  um scenario nomeado da M45.4 deixa de ser reproduzivel

Disciplina de instrumento herdada da M45.0: gate validado no fonte ANTES de rodar; ancora ausente
ou ambigua e falha do INSTRUMENTO, nunca morte; restauracao por snapshot de conteudo; CRLF
normalizado na ancora; e GATE_VAZIO separado de morte, porque `-t`/`-g` que seleciona zero teste
sai com codigo de sucesso e parece verde.

Uso:  python docs/m45/mutacoes_m45_4.py [n ...]
"""

from __future__ import annotations

import dataclasses
import os
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]

# specs
ARGOS_T = "src/features/canonical-analysis/ui/argos/ArgosView.test.tsx"
ANALYTICS_T = "src/features/canonical-analysis/ui/analytics/AnalyticsView.test.tsx"
LISTA_T = "src/features/canonical-analysis/ui/AnalysesListPage.test.tsx"
CATALOGO_T = "src/test/v1/scenarios-catalogo.test.ts"
SHOTS39 = "e2e/m39-shots.spec.ts"
EVO02 = "e2e/evo02-m39-comparacao.spec.ts"

# alvos
ARGOS = "src/features/canonical-analysis/ui/argos/ArgosView.tsx"
ANALYTICS = "src/features/canonical-analysis/ui/analytics/AnalyticsView.tsx"
COMPARE = "src/features/canonical-analysis/ui/CompareAnalysesPage.tsx"
COMPARACAO = "src/features/canonical-analysis/ui/ComparacaoArgos.tsx"
LISTA = "src/features/canonical-analysis/ui/AnalysesListPage.tsx"
TWOVIEW = "src/mocks/scenarios/two-view.ts"


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
    M(1, "a recusa do ARGOS volta a interromper", ARGOS,
      '<div role="status" className="space-y-2 rounded-md border border-border p-4">\n'
      '          <p className="text-sm font-medium">{t("canonicalAnalysis.argos.unavailableTitle")}</p>',
      '<div role="alert" className="space-y-2 rounded-md border border-border p-4">\n'
      '          <p className="text-sm font-medium">{t("canonicalAnalysis.argos.unavailableTitle")}</p>',
      "indisponibilidade é anunciada como estado", ARGOS_T,
      "dois estados irmaos com o mesmo recado e polidez diferente; alertar por ausencia ensina a "
      "ignorar alertas, e os testes daqui afirmavam TEXTO, que nao carrega polidez"),

    M(2, "a recusa para de dizer o que resta acessivel", ARGOS,
      '            {t("canonicalAnalysis.argos.stillAvailable")}',
      '            {""}',
      "a recusa aponta o que continua acessível", ARGOS_T,
      "sem essa linha a pessoa sai achando que a analise inteira se perdeu"),

    M(3, "o 404 volta a cair no erro generico da comparacao", COMPARE,
      "if ((a.isError && !semA) || (b.isError && !semB)) {",
      "if (a.isError || b.isError) {",
      "m39-sem-v3", SHOTS39,
      "diagnostica errado E oferece 'tente de novo' para condicao permanente; foi o defeito que a "
      "spec de captura sem assercao escondeu por meses"),

    # A primeira versao desta mutacao trocava o `id` da secao, e sobreviveu -- com razao: `id`
    # alimenta o `aria-labelledby`, nao a ORDEM. Mutacao ruim minha, nao defeito sobrevivente.
    # Agora ela troca os dois blocos de lugar, que e o defeito real.
    M(4, "a comparacao volta a abrir por indicadores", COMPARACAO,
      """      <Familia
        id="cmp-dimensoes"
        titulo={t("canonicalAnalysis.argos.dimensions")}
        pares={comparacao.dimensoes}
        // As quatro são conjunto fechado do contrato — rótulo próprio é legítimo.
        rotuloDe={(p) => t(`canonicalAnalysis.argos.dimension.${p.id}`)}
      />
      <Familia
        id="cmp-indicadores"
        titulo={t("canonicalAnalysis.argos.indicators")}
        pares={comparacao.indicadores}
        rotuloDe={rotuloDoIndicador}
      />""",
      """      <Familia
        id="cmp-indicadores"
        titulo={t("canonicalAnalysis.argos.indicators")}
        pares={comparacao.indicadores}
        rotuloDe={rotuloDoIndicador}
      />
      <Familia
        id="cmp-dimensoes"
        titulo={t("canonicalAnalysis.argos.dimensions")}
        pares={comparacao.dimensoes}
        rotuloDe={(p) => t(`canonicalAnalysis.argos.dimension.${p.id}`)}
      />""",
      "a ordem de leitura é a mesma da visão ARGOS", EVO02,
      "as MESMAS duas secoes em ordem oposta entre a visao e a comparacao"),

    M(5, "comparar volta a ser oferecido com uma unica analise", LISTA,
      "const podeComparar = items.length >= 2 || podeAvancar || podeVoltar;",
      "const podeComparar = true;",
      "comparar não é oferecido quando é impossível", LISTA_T,
      "convite para um modo que nunca termina: 1 de 2 selecionadas, botao morto"),

    M(6, "o codigo cru volta a substituir a palavra", ANALYTICS,
      '                      {t("canonicalAnalysis.analyticsView.notPublished")}',
      '                      {""}',
      "estatística não publicada mostra o motivo", ANALYTICS_T,
      "o codigo aparecia justamente quando havia o que explicar, e a palavra ficava para o caso mudo"),

    M(7, "os dois lados da comparacao voltam a ser texto morto", COMPARE,
      'to={`/analyses/${encodeURIComponent(analysisAId ?? "")}`}',
      'to="/analyses"',
      "a ordem A/B é a da URL", EVO02,
      "a tela promete que o resultado historico segue disponivel em cada analise e nao dava rota"),

    M(8, "a montagem do evo02 perde a massa v3", EVO02,
      "JSON.stringify({ [ids[0]]: docsV3[0], [ids[1]]: docsV3[1] }),",
      "JSON.stringify({}),",
      "comparação compatível", EVO02,
      "a spec ficava VERDE sobre uma tela que nao comparava: semeava v1 no seam v1 e a comparacao "
      "le v3; as negativas rodavam sobre um aviso de indisponibilidade"),

    M(9, "um scenario nomeado da M45.4 deixa de ser reproduzivel", TWOVIEW,
      '    id: "argos-document-absent",',
      '    id: "argos-document-absent-renomeado",',
      "nenhum nome órfão", CATALOGO_T,
      "o invariante que substituiu a contagem: nome no Blueprint tem de ser invocavel"),
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
