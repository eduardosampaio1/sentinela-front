"""M42 · implementação — as 24 mutações do §43, cada uma pelo gate NOMEADO.

    python docs/m42/mutacoes_implementacao.py            # todas
    python docs/m42/mutacoes_implementacao.py 3 12 21    # só estas

Mesma disciplina do harness da BD14 e do de scenarios: âncora que não casa vira
`ANCORA_AUSENTE` e nunca "morta"; morte por erro de compilação vira `MORTE_SUSPEITA`; sempre
restaura; confere `git status` na saída.

O alvo agora é o CÓDIGO DE PRODUÇÃO — cliente, hooks e seções. A pergunta de cada mutação é
"se o Front passasse a mentir assim, alguém ficaria vermelho?".

Os gates de browser não entram aqui: cada `npx playwright test` custa ~10 s de subida de
servidor, e 24 delas seriam vinte minutos de espera para provar o que os gates de vitest já
provam por unidade. As mutações cujo ÚNICO dono é o browser estão marcadas `gate_browser` e
rodam contra o spec correspondente.
"""

from __future__ import annotations

import dataclasses
import json
import os
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CLI = "src/lib/v1/client.ts"
WSD = "src/features/workspace/data/workspace.ts"
WSU = "src/features/workspace/SecaoDeWorkspace.tsx"
INSD = "src/features/instances/data/instance.ts"
INSU = "src/features/instances/SecaoDaInstancia.tsx"
CAMPO = "src/shared/config/CampoDeNome.tsx"

UI = "src/test/v1/m42-config-ui.test.tsx"
E2E_WS = "e2e/m42-cfg-workspace.spec.ts"
E2E_IN = "e2e/m42-cfg-instancia.spec.ts"


@dataclasses.dataclass(frozen=True)
class Mut:
    n: int
    titulo: str
    arquivo: str
    ancora: str
    troca: str
    gate: str
    porque: str
    browser: bool = False


M = Mut
MUTACOES: list[Mut] = [
    M(1, "claim.name substitui o produtor", WSU,
      "        confirmado={workspace.data.name}",
      '        confirmado={"Suporte Regional"}',
      "N1", "o nome do espaço não vem da claim"),
    M(2, "a claim stale ganha depois do PATCH", WSD,
      "      cache.setQueryData(workspaceKeys.config(workspaceId ?? \"idle\"), novo);",
      "      cache.setQueryData(workspaceKeys.config(workspaceId ?? \"idle\"),\n"
      "        { ...novo, name: \"Suporte Regional\" });",
      "N4", "depois da escrita a tela não pode voltar para a claim"),
    M(3, "503 vira fallback da claim", WSU,
      "  if (workspace.isError || !workspace.data) {",
      "  if (false && (workspace.isError || !workspace.data)) {",
      "N3", "indisponibilidade não vira nome confirmado"),
    M(4, "workspace_id muda no estado", WSD,
      "      cache.setQueryData(workspaceKeys.config(workspaceId ?? \"idle\"), novo);",
      "      cache.setQueryData(workspaceKeys.config(workspaceId ?? \"idle\"),\n"
      "        { ...novo, workspace_id: \"ws-outro\" });",
      "N4", "renomear não move a identidade"),
    M(5, "o PATCH do Workspace vira POST", CLI,
      '      enviar<WorkspaceView>("PATCH", `/v1/workspaces/${encodeAnalysisId(workspaceId)}`, {}, opts, {',
      '      enviar<WorkspaceView>("POST", `/v1/workspaces/${encodeAnalysisId(workspaceId)}`, {}, opts, {',
      "N4/N5", "rename não é create"),
    M(6, "ação de criar espaço aparece", WSU,
      "      {/* A identidade fica visível e NÃO é editável.",
      "      <button type=\"button\">Create workspace</button>\n"
      "      {/* A identidade fica visível e NÃO é editável.",
      "N6/N7/N8/N9", "o CRUD legado não foi promovido"),
    M(7, "ação de excluir espaço aparece", WSU,
      "    <div className=\"space-y-3\">\n      <CampoDeNome",
      "    <div className=\"space-y-3\">\n      <button type=\"button\">Delete workspace</button>\n      <CampoDeNome",
      "N6/N7/N8/N9", "delete está fora da capacidade congelada"),
    M(8, "gestão de membros aparece", WSU,
      "        rotulo={t(\"workspaceConfig.nameLabel\")}",
      "        rotulo={t(\"workspaceConfig.nameLabel\")}\n"
      "        // @ts-expect-error mutação\n"
      "        membros={[{ id: \"u-1\", role: \"owner\" }]}",
      "G3", "membership pertence ao provedor de identidade"),
    M(9, "salvar o espaço dispara requisição de Instância", WSD,
      "      cache.setQueryData(workspaceKeys.config(workspaceId ?? \"idle\"), novo);",
      "      void cache.invalidateQueries({ queryKey: [\"workspace\", workspaceId, \"instances\"] });\n"
      "      cache.setQueryData(workspaceKeys.config(workspaceId ?? \"idle\"), novo);",
      "G1", "os dois donos não se arrastam"),
    M(10, "salvar a Instância dispara requisição de espaço", INSD,
      "      cache.setQueryData(workspaceKeys.instance(scope.workspaceId, nova.instance_id), nova);",
      "      void cache.invalidateQueries({ queryKey: [\"workspace\", scope.workspaceId, \"config\"] });\n"
      "      cache.setQueryData(workspaceKeys.instance(scope.workspaceId, nova.instance_id), nova);",
      "G1", "os dois donos não se arrastam"),
    M(11, "instance_id muda no estado", INSD,
      "      cache.setQueryData(workspaceKeys.instance(scope.workspaceId, nova.instance_id), nova);",
      "      cache.setQueryData(workspaceKeys.instance(scope.workspaceId, nova.instance_id),\n"
      "        { ...nova, instance_id: `${nova.instance_id}-v2` });",
      "G2", "renomear não move a identidade da Instância"),
    M(12, "o PATCH da Instância vira POST", CLI,
      '        "PATCH",\n        `/v1/instances/${encodeAnalysisId(instanceId)}`,',
      '        "POST",\n        `/v1/instances/${encodeAnalysisId(instanceId)}`,',
      "N12", "rename não é recreate"),
    M(13, "nome duplicado é BLOQUEADO", INSU,
      "        onSalvar={async (nome) => {",
      "        onSalvar={async (nome) => {\n"
      "          if (nome === \"Suporte\") return;",
      "N14/N15", "o contrato declara a ausência de unicidade"),
    M(14, "nome duplicado recebe sufixo", INSU,
      "          await renomear.mutateAsync({ scope, instanceId, name: nome }).then(",
      "          await renomear.mutateAsync({ scope, instanceId, name: `${nome} (2)` }).then(",
      "N14/N15", "o Front não renomeia por conta própria"),
    M(15, "o rename limpa o cache de baseline", INSD,
      "      cache.setQueryData(workspaceKeys.instance(scope.workspaceId, nova.instance_id), nova);",
      "      cache.removeQueries({\n"
      "        queryKey: workspaceKeys.instanceBaseline(scope.workspaceId, nova.instance_id),\n"
      "      });\n"
      "      cache.setQueryData(workspaceKeys.instance(scope.workspaceId, nova.instance_id), nova);",
      "régua", "rename não toca o ponteiro de baseline", True),
    M(16, "503 da Instância vira not-found", INSU,
      # A 1a versao escondia a secao no erro de RENAME, e o gate de 503 nunca renomeia --
      # mutacao inerte para aquele caminho. Agora ela ataca a COPY, que e o que N16 protege.
      '<p className="text-sm text-muted-foreground">{t("instanceConfig.body")}</p>',
      '<p className="text-sm text-muted-foreground">Instance not found</p>',
      "G4", "indisponibilidade não é ausência"),
    M(17, "503 do Workspace vira erro global", WSU,
      "      <p className=\"text-sm text-destructive\" role=\"alert\">\n          {t(\"workspaceConfig.loadFailed\")}",
      "      <p className=\"text-sm text-destructive\" role=\"alert\">\n          {(() => { throw new Error(\"global\"); })()}\n          {t(\"workspaceConfig.loadFailed\")}",
      "N3", "a falha de um dono não derruba a página"),
    M(18, "a leitura do Workspace ganha retry infinito", WSD,
      "    retry: false,\n    staleTime: 60_000,",
      "    retry: 10,\n    staleTime: 60_000,",
      "N3", "indisponibilidade tem de chegar à tela, não virar espera eterna"),
    # A 1a versao so mexia em `confirmadoAgora`, e a guarda `confirmadoAgora && !mudou` do
    # `CampoDeNome` a tornava inerte -- defesa em profundidade escondendo a mutacao. Agora ela
    # ataca o par inteiro: diz que salvou E esconde a falha.
    # A 1a versao so mexia em `confirmadoAgora`, e a guarda `confirmadoAgora && !mudou` do
    # `CampoDeNome` a tornava INERTE — defesa em profundidade escondendo a mutacao, exatamente
    # a licao `feedback_defesa_em_profundidade_mascara_mutacao`. Agora ela ataca o sinal de
    # FALHA, que e o que a secao usa para nao mentir.
    M(19, "a falha de escrita deixa de ser sinalizada", WSU,
      "        falhou={renomear.isError}",
      "        falhou={false}",
      "N19", "nunca afirmar que salvou o que nao salvou"),
    M(20, "duplo envio deixa de ser travado", CAMPO,
      "    if (!podeSalvar || emVoo.current) return;",
      "    if (!podeSalvar) return;",
      "H1", "duas escritas confirmam um valor que a pessoa já abandonou"),
    M(21, "URL interna do owner entra no Front", CLI,
      '    getWorkspace: (workspaceId, opts) =>',
      '    getWorkspace: (workspaceId, opts) =>\n'
      '      // eslint-disable-next-line no-constant-condition\n'
      '      false ? enviar<WorkspaceView>("GET", "http://sentinela-workspace.internal/v1/workspaces", {}, opts) :',
      "F1", "o Front não conhece owner interno"),
    M(22, "token interno entra no Front", CLI,
      '    renameWorkspace: (workspaceId, name, opts) =>',
      '    renameWorkspace: (workspaceId, name, opts) =>\n'
      '      // eslint-disable-next-line no-constant-condition\n'
      '      false ? enviar<WorkspaceView>("GET", "/internal/v1/workspaces", { "x-internal-token": "s2s" }, opts) :',
      "F1", "o token S2S é do Gateway, não do browser"),
    M(23, "o cache não reconcilia após o rename", WSD,
      "      cache.setQueryData(workspaceKeys.config(workspaceId ?? \"idle\"), novo);",
      "      void novo;",
      "N4", "a tela ficaria no valor anterior com 200 na rede"),
    M(24, "refresh volta ao valor stale local", CAMPO,
      "    if (confirmado !== ultimoConfirmado.current) {",
      "    if (false && confirmado !== ultimoConfirmado.current) {",
      "H2", "o campo tem de seguir o servidor quando o confirmado muda"),
]


def _ler(p: pathlib.Path) -> str:
    with open(p, encoding="utf-8", newline="") as f:
        return f.read()


def _escrever(p: pathlib.Path, t: str) -> None:
    with open(p, "w", encoding="utf-8", newline="") as f:
        f.write(t)


def _aplicar(m: Mut) -> tuple[bool, str, str]:
    p = RAIZ / m.arquivo
    original = _ler(p)
    crlf = "\r\n" in original
    anc = m.ancora.replace("\n", "\r\n") if crlf else m.ancora
    tro = m.troca.replace("\n", "\r\n") if crlf else m.troca
    if original.count(anc) != 1:
        return False, original, f"ANCORA_AUSENTE_OU_AMBIGUA ({original.count(anc)}x, crlf={crlf})"
    _escrever(p, original.replace(anc, tro, 1))
    return True, original, ""


def _rodar(m: Mut) -> tuple[int, str]:
    env = dict(os.environ)
    env["SENTINELA_CONTRACT_ORIGIN"] = "../sentinela-facts/docs/contracts"
    if m.browser:
        argv = ["npx", "playwright", "test", E2E_IN, "--reporter=line", "-g", m.gate]
    else:
        argv = ["npx", "vitest", "run", UI, "-t", m.gate]
    proc = subprocess.run(
        argv, cwd=RAIZ, env=env, capture_output=True, text=True, errors="replace",
        timeout=1200, shell=os.name == "nt",
    )
    return proc.returncode, proc.stdout + proc.stderr


def _selecionou_zero(saida: str) -> bool:
    """O gate rodou sobre NENHUM teste?

    Este era o defeito mais grave do driver, e ele mentia na direcao pior: `vitest -t NAO_EXISTE`
    seleciona zero casos, sai `0`, e a mutacao era registrada como SOBREVIVEU. Duas mutacoes
    passaram por isso -- o gate `F1` nao existe em teste nenhum, e o driver leu silencio como
    aprovacao. Zero teste selecionado nao e evidencia de nada.
    """
    baixa = saida.lower()
    return (
        "no test files found" in baixa
        or "no tests found" in baixa
        or "tests  no tests" in baixa
        or "filter matched no tests" in baixa
        or ("passed" not in baixa and "failed" not in baixa)
    )


def _classificar(saida: str) -> str:
    if _selecionou_zero(saida):
        return "GATE_VAZIO (nenhum teste selecionado)"
    for acidente in ("Transform failed", "Failed to load", "esbuild"):
        if acidente in saida:
            return f"MORTE_SUSPEITA ({acidente})"
    return "MORTA"


def main(argv: list[str]) -> int:
    escolhidas = {int(a) for a in argv} if argv else None
    resultados = []
    for m in MUTACOES:
        if escolhidas is not None and m.n not in escolhidas:
            continue
        aplicou, original, motivo = _aplicar(m)
        if not aplicou:
            print(f"[{m.n:2}] {m.titulo}\n     !! {motivo}", flush=True)
            resultados.append({"n": m.n, "titulo": m.titulo, "veredito": motivo, "gate": m.gate})
            continue
        try:
            codigo, saida = _rodar(m)
            if codigo == 0:
                # Sobreviver so vale se ALGUM teste rodou. Verde sobre lista vazia e o laco
                # vazio de sempre: sempre verde, sempre irrelevante.
                veredito = (
                    "GATE_VAZIO (nenhum teste selecionado)"
                    if _selecionou_zero(saida)
                    else "SOBREVIVEU"
                )
            else:
                veredito = _classificar(saida)
            print(f"[{m.n:2}] {m.titulo}\n     gate: {m.gate}"
                  f"{' (browser)' if m.browser else ''}\n     -> {veredito}", flush=True)
            resultados.append({"n": m.n, "titulo": m.titulo, "veredito": veredito,
                               "gate": m.gate, "porque": m.porque, "browser": m.browser})
        finally:
            _escrever(RAIZ / m.arquivo, original)

    sujo = subprocess.run(["git", "status", "--porcelain"], cwd=RAIZ,
                          capture_output=True, text=True).stdout
    destino = RAIZ / "docs" / "m42" / "mutacoes-implementacao-resultado.json"
    destino.write_text(json.dumps({"resultados": resultados, "arvore": sujo},
                                  indent=2, ensure_ascii=False), encoding="utf-8")
    mortas = sum(1 for r in resultados if r["veredito"] == "MORTA")
    print(f"\n=== {mortas}/{len(resultados)} MORTAS pelo gate nomeado ===")
    for r in resultados:
        if r["veredito"] != "MORTA":
            print(f"  !! {r['n']:2} {r['titulo']}: {r['veredito']}")
    return 0 if mortas == len(resultados) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
