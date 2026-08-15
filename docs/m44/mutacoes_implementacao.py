"""M44 - campanha de mutacao sobre a IMPLEMENTACAO (client, hooks, UI).

Cada mutacao encena um erro plausivel de quem mexer nesta superficie depois, e cada uma tem gate
NOMEADO. O driver carrega as correcoes que ja custaram achado falso:

* ancora ausente/ambigua NAO e morte -- e falha do instrumento;
* o nome do gate e validado no fonte ANTES de rodar: `-t SEM_ACENTO` contra titulo acentuado
  seleciona zero casos, o arquivo sai "1 passed" e o driver lia SOBREVIVEU;
* restauracao comparada com SNAPSHOT do conteudo, nao com `git status` -- os arquivos da missao
  ainda nao estao commitados e o alarme disparava sempre;
* CRLF normalizado antes de casar a ancora.

Uso:  python docs/m44/mutacoes_implementacao.py [n ...]
"""

from __future__ import annotations

import dataclasses
import os
import pathlib
import subprocess
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]

CLI = "src/lib/v1/client.ts"
HOOK = "src/features/communication/data/subscriptions.ts"
UI = "src/features/communication/SecaoDeNotificacoes.tsx"

E2E_COM = "e2e/m44-comunicacao.spec.ts"
E2E_RE = "e2e/m44-reentrada.spec.ts"
# Cinco invariantes nao sao observaveis por browser; para eles o gate e ESTRUTURAL.
ESTRUTURA = "src/test/v1/m44-estrutura.test.ts"


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
    M(1, "o e-mail da conta vira o destinatario exibido", UI,
      '<span className="break-all font-medium text-foreground">{item.destination}</span>',
      '<span className="break-all font-medium text-foreground">marcos.tavares@cliente.test</span>',
      "C/D ·", E2E_COM,
      "resolver destinatario por identidade e o erro mais provavel desta superficie"),

    M(2, "o destino do formulario nasce preenchido com a identidade", UI,
      '  const [destino, setDestino] = useState("");',
      '  const [destino, setDestino] = useState("marcos.tavares@cliente.test");',
      "A ·", E2E_COM,
      "pre-preencher com o e-mail de login e a mesma inferencia, so que na escrita"),

    M(3, "o nome do Workspace vira destinatario", UI,
      '<span className="break-all font-medium text-foreground">{item.destination}</span>',
      '<span className="break-all font-medium text-foreground">Atendimento Norte</span>',
      "C/D ·", E2E_COM,
      "Workspace identifica escopo; derivar recipient dele confunde os dois papeis"),

    M(4, "o idioma da interface sobrescreve o da mensagem", UI,
      '              {item.language === "pt" ? t("account.portuguese") : t("account.english")}',
      '              {t("account.english")}',
      "E ·", E2E_COM,
      "sincronizar os dois apaga a intencao congelada de entrega"),

    M(5, "ausencia passa a ser apresentada como indisponibilidade", UI,
      '          <p className="text-sm font-medium text-foreground">{t("notifications.empty")}</p>',
      '          <p className="text-sm font-medium text-foreground">{t("notifications.loadFailed")}</p>',
      "A ·", E2E_COM,
      "dizer 'indisponivel' sobre ausencia manda a pessoa esperar por nada"),

    M(6, "outage passa a ser apresentado como ausencia", UI,
      "  if (lista.isError) {",
      "  if (false) {",
      "B ·", E2E_COM,
      "o eixo da missao: outage virando ausencia faz a tela dizer 'ninguem configurado'"),

    # Inerte na primeira rodada: mexer em `staleTime` nao cria nada. Agora ela POSTA de verdade.
    M(7, "a leitura passa a criar assinatura", HOOK,
      "    queryFn: ({ signal }) =>\n      client.listSubscriptions({ workspaceId: workspaceId as string }, { signal }),",
      "    queryFn: async ({ signal }) => {\n      await client.createSubscription({ workspaceId: workspaceId as string }, { channel: \"email\", destination: \"auto@criado.test\", event_types: [\"analysis.failed\"], language: \"pt\" });\n      return client.listSubscriptions({ workspaceId: workspaceId as string }, { signal });\n    },",
      "A ·", E2E_COM,
      "leitura que muta o mundo faz `ausente` sumir quando alguem abre a tela"),

    M(8, "create usa o rascunho como resposta", HOOK,
      "    onSuccess: () => {\n      void cache.invalidateQueries({",
      "    onSuccess: () => {\n      if (Math.abs(1) === 1) return;\n      void cache.invalidateQueries({",
      "F ·", E2E_COM,
      "a resposta de create NAO e uma view; fabricar a linha poe na tela o que ninguem mandou"),

    M(9, "create afirma sucesso mesmo quando falha", UI,
      "          {criar.isError && (",
      "          {false && (",
      "G ·", E2E_COM,
      "falso sucesso e a pior mentira de um formulario"),

    M(10, "desativar remove a linha", HOOK,
      "              items: atual.items.map((s) =>\n                s.subscription_id === resposta.subscription_id\n                  ? { ...s, active: resposta.active }\n                  : s,\n              ),",
      "              items: atual.items.filter((s) => s.subscription_id !== resposta.subscription_id),",
      "H ·", E2E_COM,
      "disable virando delete faz 'desativei' virar 'nunca configurei'"),

    M(11, "a copy de desativar vira linguagem de exclusao", UI,
      '            {desativando ? t("notifications.disabling") : t("notifications.disableAction")}',
      '            {desativando ? t("notifications.disabling") : "Delete"}',
      "L/M/N/O ·", E2E_COM,
      "o verbo HTTP e DELETE e a semantica e disable; a copy segue a semantica"),

    # Ancora ausente na primeira rodada: `paraExibir` vive no HOOK, nao na UI.
    M(12, "desativada some da lista", HOOK,
      "  return [...itens.filter((s) => s.active), ...itens.filter((s) => !s.active)];",
      "  return itens.filter((s) => s.active);",
      "H ·", E2E_COM,
      "esconder a desativada e a mesma perda de informacao que apaga-la"),

    # Inerte na primeira rodada: mostrar "Turn off" numa linha desativada nao cria um botao
    # chamado "Enable", que e o que o gate procura. Agora ela cria o botao literal.
    M(13, "aparece um botao de reativar", UI,
      "      {!item.active && (\n        <p className=\"pt-3 text-sm text-muted-foreground\" role=\"status\">",
      "      {!item.active && <Button size=\"sm\">Enable</Button>}\n      {!item.active && (\n        <p className=\"pt-3 text-sm text-muted-foreground\" role=\"status\">",
      "L/M/N/O ·", E2E_COM,
      "reativar nao existe no dominio; um botao promete transicao que ninguem implementou"),

    # Inerte: trocar o TEXTO de um chip nao cria botao. Agora ela cria a acao literal.
    M(14, "aparece uma acao de verificar", UI,
      "            {item.channel === \"webhook\" && (\n              <Etiqueta",
      "            {!item.verified_at && <Button size=\"sm\">Verify</Button>}\n            {item.channel === \"webhook\" && (\n              <Etiqueta",
      "L/M/N/O ·", E2E_COM,
      "`verified_at` e estado observado; nomear acao ali inventa protocolo"),

    M(15, "rotate vira desativar+criar", HOOK,
      "    mutationFn: (subscriptionId: string) =>\n      client.rotateSubscriptionSecret(subscriptionId, { workspaceId: workspaceId as string }),",
      "    mutationFn: async (subscriptionId: string) => {\n      await client.disableSubscription(subscriptionId, { workspaceId: workspaceId as string });\n      return client.rotateSubscriptionSecret(subscriptionId, { workspaceId: workspaceId as string });\n    },",
      "J ·", E2E_COM,
      "rotacao preserva identidade; apagar e recriar troca a chave que o historico referencia"),

    M(16, "rotate mostra segredo mesmo quando falha", UI,
      "                  .then((r) => {\n                    if (r.secret) setRevelado({ id: r.subscription_id, secret: r.secret });\n                  })",
      "                  .catch(() => setRevelado({ id: item.subscription_id, secret: \"whsec_inventado\" }))",
      "K ·", E2E_COM,
      "mostrar segredo que o produtor nao emitiu e pior que nao mostrar nenhum"),

    M(17, "o escopo sai da query de listagem", CLI,
      '      pedir<SubscriptionListPage>("GET", "/v1/subscriptions", { workspace_id: scope.workspaceId }, opts),',
      '      pedir<SubscriptionListPage>("GET", "/v1/subscriptions", { workspace_id: "" }, opts),',
      "Q ·", E2E_COM,
      "sem escopo o dono nao sabe de quem e a pergunta"),

    M(18, "o cache deixa de separar workspaces", HOOK,
      '    queryKey: workspaceKeys.subscriptions(workspaceId ?? "idle"),\n    enabled: Boolean(workspaceId),',
      '    queryKey: ["subscriptions"],\n    enabled: Boolean(workspaceId),',
      "E1 ·", ESTRUTURA,
      "chave sem escopo faz a lista do espaco A sobreviver a troca para o B"),

    M(19, "uma URL interna do Dispatcher entra no cliente", CLI,
      '      pedir<SubscriptionListPage>("GET", "/v1/subscriptions", { workspace_id: scope.workspaceId }, opts),',
      '      pedir<SubscriptionListPage>("GET", "/internal/v1/subscriptions", { workspace_id: scope.workspaceId }, opts),',
      "E2 ·", ESTRUTURA,
      "o Front nao conhece o Dispatcher; conhece-lo dissolve a fronteira"),

    M(20, "o segredo vai para o localStorage", UI,
      "      if (criada.secret) setRevelado({ id: criada.subscription_id, secret: criada.secret });",
      "      if (criada.secret) { localStorage.setItem(\"sentinela:secret\", criada.secret); setRevelado({ id: criada.subscription_id, secret: criada.secret }); }",
      "E3 ·", ESTRUTURA,
      "credencial persistida sobrevive a sessao e reaparece sem ninguem pedir"),

    M(21, "o segredo entra no cache de query", HOOK,
      "                  ? { ...s, secret_version: resposta.secret_version, verified_at: null }",
      "                  ? { ...s, secret_version: resposta.secret_version, verified_at: null, ...(resposta.secret ? { destination: resposta.secret } : {}) }",
      "J ·", E2E_COM,
      "cache com gcTime de cinco minutos guarda credencial viva depois da tela fechar"),

    M(22, "o deep link ganha sufixo /result", E2E_RE,
      "const caminhoDaMensagem = (id: string) => `/analyses/${id}`;",
      "const caminhoDaMensagem = (id: string) => `/analyses/${id}/result`;",
      "R1/R2 ·", E2E_RE,
      "o compositor monta um formato so, e /result nao e ele"),

    M(23, "o deep link vira /canonical", E2E_RE,
      "const caminhoDaMensagem = (id: string) => `/analyses/${id}`;",
      "const caminhoDaMensagem = (id: string) => `/canonical/analyses/${id}`;",
      "R1/R2 ·", E2E_RE,
      "`/canonical` e rota interna; usa-la em mensagem vaza nome de implementacao"),

    M(24, "aparece um item de inbox no menu da secao", UI,
      '        <p className="text-sm font-medium text-foreground">{t("notifications.addTitle")}</p>',
      '        <p className="text-sm font-medium text-foreground">Inbox</p>',
      "L/M/N/O ·", E2E_COM,
      "M44 e configuracao e reentrada, nunca centro de mensagens"),

    M(25, "a secao passa a oferecer atualizar", UI,
      "          {item.active && (\n            <Button\n              variant=\"ghost\"\n              size=\"sm\"\n              className=\"min-h-11 rounded-xl border border-border text-muted-foreground hover:text-foreground\"\n              disabled={desativando}",
      "          {item.active && (\n            <Button\n              variant=\"ghost\"\n              size=\"sm\"\n              aria-label=\"Edit\"\n              className=\"min-h-11 rounded-xl border border-border text-muted-foreground hover:text-foreground\"\n              disabled={desativando}",
      "L/M/N/O ·", E2E_COM,
      "nao existe update no contrato"),

    M(26, "os tipos de evento passam a incluir um inventado", HOOK,
      '  "result.available",\n] as const;',
      '  "result.available",\n  "analysis.reviewed",\n] as const;',
      "E5 ·", ESTRUTURA,
      "tipo inventado e recusado pela criacao, e a tela ofereceria o que nao existe"),

    M(27, "a criacao manda workspace_id no corpo", CLI,
      "          body: JSON.stringify({\n            channel: input.channel,",
      "          body: JSON.stringify({\n            workspace_id: scope.workspaceId,\n            channel: input.channel,",
      "F ·", E2E_COM,
      "o Gateway recusa campo a mais; e o corpo discordaria do escopo autorizado"),

    M(28, "o formulario perde a trava de duplo envio", UI,
      "    if (!podeAdicionar || emVoo.current) return;",
      "    if (!podeAdicionar) return;",
      "E4 ·", ESTRUTURA,
      "entre dois cliques o React nao re-renderizou e a segunda escrita sai"),
]


def _ler(p: pathlib.Path) -> str:
    with open(p, encoding="utf-8", newline="") as f:
        return f.read()


def _escrever(p: pathlib.Path, t: str) -> None:
    with open(p, "w", encoding="utf-8", newline="") as f:
        f.write(t)


def _gate_existe(m: Mut) -> bool:
    """O nome do gate casa com algum titulo no spec? Checagem ANTES de rodar.

    `playwright -g NOME_QUE_NAO_EXISTE` nao seleciona nada e pode sair `0`. A saida contendo
    "passed" nao prova que o caso-alvo rodou -- e foi assim que dois gates escritos sem acento
    entraram como SOBREVIVEU na campanha anterior.
    """
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
    # Cinco invariantes nao sao observaveis por browser -- chave de cache, URL interna no cliente,
    # storage, trava de duplo envio e vocabulario. Para eles o gate e ESTRUTURAL, e o motor muda.
    argv = (
        ["npx", "vitest", "run", m.spec, "-t", m.gate]
        if m.spec.endswith(".test.ts")
        else ["npx", "playwright", "test", m.spec, "--reporter=line", "-g", m.gate]
    )
    proc = subprocess.run(
        argv,
        cwd=RAIZ, capture_output=True, text=True, errors="replace",
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
