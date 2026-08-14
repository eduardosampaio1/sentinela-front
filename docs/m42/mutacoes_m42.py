"""M42 · CFG-03/CFG-04 — as 24 mutações da campanha, cada uma pelo gate NOMEADO.

    python docs/m42/mutacoes_m42.py            # todas
    python docs/m42/mutacoes_m42.py 5 12 21    # só estas

Mesma disciplina do harness da BD14, e pelas mesmas razões medidas lá:

* **morte por acidente não vale** — o driver registra QUEM matou. Morte por erro de compilação,
  de import ou de coleta vira `MORTE_SUSPEITA` e conta como sobrevivente para leitura;
* **âncora ausente é falha**, nunca "morta". Uma âncora que não casa não mede nada, e passaria
  por verde;
* **âncora de uma linha**, arquivos lidos e reescritos com `newline=""`: o repositório é CRLF, e
  âncora com `\\n` literal não casa `\\r\\n`;
* **sempre restaura**, e confere `git status` na saída.

O alvo é o MOCK, não a UI: esta missão não implementa tela nenhuma. O que cada mutação pergunta
é "se o mock passasse a mentir assim, alguém ficaria vermelho?".
"""

from __future__ import annotations

import dataclasses
import json
import os
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CAT = "src/mocks/scenarios/catalogo.ts"
FIX = "src/test/fixtures/public-v1/workspace-instance-config.ts"
GATES = "src/test/v1/m42-config-scenarios.test.ts"


@dataclasses.dataclass(frozen=True)
class Mut:
    n: int
    titulo: str
    arquivo: str
    ancora: str
    troca: str
    gate: str
    porque: str


M = Mut
MUTACOES: list[Mut] = [
    # ── WORKSPACE ────────────────────────────────────────────────────────────────────────
    M(1, "workspace_id muda no rename", CAT,
      "      atual = { ...atual, name: nome };",
      '      atual = { ...atual, workspace_id: "ws-outro-id", name: nome };',
      "WG2", "identidade tem de sobreviver ao rename"),
    M(2, "claim name vence o producer", FIX,
      '    { id: WORKSPACE_CORRENTE.workspace_id, name: "Suporte Regional", role: "owner" },',
      "    { id: WORKSPACE_CORRENTE.workspace_id, name: WORKSPACE_CORRENTE.name, role: \"owner\" },",
      "WG5", "sem divergencia a armadilha deixa de existir"),
    M(3, "503 vira fallback confirmado pela claim", CAT,
      '      http.get(`${b}/v1/workspaces/:workspaceId`, () =>\n'
      '        json(problem("temporarily_unavailable"), 503)),',
      "      http.get(`${b}/v1/workspaces/:workspaceId`, () =>\n"
      "        json({ workspace_id: WORKSPACE_CORRENTE.workspace_id,\n"
      "               name: CLAIM_DESATUALIZADA.workspaces[0].name,\n"
      "               created_at: WORKSPACE_CORRENTE.created_at })),",
      "WG6", "outage servido como nome confirmado"),
    # A 1a versao punha o nome numa DOCSTRING, e o gate le o codigo COM OS COMENTARIOS REMOVIDOS
    # -- de proposito, porque estes arquivos explicam o que e proibido. Prosa nao e conhecimento
    # operacional; ler o store legado, sim.
    M(4, "o mock passa a conhecer o PgContextStore legado", CAT,
      "  let atual: WorkspaceView = { ...WORKSPACE_CORRENTE };",
      "  let atual: WorkspaceView = { ...WORKSPACE_CORRENTE };\n"
      "  const legado = { tabela: \"pg_context_store\", fallback: atual.name };",
      "WG11", "fronteira publica nao conhece store interno"),
    M(5, "create de Workspace entra", CAT,
      "    http.patch(`${b}/v1/workspaces/:workspaceId`, async ({ params, request }) => {",
      "    http.post(`${b}/v1/workspaces`, () => json(atual, 201)),\n"
      "    http.patch(`${b}/v1/workspaces/:workspaceId`, async ({ params, request }) => {",
      "WG7", "o CRUD legado nao foi promovido"),
    M(6, "delete de Workspace entra", CAT,
      "    http.get(`${b}/v1/workspaces/:workspaceId`, ({ params }) =>",
      "    http.delete(`${b}/v1/workspaces/:workspaceId`, () => json({ deleted: true })),\n"
      "    http.get(`${b}/v1/workspaces/:workspaceId`, ({ params }) =>",
      "WG8", "delete esta fora da capacidade congelada"),
    # A 1a versao declarava um `const membros` que ninguem lia -- mutacao INERTE, do mesmo tipo
    # que a #17 da BD14: mudou o texto e nao mudou comportamento nenhum. Agora publica a ROTA.
    M(7, "membership entra", CAT,
      "    http.get(`${b}/v1/workspaces/:workspaceId`, ({ params }) =>",
      "    http.get(`${b}/v1/workspaces/:workspaceId/members`, () =>\n"
      "      json({ items: [{ id: \"u-1\", role: \"owner\" }] })),\n"
      "    http.get(`${b}/v1/workspaces/:workspaceId`, ({ params }) =>",
      "WG9", "membership pertence ao provedor de identidade"),
    M(8, "settings genérico entra", CAT,
      "  return [\n    // `workspace_id` no CAMINHO, não na query",
      "  return [\n"
      "    http.get(`${b}/v1/workspaces/:workspaceId/settings`, () => json({ theme: \"dark\" })),\n"
      "    // `workspace_id` no CAMINHO, não na query",
      "WG10", "settings generico e a casa esperando o proximo campo"),
    M(9, "GET cria/muda Workspace (leitura com efeito)", CAT,
      "      params.workspaceId === atual.workspace_id\n        ? json(atual)",
      "      params.workspaceId === atual.workspace_id\n"
      "        ? json((atual = { ...atual, name: `${atual.name} (lido)` }))",
      "WG1", "leitura nao pode escrever"),
    M(10, "rename vira recreate (carimbo novo)", CAT,
      "      atual = { ...atual, name: nome };\n      return json(atual);",
      '      atual = { ...atual, name: nome, created_at: "2099-01-01T00:00:00Z" };\n'
      "      return json(atual);",
      "WG3", "recreate troca o carimbo; rename nao"),

    # ── INSTANCE ─────────────────────────────────────────────────────────────────────────
    M(11, "instance_id muda no rename", CAT,
      "const atualizada: InstanceView = { ...i, name: nome };",
      "const atualizada: InstanceView = { ...i, instance_id: `${i.instance_id}-v2`, name: nome };",
      "IG2", "identidade da Instance tem de sobreviver"),
    M(12, "name vira unique", CAT,
      "      const atualizada: InstanceView = {",
      "      for (const outra of porId.values()) {\n"
      "        if (outra.instance_id !== id && outra.name === nome) {\n"
      "          return json(problem(\"invalid_input\"), 400);\n"
      "        }\n"
      "      }\n"
      "      const atualizada: InstanceView = {",
      "IG5", "o contrato declara a AUSENCIA de unicidade"),
    M(13, "duplicate rename falha por conflito", CAT,
      "      porId.set(id, atualizada);\n      return json(atualizada);",
      "      if ([...porId.values()].some((o) => o.instance_id !== id && o.name === nome)) {\n"
      "        return json(problem(\"idempotency_conflict\"), 409);\n"
      "      }\n"
      "      porId.set(id, atualizada);\n      return json(atualizada);",
      "IG5", "nome ja ocupado continua sendo sucesso"),
    # Idem: a 1a versao declarava uma funcao que ninguem chamava. Agora o PATCH MEXE mesmo.
    M(14, "baseline muda junto com o rename", CAT,
      "      const atualizada: InstanceView = { ...i, name: nome };",
      "      baseline.baseline_analysis_id = \"an-trocada-pelo-rename\";\n"
      "      const atualizada: InstanceView = { ...i, name: nome };",
      "IG6", "rename nao toca o ponteiro de baseline"),
    M(15, "rename vira delete + create", CAT,
      "      porId.set(id, atualizada);",
      "      porId.delete(id);\n      porId.set(`${id}-novo`, { ...atualizada, instance_id: `${id}-novo` });",
      "IG7", "o mesmo objeto logico persiste"),
    M(16, "description entra na view", FIX,
      '  name: "Suporte",\n  created_at: "2026-05-02T11:15:00Z",',
      '  name: "Suporte",\n  description: "fila principal",\n  created_at: "2026-05-02T11:15:00Z",',
      "IG8", "description nao existe na Instance"),
    M(17, "tags são aceitas na escrita", CAT,
      '      if (chaves.length !== 1 || chaves[0] !== "name") {\n'
      '        return json(problem("invalid_input"), 400);\n'
      "      }\n"
      "      const nome = corpo?.name;\n"
      '      if (typeof nome !== "string" || nome.length < 1) {\n'
      '        return json(problem("invalid_input"), 400);\n'
      "      }\n"
      "      // Nome duplicado é LEGÍTIMO",
      '      if (!chaves.includes("name")) {\n'
      '        return json(problem("invalid_input"), 400);\n'
      "      }\n"
      "      const nome = corpo?.name;\n"
      '      if (typeof nome !== "string" || nome.length < 1) {\n'
      '        return json(problem("invalid_input"), 400);\n'
      "      }\n"
      "      // Nome duplicado é LEGÍTIMO",
      "IG8", "extra=forbid: campo a mais e recusado, nao ignorado"),
    M(18, "slug entra na massa", FIX,
      '  instance_id: "inst-b7e5a316-8c02-4d99-a1f7-63e4c05b8d2a",',
      '  instance_id: "inst-b7e5a316-8c02-4d99-a1f7-63e4c05b8d2a",\n  slug: "cobranca",',
      "IG8", "slug nao existe na Instance"),
    M(19, "503 da Instance vira not-found", CAT,
      "      http.get(`${b}/v1/instances/:instanceId`, () =>\n"
      '        json(problem("temporarily_unavailable"), 503)),',
      "      http.get(`${b}/v1/instances/:instanceId`, () =>\n"
      '        json(problem("forbidden_or_not_found"), 404)),',
      "IG9", "indisponibilidade nao e ausencia"),
    M(20, "o anti-oracle vaza a existência", CAT,
      "      http.get(`${b}/v1/instances/:instanceId`, () =>\n"
      '        json(problem("forbidden_or_not_found"), 404)),\n'
      "      http.patch(`${b}/v1/instances/:instanceId`, () =>\n"
      '        json(problem("forbidden_or_not_found"), 404)),',
      "      http.get(`${b}/v1/instances/:instanceId`, () =>\n"
      '        json(problem("forbidden_or_not_found", { detail: "a Instance não existe" }), 404)),\n'
      "      http.patch(`${b}/v1/instances/:instanceId`, () =>\n"
      '        json(problem("forbidden_or_not_found"), 404)),',
      "IG10", "distinguir revela o que a fronteira esconde"),

    # ── CROSS ────────────────────────────────────────────────────────────────────────────
    M(21, "Workspace e Instance compartilham store genérico", CAT,
      "    http.get(`${b}/v1/instances/:instanceId`, ({ params }) => {\n"
      "      const i = porId.get(String(params.instanceId));\n"
      "      return i ? json(i) : json(problem(\"forbidden_or_not_found\"), 404);",
      "    http.get(`${b}/v1/instances/:instanceId`, ({ params }) => {\n"
      "      const i = porId.get(String(params.instanceId));\n"
      "      return i\n"
      "        ? json({ ...i, workspace_id: WORKSPACE_CORRENTE.workspace_id, settings: {} })\n"
      "        : json(problem(\"forbidden_or_not_found\"), 404);",
      "C3", "um objeto com os dois estados e o configurationEngine nascendo"),
    M(22, "Account entra no scenario de configuração", CAT,
      "    handlers: (b) => workspaceHandlers(b),",
      "    handlers: (b) => [\n"
      "      http.get(`${b}/v1/me/language`, () => json(projetar(null))),\n"
      "      ...workspaceHandlers(b),\n"
      "    ],",
      "C4", "CFG-03 nao depende do Account"),
    M(23, "Dispatcher entra no scenario de configuração", CAT,
      "    handlers: (b) => instanceHandlers(b, [INSTANCIA_CONFIG, INSTANCIA_VIZINHA]),",
      "    handlers: (b) => [\n"
      "      http.get(`${b}/v1/subscriptions`, () => json({ items: [] })),\n"
      "      ...instanceHandlers(b, [INSTANCIA_CONFIG, INSTANCIA_VIZINHA]),\n"
      "    ],",
      "C5", "CFG-04 nao depende do Dispatcher"),
    # Idem #4: comentario nao e vazamento. O vazamento e o mock MANDAR o cabecalho interno.
    M(24, "internals do Gateway vazam para o mock público", CAT,
      "  const baseline = { ...BASELINE_DA_INSTANCIA };",
      "  const baseline = { ...BASELINE_DA_INSTANCIA };\n"
      "  const cabecalhos = { \"x-internal-token\": \"segredo-s2s\" };",
      "WG12", "o mock e da fronteira PUBLICA"),
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
    proc = subprocess.run(
        ["npx", "vitest", "run", GATES, "-t", m.gate],
        cwd=RAIZ, env=env, capture_output=True, text=True, errors="replace",
        timeout=900, shell=os.name == "nt",
    )
    return proc.returncode, proc.stdout + proc.stderr


def _classificar(saida: str) -> str:
    for acidente in ("Cannot find name", "TS2", "SyntaxError", "Failed to load", "Transform failed"):
        if acidente in saida:
            return f"MORTE_SUSPEITA ({acidente})"
    if "No test files found" in saida or "no tests" in saida.lower():
        return "MORTE_SUSPEITA (nenhum teste selecionado)"
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
            veredito = "SOBREVIVEU" if codigo == 0 else _classificar(saida)
            mortos = sorted({
                linha.strip().lstrip("× ").split(" > ")[-1].strip()
                for linha in saida.splitlines()
                if linha.strip().startswith("×")
            })
            print(f"[{m.n:2}] {m.titulo}\n     gate: {m.gate}\n     -> {veredito}"
                  + (f"  por: {'; '.join(mortos)[:180]}" if mortos else ""), flush=True)
            resultados.append({"n": m.n, "titulo": m.titulo, "veredito": veredito,
                               "gate": m.gate, "matou": mortos, "porque": m.porque})
        finally:
            _escrever(RAIZ / m.arquivo, original)

    sujo = subprocess.run(["git", "status", "--porcelain"], cwd=RAIZ,
                          capture_output=True, text=True).stdout
    destino = RAIZ / "docs" / "m42" / "mutacoes-resultado.json"
    destino.parent.mkdir(parents=True, exist_ok=True)
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
