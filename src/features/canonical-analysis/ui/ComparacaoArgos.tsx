// M39 · EVO-02 — a apresentação da comparação ARGOS.
//
// A UI apresenta o veredito da regra; ela não decide o que comparação significa. Tudo o que ela
// mostra veio de `comparacao.ts` ou do documento publicado.
//
// ## As duas famílias são SEPARADAS na tela
//
// Indicadores e dimensões de saúde não entram na mesma tabela. São conjuntos com identidades e
// significados diferentes, e achatá-los num array só faria a leitura perder qual é qual —
// exatamente o que o v3 desfez no backend.
//
// ## O que a tela nunca escreve
//
// Nenhuma diferença, seta, percentual ou direção. **A e B são posições, não tempo**: a rota não
// publica ordem cronológica, e nomear um de "anterior" seria inventá-la.

import { useLanguage } from "@/contexts/LanguageContext";
import type {
  ComparacaoArgos as Comparacao,
  MedicaoComparada,
  ParArgos,
} from "../result/comparacao";
import {
  apresentacaoDaMedicao,
  apresentacaoDoIndicador,
  motivoRelevante,
  unidadeInforma,
  valorEscrito,
} from "../result/medicaoV3";
import { descriptorDe } from "../result/descriptors";

/** Um lado do par, escrito. `null` quando aquele lado não tem a medição. */
function Lado({ medicao }: { readonly medicao: MedicaoComparada | null }) {
  const { t, language } = useLanguage();

  if (medicao === null) {
    return (
      <span className="text-sm text-muted-foreground" data-lado="ausente">
        {t("canonicalAnalysis.compare.absentSide")}
      </span>
    );
  }

  const valor = valorEscrito(medicao, language);
  if (valor === null) {
    // Sem valor: o ESTADO ocupa o lugar do número. Nunca zero, nunca travessão — o contrato tem
    // palavra própria, e ela é o que a pessoa precisa ler.
    // Dois `t()` com template de PREFIXO ESTÁTICO, e não um `t(chave)` com variável: a catraca
    // M14 congela as chamadas opacas em nove, e uma décima torna a orfandade de tradução ainda
    // menos decidível. É o mesmo defeito que a M39 custou a diagnosticar da primeira vez.
    const texto =
      "state" in medicao
        ? t(`canonicalAnalysis.argos.state.${medicao.state}`)
        : t(`canonicalAnalysis.argos.availability.${medicao.availability}`);
    return (
      <span className="text-sm font-medium text-muted-foreground" data-lado="sem-valor">
        {texto}
      </span>
    );
  }

  const unidade = unidadeInforma(medicao.unit, medicao.scale) ? medicao.unit : null;
  // As duas famílias declaram o estado em campos DIFERENTES: o indicador em `state`, a dimensão
  // em `availability`. A primeira versão usava só `apresentacaoDaMedicao` com um `as never`, e o
  // cast escondeu o erro: para todo indicador `availability` vinha `undefined`, nada era
  // "available", e a tela carimbava "medido por inteiro" em CADA linha — ruído que ainda por
  // cima esvazia o significado da ressalva quando ela for de verdade.
  const ressalvado =
    "state" in medicao
      ? apresentacaoDoIndicador(medicao) === "ressalvada"
      : apresentacaoDaMedicao(medicao) === "ressalvada";

  return (
    <span className="flex flex-wrap items-baseline gap-1.5" data-lado="valor">
      <span className="text-base font-semibold tabular-nums">{valor}</span>
      {unidade ? <span className="text-xs text-muted-foreground">{unidade}</span> : null}
      {/* Ressalva viaja junto do número, sempre — e SÓ quando há ressalva. Um valor parcial
          apresentado como completo é pior que ausência, porque ninguém desconfia dele. */}
      {ressalvado && motivoRelevante(medicao.reason) ? (
        <span className="text-xs text-amber-700 dark:text-amber-300" data-ressalva="true">
          {t(`canonicalAnalysis.argos.reason.${medicao.reason}`)}
        </span>
      ) : null}
    </span>
  );
}

function Par({ par, rotulo }: { readonly par: ParArgos; readonly rotulo: string }) {
  const { t } = useLanguage();
  const incompativel = par.estado === "incompativel";

  return (
    <li
      className="grid grid-cols-1 gap-1 border-b border-border/60 py-3 last:border-b-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-baseline sm:gap-3"
      data-estado={par.estado}
    >
      <span className="text-sm text-muted-foreground">{rotulo}</span>
      <span className="flex items-baseline gap-2">
        <span className="text-xs uppercase text-muted-foreground sm:hidden">
          {t("canonicalAnalysis.compare.sideA")}
        </span>
        <Lado medicao={par.a} />
      </span>
      <span className="flex items-baseline gap-2">
        <span className="text-xs uppercase text-muted-foreground sm:hidden">
          {t("canonicalAnalysis.compare.sideB")}
        </span>
        <Lado medicao={par.b} />
      </span>
      {/* O motivo é o que separa "não comparável" de "vazio". Sem ele a linha vira um enigma. */}
      {incompativel && par.motivo ? (
        <span className="text-xs text-muted-foreground sm:col-span-3">
          {t(`canonicalAnalysis.compare.reason.${par.motivo}`)}
        </span>
      ) : null}
      {par.estado === "so_em_a" || par.estado === "so_em_b" ? (
        <span className="text-xs text-muted-foreground sm:col-span-3">
          {t(`canonicalAnalysis.compare.presence.${par.estado}`)}
        </span>
      ) : null}
    </li>
  );
}

function Familia({
  id,
  titulo,
  pares,
  rotuloDe,
}: {
  readonly id: string;
  readonly titulo: string;
  readonly pares: readonly ParArgos[];
  readonly rotuloDe: (par: ParArgos) => string;
}) {
  const { t } = useLanguage();
  return (
    <section aria-labelledby={id} className="space-y-1">
      <h2 id={id} className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </h2>
      {/* Cabeçalho A/B só a partir de `sm`: no mobile cada lado carrega o próprio rótulo, porque
          três colunas de 375px transformariam número em reticências. */}
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b border-border pb-1 text-xs uppercase text-muted-foreground sm:grid">
        <span />
        <span>{t("canonicalAnalysis.compare.sideA")}</span>
        <span>{t("canonicalAnalysis.compare.sideB")}</span>
      </div>
      {pares.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">
          {t("canonicalAnalysis.compare.familyAbsent")}
        </p>
      ) : (
        <ul className="mt-1">
          {pares.map((p) => (
            <Par key={p.id} par={p} rotulo={rotuloDe(p)} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function ComparacaoArgos({ comparacao }: { readonly comparacao: Comparacao }) {
  const { t } = useLanguage();

  if (!comparacao.documentosComparaveis) {
    // DESCONTINUIDADE, e ela não pode parecer "não houve diferenças". Uma tabela vazia aqui
    // seria a pior saída: os ids até batem dos dois lados, e é justamente por isso que alguém
    // leria as linhas assumindo que valem.
    return (
      <div role="status" className="space-y-2 rounded-md border border-border p-4">
        <p className="text-sm font-medium">{t("canonicalAnalysis.compare.breakTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("canonicalAnalysis.compare.breakBody")}</p>
        {comparacao.campoQueQuebrou ? (
          <p className="text-xs text-muted-foreground">
            <code>{comparacao.campoQueQuebrou}</code>
          </p>
        ) : null}
      </div>
    );
  }

  /** Rótulo do indicador: publicado quando há descritor, `id` cru quando não há. */
  const rotuloDoIndicador = (p: ParArgos) =>
    descriptorDe(p.id) ? t(`canonicalAnalysis.result.indicator.${p.id}.label`) : p.id;

  return (
    // A ORDEM É A MESMA DA VISÃO ARGOS: dimensões primeiro, indicadores depois.
    //
    // Estava invertida — a comparação abria por indicadores. São as duas MESMAS seções que a
    // `ArgosView` mostra na ordem oposta, e quem aprende "dimensões, depois indicadores" olhando
    // uma análise reencontra o inverso ao comparar duas. As quatro dimensões são o resumo; os 39
    // indicadores são o detalhe, e resumo antes de detalhe é a leitura que a visão já ensina.
    <div className="space-y-8">
      <Familia
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
      />
    </div>
  );
}
