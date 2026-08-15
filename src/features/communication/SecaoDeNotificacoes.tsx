// M44 · COM-01 — a comunicação autorizada do Workspace.
//
// ## O que esta seção é, e o que ela recusa ser
//
// Configuração: *para onde avisamos, em que língua, e sobre o quê*. **Não** é caixa de entrada —
// não há lista de mensagens, contador de não-lidas, badge nem histórico. A M44 entrega
// configuração e reentrada; o conteúdo do aviso vive na Analysis, para onde o link leva.
//
// ## As três leituras que não podem colapsar
//
//     lista vazia   → ninguém configurado ainda   (ausência LEGÍTIMA)
//     503           → não consegui perguntar      (INDISPONIBILIDADE)
//     lista com item→ configurado
//
// Normalizar as duas primeiras para "vazio" é o defeito que esta seção existe para não cometer:
// a tela diria *"ninguém está sendo avisado"* no dia em que o dono caiu, e alguém reconfiguraria
// por cima de uma configuração que existe.
//
// ## Duas fontes plausíveis e erradas
//
// O e-mail da conta e a preferência de idioma da conta estão a um passo daqui, e usar qualquer uma
// não daria erro — daria o valor errado com `200`. Por isso este arquivo não importa nada de
// Account, e há gate estrutural provando a ausência.

import { useId, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { SubscriptionChannel, SubscriptionView } from "@/lib/v1";
import {
  TIPOS_DE_EVENTO,
  destinoPreenchido,
  paraExibir,
  temEvento,
  useCriarSubscription,
  useDesativarSubscription,
  useRotacionarSegredo,
  useSubscriptions,
} from "./data/subscriptions";

/**
 * O rótulo de produto de cada tipo de evento. O Front não traduz um tipo em outro — ele só nomeia,
 * em linguagem de gente, o que o contrato já declara.
 *
 * `switch` com chaves LITERAIS, e não um mapa `tipo → chave`. O mapa era mais curto e deixava o
 * gate de i18n cego: `t(MAPA[tipo])` é chave opaca, e o rastreador não consegue dizer se
 * `notifications.eventFailed` ainda tem consumidor. O tipo que não conhecemos cai no próprio
 * identificador, que é honesto — inventar rótulo para um evento novo seria pior.
 */
function rotuloDoEvento(tipo: string, t: (k: string) => string): string {
  switch (tipo) {
    case "analysis.completed":
      return t("notifications.eventCompleted");
    case "analysis.failed":
      return t("notifications.eventFailed");
    case "result.available":
      return t("notifications.eventResultAvailable");
    default:
      return tipo;
  }
}

function Etiqueta({ texto, tom }: { texto: string; tom: "ativo" | "off" | "neutro" }) {
  const cor =
    tom === "ativo"
      ? "border-primary/40 text-foreground"
      : tom === "off"
        ? "border-border text-muted-foreground"
        : "border-border text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${cor}`}>
      {texto}
    </span>
  );
}

/** Uma assinatura configurada. Só leitura + as duas operações públicas que agem sobre ela. */
function Linha({
  item,
  onDesativar,
  onRotacionar,
  desativando,
  rotacionando,
  erroDeDesativar,
  erroDeRotacionar,
  segredoRevelado,
}: {
  item: SubscriptionView;
  onDesativar: () => void;
  onRotacionar: () => void;
  desativando: boolean;
  rotacionando: boolean;
  erroDeDesativar: boolean;
  erroDeRotacionar: boolean;
  segredoRevelado: string | null;
}) {
  const { t } = useLanguage();


  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta texto={item.channel === "email" ? t("notifications.channelEmail") : t("notifications.channelWebhook")} tom="neutro" />
            {/* O estado vem do produtor. `active: false` NÃO some da lista: o dono preserva a
                linha, e escondê-la faria "desativei" virar "nunca configurei". */}
            <Etiqueta
              texto={item.active ? t("notifications.stateActive") : t("notifications.stateOff")}
              tom={item.active ? "ativo" : "off"}
            />
          </div>

          <p className="text-sm text-muted-foreground">
            {t("notifications.sendsTo")}{" "}
            {/* O destino vem da ASSINATURA. Nunca da identidade de quem está olhando. */}
            <span className="break-all font-medium text-foreground">{item.destination}</span>
          </p>

          <p className="text-sm text-muted-foreground">
            {t("notifications.sendsOn")}{" "}
            <span className="text-foreground">
              {item.event_types.map((e) => rotuloDoEvento(e, t)).join(" · ")}
            </span>
          </p>

          <p className="text-sm text-muted-foreground">
            {t("notifications.messageLanguage")}{" "}
            <span className="text-foreground">
              {item.language === "pt" ? t("account.portuguese") : t("account.english")}
            </span>
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* `verified_at` é estado OBSERVADO de uma entrega aceita — não é passo pendente, e
                por isso não há botão nenhum ao lado dele. */}
            <Etiqueta
              texto={item.verified_at ? t("notifications.delivered") : t("notifications.notDelivered")}
              tom="neutro"
            />
            {item.channel === "webhook" && (
              <Etiqueta
                texto={t("notifications.keyVersion", { n: item.secret_version })}
                tom="neutro"
              />
            )}
          </div>
        </div>

        {/* D1/D2 — as duas ações no MESMO peso, e ambas discretas.
            "Turn off" nasceu `outline` e era o elemento de maior contraste da linha: o olho ia
            no botão de desligar antes de ir em para ONDE avisamos, que é a informação que a
            pessoa veio ver. Ação de baixa frequência com a maior ênfase é hierarquia invertida.
            E "New signing key" era `ghost` puro — sem moldura, não lia como clicável. */}
        <div className="flex shrink-0 flex-col items-end gap-1">
          {/* Desativar só existe enquanto está ativa: o dono recusa reativar
              (`reativacao_nao_suportada`), então um botão sobre uma linha já desativada
              prometeria uma transição que ninguém implementou. */}
          {item.active && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 rounded-xl border border-border text-muted-foreground hover:text-foreground"
              disabled={desativando}
              onClick={onDesativar}
            >
              {desativando ? t("notifications.disabling") : t("notifications.disableAction")}
            </Button>
          )}
          {/* Rotacionar só faz sentido em webhook — e-mail não tem chave, e o dono recusa. */}
          {item.channel === "webhook" && item.active && (
            <Button
              variant="ghost"
              size="sm"
              className="min-h-11 rounded-xl border border-border text-muted-foreground hover:text-foreground"
              disabled={rotacionando}
              onClick={onRotacionar}
            >
              {rotacionando ? t("notifications.rotating") : t("notifications.rotateAction")}
            </Button>
          )}
        </div>
      </div>

      {!item.active && (
        <p className="pt-3 text-sm text-muted-foreground" role="status">
          {t("notifications.disabled")}
        </p>
      )}

      {erroDeDesativar && (
        <p className="pt-3 text-sm text-destructive" role="alert">
          {t("notifications.disableFailed")}
        </p>
      )}
      {erroDeRotacionar && (
        <p className="pt-3 text-sm text-destructive" role="alert">
          {t("notifications.rotateFailed")}
        </p>
      )}

      {/* O material sai UMA vez. Ele vive em estado local do componente e não entra no cache —
          um `gcTime` de cinco minutos guardaria credencial viva muito depois de a pessoa sair
          da tela, e ela reapareceria numa remontagem sem ninguém ter pedido. */}
      {segredoRevelado && (
        <div className="mt-3 rounded-xl border-2 border-primary/70 bg-muted/40 p-3" role="status">
          <p className="text-sm font-medium text-foreground">{t("notifications.rotated")}</p>
          {/* D3 — a frase "aparece uma vez só" ganha o peso do que ela descreve. Ela some com o
              componente e não volta; dizê-la em texto secundário a igualava a uma nota. NÃO há
              botão de copiar: clipboard só entra com authority, e conveniência não é authority. */}
          <p className="pt-1 text-sm font-medium text-foreground">{t("notifications.rotateOnce")}</p>
          <code className="mt-2 block break-all rounded-lg bg-background px-3 py-2 text-xs text-foreground">
            {segredoRevelado}
          </code>
        </div>
      )}
    </li>
  );
}

export function SecaoDeNotificacoes({ workspaceId }: { workspaceId: string | null }) {
  const { t } = useLanguage();
  const lista = useSubscriptions(workspaceId);
  const criar = useCriarSubscription(workspaceId);
  const desativar = useDesativarSubscription(workspaceId);
  const rotacionar = useRotacionarSegredo(workspaceId);

  const idCanal = useId();
  const idDestino = useId();
  const idIdioma = useId();

  const [canal, setCanal] = useState<SubscriptionChannel>("email");
  const [destino, setDestino] = useState("");
  const [eventos, setEventos] = useState<string[]>(["analysis.completed", "analysis.failed"]);
  const [idioma, setIdioma] = useState<"pt" | "en">("pt");
  const [tocouEmSalvar, setTocouEmSalvar] = useState(false);
  // Qual linha revelou segredo agora, e qual material. Estado LOCAL, e some ao desmontar.
  const [revelado, setRevelado] = useState<{ id: string; secret: string } | null>(null);
  // Trava síncrona de duplo envio: entre dois cliques rápidos o React ainda não re-renderizou e
  // `isPending` continua `false` na closure — a segunda escrita sairia.
  const emVoo = useRef(false);

  if (!workspaceId) {
    return <p className="text-sm text-muted-foreground">{t("notifications.noContext")}</p>;
  }

  if (lista.isPending) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {t("notifications.loading")}
      </p>
    );
  }

  // INDISPONIBILIDADE. Nunca "ninguém configurado": o dono não respondeu, e não sabemos.
  if (lista.isError) {
    return (
      <div className="space-y-3" role="alert">
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          {t("notifications.loadFailed")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 rounded-xl"
          onClick={() => void lista.refetch()}
        >
          {t("notifications.loadRetry")}
        </Button>
      </div>
    );
  }

  const itens = paraExibir(lista.data.items);
  const destinoOk = destinoPreenchido(destino);
  const eventosOk = temEvento(eventos);
  const podeAdicionar = destinoOk && eventosOk && !criar.isPending;

  function alternarEvento(tipo: string) {
    setEventos((atual) =>
      atual.includes(tipo) ? atual.filter((e) => e !== tipo) : [...atual, tipo],
    );
  }

  async function adicionar(evento: React.FormEvent) {
    evento.preventDefault();
    setTocouEmSalvar(true);
    if (!podeAdicionar || emVoo.current) return;
    emVoo.current = true;
    try {
      const criada = await criar.mutateAsync({
        channel: canal,
        destination: destino.trim(),
        event_types: eventos,
        language: idioma,
      });
      // O rascunho só é descartado DEPOIS da confirmação. Se o `POST` falhar, o que a pessoa
      // digitou continua ali para tentar de novo.
      setDestino("");
      setTocouEmSalvar(false);
      // `secret` é `null` para e-mail — a chave existe sempre, e é o `null` que diz "não tem".
      if (criada.secret) setRevelado({ id: criada.subscription_id, secret: criada.secret });
    } catch {
      // O estado de erro vem do `mutation`; aqui só liberamos a trava.
    } finally {
      emVoo.current = false;
    }
  }

  return (
    <div className="space-y-6">
      {itens.length === 0 ? (
        // AUSÊNCIA — legítima, e dita como tal. Não é erro e não é "desligado com sucesso".
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">{t("notifications.empty")}</p>
          <p className="text-sm text-muted-foreground">{t("notifications.emptyBody")}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {itens.map((item) => (
            <Linha
              key={item.subscription_id}
              item={item}
              desativando={desativar.isPending && desativar.variables === item.subscription_id}
              rotacionando={rotacionar.isPending && rotacionar.variables === item.subscription_id}
              erroDeDesativar={desativar.isError && desativar.variables === item.subscription_id}
              erroDeRotacionar={rotacionar.isError && rotacionar.variables === item.subscription_id}
              segredoRevelado={revelado?.id === item.subscription_id ? revelado.secret : null}
              onDesativar={() => {
                if (emVoo.current) return;
                emVoo.current = true;
                void desativar
                  .mutateAsync(item.subscription_id)
                  .catch(() => undefined)
                  .finally(() => {
                    emVoo.current = false;
                  });
              }}
              onRotacionar={() => {
                if (emVoo.current) return;
                emVoo.current = true;
                void rotacionar
                  .mutateAsync(item.subscription_id)
                  .then((r) => {
                    if (r.secret) setRevelado({ id: r.subscription_id, secret: r.secret });
                  })
                  .catch(() => undefined)
                  .finally(() => {
                    emVoo.current = false;
                  });
              }}
            />
          ))}
        </ul>
      )}

      <form className="space-y-4 border-t border-border pt-5" onSubmit={adicionar} aria-busy={criar.isPending}>
        <p className="text-sm font-medium text-foreground">{t("notifications.addTitle")}</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={idCanal} className="block text-sm text-muted-foreground">
              {t("notifications.howLabel")}
            </label>
            <select
              id={idCanal}
              value={canal}
              onChange={(e) => setCanal(e.target.value as SubscriptionChannel)}
              className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ring"
            >
              {/* Os DOIS canais do enum, e só eles. */}
              <option value="email">{t("notifications.channelEmail")}</option>
              <option value="webhook">{t("notifications.channelWebhook")}</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor={idDestino} className="block text-sm text-muted-foreground">
              {canal === "email" ? t("notifications.whereEmail") : t("notifications.whereWebhook")}
            </label>
            <input
              id={idDestino}
              type="text"
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              disabled={criar.isPending}
              aria-invalid={tocouEmSalvar && !destinoOk ? true : undefined}
              aria-describedby={tocouEmSalvar && !destinoOk ? `${idDestino}-erro` : undefined}
              className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ring disabled:opacity-60"
            />
            {tocouEmSalvar && !destinoOk && (
              <p id={`${idDestino}-erro`} className="text-sm text-destructive" role="alert">
                {t("notifications.whereRequired")}
              </p>
            )}
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm text-muted-foreground">{t("notifications.sendsOn")}</legend>
          <div className="flex flex-wrap gap-4 pt-1">
            {TIPOS_DE_EVENTO.map((tipo) => (
              <label key={tipo} className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={eventos.includes(tipo)}
                  onChange={() => alternarEvento(tipo)}
                  disabled={criar.isPending}
                  className="h-4 w-4"
                />
                {rotuloDoEvento(tipo, t)}
              </label>
            ))}
          </div>
          {tocouEmSalvar && !eventosOk && (
            <p className="text-sm text-destructive" role="alert">
              {t("notifications.eventsRequired")}
            </p>
          )}
        </fieldset>

        <div className="space-y-2">
          <label htmlFor={idIdioma} className="block text-sm text-muted-foreground">
            {t("notifications.messageLanguage")}
          </label>
          <select
            id={idIdioma}
            value={idioma}
            onChange={(e) => setIdioma(e.target.value as "pt" | "en")}
            aria-describedby={`${idIdioma}-ajuda`}
            className="min-h-11 w-full rounded-xl border border-border bg-muted px-4 text-sm text-foreground focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-ring sm:max-w-xs"
          >
            <option value="pt">{t("account.portuguese")}</option>
            <option value="en">{t("account.english")}</option>
          </select>
          {/* A frase existe para matar a inferência de sincronização: são dois estados, e eles
              divergem legitimamente. */}
          <p id={`${idIdioma}-ajuda`} className="text-sm text-muted-foreground">
            {t("notifications.languageHelp")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="sm" className="min-h-11 rounded-xl" disabled={!podeAdicionar}>
            {criar.isPending ? t("notifications.adding") : t("notifications.addAction")}
          </Button>
          {criar.isError && (
            <p className="text-sm text-destructive" role="alert">
              {t("notifications.addFailed")}
            </p>
          )}
          {criar.isSuccess && !criar.isPending && (
            <p className="text-sm text-muted-foreground" role="status">
              {t("notifications.added")}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
