// CFG-02 — escolher o idioma da experiência autenticada.
//
// ## A pergunta que a seção responde, e por que ela tem duas partes
//
// *"Qual idioma está sendo usado?"* e *"existe uma escolha minha salva?"* são perguntas
// diferentes, e o backend as responde separado. Alguém que nunca abriu esta tela está em inglês
// **porque é o padrão**, não porque escolheu. Dizer "você escolheu English" para essa pessoa é
// afirmar algo que não aconteceu.
//
// Por isso o estado aparece em texto, e não só na marcação do controle: um rádio marcado em
// English tem exatamente a mesma aparência nos dois casos.
//
// ## Por que rádios + Salvar, e não um `select` que salva sozinho
//
// Um `select` já marcado em English não deixa ninguém **escolher** English. Quem está no padrão
// nunca conseguiria registrar a própria preferência — o controle não dispara nada quando o valor
// não muda. Com o botão separado, a ação existe: o alvo é comparado com o que está **salvo**
// (`stored_language`), não com o que está em uso.
//
// ## O que esta seção não faz
//
// Não atualiza otimista. Se o `PUT` falhar depois de a tela dizer "salvo", a pessoa acredita ter
// registrado uma preferência que não existe — e é justamente isso que a BD11 recusa. Quem confirma
// persistência é a resposta.

import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { accountKeys, type EffectiveLanguage } from "@/lib/v1";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  estadoDaPreferencia,
  mudaAPreferencia,
  useAccountLanguage,
  useSalvarIdioma,
} from "./data/language";

const IDIOMAS: readonly EffectiveLanguage[] = ["en", "pt"];

export function SecaoDeIdioma() {
  const { t, aplicarPreferenciaDaConta } = useLanguage();
  const queryClient = useQueryClient();
  const preferencia = useAccountLanguage();
  const salvar = useSalvarIdioma();
  const grupoId = useId();
  const descricaoId = `${grupoId}-estado`;

  const [alvo, setAlvo] = useState<EffectiveLanguage | null>(null);

  // Trava SÍNCRONA contra duplo envio. O `disabled` do botão não basta: entre dois cliques rápidos
  // o React ainda não re-renderizou, `isPending` continua `false` na closure, e a segunda escrita
  // sai. A segunda chega depois — podendo confirmar um estado que a pessoa já abandonou.
  const emVoo = useRef(false);

  // O rádio abre no idioma EM USO — é o que a pessoa está vendo. Quando ela nunca escolheu, isso
  // marca English sem afirmar escolha: quem afirma é o texto de estado, e o botão continua
  // disponível porque a comparação é contra o que está SALVO.
  useEffect(() => {
    if (preferencia.data && alvo === null) setAlvo(preferencia.data.effective_language);
  }, [preferencia.data, alvo]);

  if (preferencia.isPending) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {t("account.loading")}…
      </p>
    );
  }

  // O Account fora do ar. NUNCA apresentar isto como "sem preferência": a escolha da pessoa pode
  // existir e não ter chegado, e dizer "você nunca escolheu" seria uma afirmação sobre ela que o
  // sistema, neste momento, não tem como sustentar.
  if (preferencia.isError || !preferencia.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive" role="alert">
          {t("account.loadFailed")}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11 rounded-xl border border-border text-foreground"
          onClick={() => preferencia.refetch()}
        >
          {t("account.loadRetry")}
        </Button>
      </div>
    );
  }

  const estado = estadoDaPreferencia(preferencia.data);
  const podeSalvar = alvo !== null && mudaAPreferencia(preferencia.data, alvo);

  const frase =
    estado.tipo === "padrao"
      ? t("account.usingDefault")
      : estado.escolhido === "pt"
        ? t("account.savedPortuguese")
        : t("account.savedEnglish");

  async function aoSalvar() {
    if (!alvo || !podeSalvar || salvar.isPending || emVoo.current) return;
    emVoo.current = true;
    try {
      const confirmado = await salvar.mutateAsync(alvo);
    // A resposta do servidor É o estado confirmado. Escrevê-la no cache evita um refetch que
    // diria a mesma coisa, e mantém a autoridade em quem persistiu.
      queryClient.setQueryData(accountKeys.language(), confirmado);
      aplicarPreferenciaDaConta(confirmado.effective_language);
    } finally {
      emVoo.current = false;
    }
  }

  return (
    <div className="space-y-5">
      <fieldset className="space-y-3" disabled={salvar.isPending}>
        <legend className="text-sm text-muted-foreground">{t("account.languageLabel")}</legend>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          {IDIOMAS.map((idioma) => (
            <label
              key={idioma}
              className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted px-4 py-2.5 text-sm text-foreground hover:border-ring focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
            >
              <input
                type="radio"
                name={grupoId}
                value={idioma}
                checked={alvo === idioma}
                onChange={() => setAlvo(idioma)}
                aria-describedby={descricaoId}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span className="flex-1">
                {idioma === "pt" ? t("account.portuguese") : t("account.english")}
              </span>
              {/* A marca da escolha PERSISTIDA, na própria opção.
                  Achado da revisão da captura: sem ela, o estado "usando o padrão" e o estado
                  "escolhi inglês" produziam telas pixel-idênticas exceto por uma linha de texto
                  secundário — o elemento de MENOR ênfase carregando a distinção que a capacidade
                  inteira existe para preservar. Aqui ela aparece no controle, e some por completo
                  quando não há escolha salva. */}
              {estado.tipo === "salva" && estado.escolhido === idioma && (
                // `text-foreground`, e não `text-muted-foreground`: o chip nasceu discreto e
                // ficava em 4.12:1 sobre `bg-muted` — abaixo do 4.5:1 de AA, a 12px. Ninguém
                // tinha visto porque nenhuma suíte rodava axe NESTA página: a da M42 roda na
                // página da Instância, e a de Settings só passou a existir com a M44.
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
                  {t("account.savedTag")}
                </span>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      {/* O estado, em texto. Um rádio marcado em English é idêntico nos dois casos; a frase é o
          que separa "usando o padrão" de "esta é a minha escolha". */}
      <p id={descricaoId} className="text-sm text-muted-foreground">
        {frase}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          onClick={aoSalvar}
          disabled={!podeSalvar || salvar.isPending}
          aria-busy={salvar.isPending}
          className="min-h-11 rounded-xl font-semibold disabled:opacity-50"
        >
          {salvar.isPending ? `${t("account.saving")}…` : t("account.save")}
        </Button>

        {/* `role="status"` para o leitor de tela anunciar sem roubar o foco. Sucesso e erro não
            dependem só de cor — cada um traz a própria frase. */}
        <span role="status" className="text-sm text-[hsl(var(--success))]">
          {salvar.isSuccess && !podeSalvar ? t("account.saved") : ""}
        </span>
        {salvar.isError && (
          <span role="alert" className="text-sm text-destructive">
            {t("account.saveFailed")}
          </span>
        )}
      </div>
    </div>
  );
}
