"""M44 - campanha de mutacao sobre a materializacao de cenarios.

Cada mutacao encena um erro PLAUSIVEL de quem for implementar a M44 depois, e cada uma tem um
gate NOMEADO que precisa mata-la. O driver e o mesmo da M42, com as correcoes que ele ja custou:

* ancora ausente ou ambigua NAO e "morta" -- e falha do instrumento, e sai como tal;
* `vitest -t GATE_QUE_NAO_EXISTE` seleciona zero casos e sai `0`; isso e GATE_VAZIO, nunca
  SOBREVIVEU;
* CRLF: a arvore e `core.autocrlf=true`, entao a ancora e normalizada antes de casar;
* morte por erro de transformacao/import e MORTE_SUSPEITA, nao morte.

Uso:  python docs/m44/mutacoes_m44.py [n ...]
"""

from __future__ import annotations

import dataclasses
import os
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]

MASSA = "src/test/fixtures/public-v1/subscriptions.ts"
CAT = "src/mocks/scenarios/assinaturas.ts"
GATES = "src/test/v1/m44-scenarios.test.ts"


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
    M(1, "o e-mail da conta vira o destination", MASSA,
      "  destination: DESTINO_CONFIGURADO,",
      "  destination: EMAIL_DA_CONTA,",
      "SG5",
      "resolver destinatario por identidade e o erro mais provavel desta superficie"),

    M(2, "o handler de criar resolve destination por identidade", CAT,
      "        destination: corpo.destination,",
      '        destination: "ana.ribeiro@cliente.test",',
      "SG13",
      "o corpo pede um destino e o mock devolve o e-mail de login"),

    M(3, "o nome do Workspace vira destination", CAT,
      "        destination: corpo.destination,",
      '        destination: "Acme",',
      "SG13",
      "Workspace identifica escopo; derivar recipient dele confunde os dois papeis"),

    M(4, "o idioma da conta vira o idioma da assinatura", MASSA,
      "  language: IDIOMA_DA_ASSINATURA,",
      "  language: IDIOMA_DA_CONTA,",
      "SG6",
      "sincronizar os dois apaga a intencao congelada de entrega"),

    M(5, "GET cria a assinatura que faltava", CAT,
      "      json({ items: lista(escopo(request.url)) })),",
      "      json({ items: (porWorkspace.set(escopo(request.url), lista(escopo(request.url)).length"
      " ? lista(escopo(request.url)) : [{ ...ASSINATURA_ATIVA }]), lista(escopo(request.url))) })),",
      "SG2",
      "auto-criar na leitura faz `ausente` sumir do mundo assim que alguem abre a tela"),

    M(6, "outage devolve lista vazia", CAT,
      '      http.get(`${b}/v1/subscriptions`, () => json(problem("temporarily_unavailable"), 503)),',
      '      http.get(`${b}/v1/subscriptions`, () => json({ items: [] })),',
      "SG3",
      "o eixo da M44: outage virando ausencia faz a tela dizer 'voce ainda nao configurou'"),

    M(7, "ausencia passa a trazer uma assinatura ativa", CAT,
      "    handlers: (b) => assinaturaHandlers(b, {}),",
      "    handlers: (b) => assinaturaHandlers(b, { [WS_PRINCIPAL]: [ASSINATURA_ATIVA] }),",
      "SG1",
      "ausencia que nao e vazia deixa de ser ausencia"),

    M(8, "desativar apaga a linha", CAT,
      "        lista(ws).map((s) => (s.subscription_id === alvo.subscription_id ? { ...s, active: false } : s)),",
      "        lista(ws).filter((s) => s.subscription_id !== alvo.subscription_id),",
      "SG10",
      "disable virando delete faz 'desativei' virar 'nunca configurei'"),

    M(9, "a assinatura passa a receber todos os eventos", MASSA,
      '  event_types: ["analysis.completed", "analysis.failed"],\n  language: IDIOMA_DA_ASSINATURA,',
      '  event_types: ["analysis.completed", "analysis.failed", "result.available"],\n'
      "  language: IDIOMA_DA_ASSINATURA,",
      "event_types",
      "filtro que aceita tudo nao e filtro, e a pergunta perde resposta observavel"),

    M(10, "o escopo ignora a query e assume um workspace", CAT,
      '  const escopo = (url: string) => new URL(url).searchParams.get("workspace_id") ?? "";',
      "  const escopo = (url: string) => (void url, WS_PRINCIPAL);",
      "SG8",
      "escopo fixo faz o isolamento passar sem existir"),

    M(11, "a lista devolve as assinaturas de todos os workspaces", CAT,
      "  const lista = (ws: string) => porWorkspace.get(ws) ?? [];",
      "  const lista = (ws: string) => (void ws, [...porWorkspace.values()].flat());",
      "SG9",
      "vazamento entre tenants e o defeito mais caro que uma massa pode esconder"),

    M(12, "o destination some da massa corrente", MASSA,
      "  destination: DESTINO_CONFIGURADO,",
      '  destination: "",',
      "SG4",
      "campo vazio parece 'nao configurado' e a UI inventaria um estado"),

    M(13, "o deep link vira /canonical", MASSA,
      '  return `${urlBase.replace(/\\/+$/, "")}/analyses/${analysisId}`;',
      '  return `${urlBase.replace(/\\/+$/, "")}/canonical/analyses/${analysisId}`;',
      "RG3",
      "`/canonical` e rota interna; usa-la em mensagem vaza nome de implementacao"),

    M(14, "o deep link ganha sufixo /result", MASSA,
      '  return `${urlBase.replace(/\\/+$/, "")}/analyses/${analysisId}`;',
      '  return `${urlBase.replace(/\\/+$/, "")}/analyses/${analysisId}/result`;',
      "RG4",
      "era o que o Blueprint dizia ate esta missao medir o compositor"),

    M(15, "a reentrada ganha uma operacao de escrita", CAT,
      '      http.get(`${b}/v1/analyses/:analysisId`, () => json(statusView("completed"))),',
      '      http.get(`${b}/v1/analyses/:analysisId`, () => json(statusView("completed"))),\n'
      '      http.post(`${b}/v1/analyses`, () => json(statusView("preparing"), 201)),',
      "RG5",
      "abrir um link recebido nao pode criar analise"),

    M(16, "a reentrada muda o estado a cada leitura", CAT,
      '      http.get(`${b}/v1/analyses/:analysisId`, () => json(statusView("failed"))),',
      "      http.get(`${b}/v1/analyses/:analysisId`, ((): Parameters<typeof http.get>[1] => {\n"
      "        let n = 0;\n"
      '        return () => json({ ...statusView("failed"), sequence: (n += 1) });\n'
      "      })()),",
      "C8",
      "leitura que muta faz a mesma URL contar historias diferentes"),

    M(17, "result_available passa a ser derivado do tipo do evento", MASSA,
      "  data: { result_available: false },",
      '  data: { result_available: EVENTO_CONCLUIDA.event_type === "analysis.completed" },',
      "RG8",
      "concluida nao implica resultado legivel -- por isso `result.available` e evento a parte"),

    M(18, "uma URL interna do Dispatcher entra na massa", MASSA,
      '  destination: "https://hooks.operacoes.exemplo.test/sentinela",',
      '  destination: "http://localhost:8081/internal/v1/subscriptions",',
      "SG12",
      "o Front nao conhece o Dispatcher; conhecer seria a fronteira dissolvida"),

    M(19, "um token interno entra na resposta de criar", CAT,
      "          secret: nova.channel === \"webhook\" ? \"whsec_criado_uma_vez\" : null,",
      "          secret: nova.channel === \"webhook\" ? \"whsec_criado_uma_vez\" : null,\n"
      '          "x-internal-token": "s2s-abc",',
      "SG12",
      "credencial S2S na fronteira publica e vazamento, mesmo em mock"),

    M(20, "HMAC vira estado de Front", MASSA,
      "export const NUNCA_PUBLICOS",
      'export const HMAC_ATUAL = "sha256=6b1e9047";\n\nexport const NUNCA_PUBLICOS',
      "SG12",
      "assinatura de entrega e detalhe do Dispatcher, nunca estado de tela"),

    M(21, "um cenario de inbox entra no catalogo", CAT,
      '    id: "subscription-absent",',
      '    id: "notifications-inbox",',
      "SG11",
      "a M44 nao autoriza inbox, e o catalogo e onde ela apareceria primeiro"),

    M(22, "configuracao generica de notificacao entra na massa", MASSA,
      "export const NUNCA_PUBLICOS",
      "export const NOTIFICATION_SETTINGS = { digest: true };\n\nexport const NUNCA_PUBLICOS",
      "SG12",
      "'notification settings' generico nao existe no contrato"),

    # As ancoras destas duas eram a frase ACENTUADA do docstring e casaram ZERO vezes -- o driver
    # as reportou como INSTRUMENTO, que e o comportamento certo. Passaram a ancorar numa
    # declaracao ASCII e unica.
    M(23, "a massa passa a depender do store de Account", MASSA,
      "export interface SubscriptionView {",
      'import "@/test/fixtures/public-v1/account-language";\n\nexport interface SubscriptionView {',
      "C1/C2/C3",
      "Subscription e Account sao donos diferentes; compartilhar massa e o primeiro passo"),

    M(24, "a massa passa a depender do store de Workspace config", MASSA,
      "export interface SubscriptionView {",
      'import "@/test/fixtures/public-v1/workspace-instance-config";\n\n'
      "export interface SubscriptionView {",
      "C1/C2/C3",
      "Workspace identifica escopo; ele nao e dono de assinatura"),
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
    n = original.count(anc)
    if n != 1:
        return False, original, f"ANCORA_AUSENTE_OU_AMBIGUA ({n}x, crlf={crlf})"
    _escrever(p, original.replace(anc, tro, 1))
    return True, original, ""


def _gate_existe(m: Mut) -> bool:
    """O nome do gate casa com algum titulo de teste?

    Defeito real desta campanha, e ele mentiu na direcao pior: dois gates foram escritos SEM
    acento (`criar e acao EXPLICITA`) contra titulos COM acento. `vitest -t` selecionou zero
    casos, o arquivo saiu "1 passed" com zero testes, `returncode` foi `0` -- e as duas mutacoes
    entraram no relatorio como SOBREVIVEU.

    `_selecionou_zero` nao pegou porque a saida CONTEM "passed": e o arquivo que passou, nao o
    caso. A checagem confiavel e anterior a execucao -- o nome tem de existir no fonte do gate.
    """
    return m.gate in _ler(RAIZ / GATES)


def _rodar(m: Mut) -> tuple[int, str]:
    env = dict(os.environ)
    env["SENTINELA_CONTRACT_ORIGIN"] = "../sentinela-facts/docs/contracts"
    proc = subprocess.run(
        ["npx", "vitest", "run", GATES, "-t", m.gate],
        cwd=RAIZ, env=env, capture_output=True, text=True, errors="replace",
        timeout=1200, shell=os.name == "nt",
    )
    return proc.returncode, proc.stdout + proc.stderr


def _selecionou_zero(saida: str) -> bool:
    baixa = saida.lower()
    return (
        "no test files found" in baixa
        or "no tests found" in baixa
        or "filter matched no tests" in baixa
        or ("passed" not in baixa and "failed" not in baixa)
    )


def _classificar(saida: str) -> str:
    if _selecionou_zero(saida):
        return "GATE_VAZIO (nenhum teste selecionado)"
    for acidente in ("Transform failed", "Failed to load", "esbuild", "Cannot find module"):
        if acidente in saida:
            return f"MORTE_SUSPEITA ({acidente})"
    return "MORTA"


def main(argv: list[str]) -> int:
    escolhidas = {int(a) for a in argv} if argv else None
    resultados: list[tuple[Mut, str]] = []

    # Snapshot do CONTEUDO, e nao `git status`. Contra o git, os proprios arquivos da missao --
    # ainda nao commitados -- apareciam como "nao restaurado" a cada rodada: o alarme disparava
    # sempre e media a fase do trabalho, nao a restauracao. O snapshot mede exatamente o que a
    # campanha promete: o arquivo termina como comecou.
    antes = {a: _ler(RAIZ / a) for a in sorted({m.arquivo for m in MUTACOES})}

    for m in MUTACOES:
        if escolhidas is not None and m.n not in escolhidas:
            continue
        if not _gate_existe(m):
            resultados.append((m, f"INSTRUMENTO: GATE_INEXISTENTE ({m.gate})"))
            print(f"[{m.n:02d}] INSTRUMENTO  {m.titulo} -- gate `{m.gate}` nao existe", flush=True)
            continue
        p = RAIZ / m.arquivo
        aplicou, original, motivo = _aplicar(m)
        if not aplicou:
            resultados.append((m, f"INSTRUMENTO: {motivo}"))
            print(f"[{m.n:02d}] INSTRUMENTO  {m.titulo} -- {motivo}", flush=True)
            continue
        try:
            rc, saida = _rodar(m)
            veredito = _classificar(saida) if rc != 0 else "SOBREVIVEU"
        finally:
            _escrever(p, original)
        resultados.append((m, veredito))
        print(f"[{m.n:02d}] {veredito:<34} {m.titulo}  (gate {m.gate})", flush=True)

    mortas = sum(1 for _, v in resultados if v == "MORTA")
    print(f"\n{mortas}/{len(resultados)} mortas pelo gate nomeado")
    for m, v in resultados:
        if v != "MORTA":
            print(f"  !! {m.n:02d} {v} -- {m.titulo}")

    nao_restaurado = [a for a in sorted(antes) if _ler(RAIZ / a) != antes[a]]
    if nao_restaurado:
        print("\nARQUIVO MUTADO NAO RESTAURADO:")
        print("\n".join(f"  {a}" for a in nao_restaurado))
        return 2
    return 0 if mortas == len(resultados) else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
