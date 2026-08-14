// M41 · CFG-02 — a preferência de idioma da conta, lida e escrita pela fronteira PÚBLICA.
//
// ## O que este arquivo não faz, e é o mais importante
//
// **Não resolve `stored → effective`.** Quem possui essa semântica é o `sentinela-account`;
// recalculá-la aqui faria a tela decidir produto. O Front transporta as duas chaves como vieram.
//
// **Não colapsa `null` em `"en"`.** Um `stored ?? effective` ou um `stored || "en"` faz
// *"ainda não escolheu"* virar *"escolheu inglês"* — e não quebra nada: a tela monta, o seletor
// mostra English, e o produto passa a afirmar uma escolha que a pessoa nunca fez. Por isso o
// view-model abaixo carrega os três estados por NOME, e não por valor derivado.
//
// **Não fala com o Account.** O Front fala com o Gateway, e só. Sem URL interna, sem token
// interno, sem `user_subject` — o usuário é o do contexto autenticado.
//
// **Não escreve sozinho.** Nenhum efeito deste módulo dispara `PUT`. Ler nunca escreve, e entrar
// na conta com um idioma no navegador não persiste preferência nenhuma.

import { useMutation, useQuery, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import {
  accountKeys,
  type EffectiveLanguage,
  type LanguagePreferenceView,
  type MeView,
} from "@/lib/v1";
import { useV1Client } from "@/features/canonical-analysis/data/client";

/**
 * CFG-01 — a identidade da conta, do MESMO cliente público que todo o resto usa.
 *
 * Chave irmã da preferência, e não pai dela: as duas falham de formas diferentes, e é isso que
 * permite a tela continuar mostrando quem você é quando a preferência não carrega.
 */
export function useContaDoUsuario(): UseQueryResult<MeView> {
  const client = useV1Client();
  return useQuery({
    queryKey: accountKeys.me(),
    queryFn: ({ signal }) => client.me({ signal }),
    staleTime: 5 * 60_000,
  });
}

/**
 * Os três estados da preferência, nomeados.
 *
 * Existe porque `stored_language: null` e `stored_language: "en"` produzem a MESMA tela se alguém
 * comparar só `effective_language` — e a diferença entre elas é a razão de a BD11 existir.
 */
export type EstadoDaPreferencia =
  /** Nunca escolheu. O produto usa o default, e isso não é uma decisão da pessoa. */
  | { tipo: "padrao"; emUso: EffectiveLanguage }
  /** Escolheu, e é isto que está salvo. */
  | { tipo: "salva"; escolhido: EffectiveLanguage; emUso: EffectiveLanguage };

/** A projeção do view-model. Recebe a resposta como veio e NÃO deriva `stored` de `effective`. */
export function estadoDaPreferencia(p: LanguagePreferenceView): EstadoDaPreferencia {
  return p.stored_language === null
    ? { tipo: "padrao", emUso: p.effective_language }
    : { tipo: "salva", escolhido: p.stored_language, emUso: p.effective_language };
}

/**
 * Existe mudança a PERSISTIR se eu escolher `alvo`?
 *
 * A comparação é contra `stored_language`, **nunca** contra `effective_language`. O caso que
 * separa os dois é o único que importa: quem está em `stored: null` / `effective: "en"` e escolhe
 * inglês **está mudando alguma coisa** — passa a ter uma escolha salva. Comparar por `effective`
 * concluiria "é o mesmo valor" e deixaria essa pessoa sem como registrar a própria preferência.
 */
export function mudaAPreferencia(p: LanguagePreferenceView, alvo: EffectiveLanguage): boolean {
  return p.stored_language !== alvo;
}

/** A leitura. Não escreve, e não inventa valor quando falha — quem falha devolve erro. */
export function useAccountLanguage(): UseQueryResult<LanguagePreferenceView> {
  const client = useV1Client();
  return useQuery({
    queryKey: accountKeys.language(),
    queryFn: ({ signal }) => client.meLanguage({ signal }),
    // Indisponibilidade do Account não pode virar "sem preferência". Deixar o erro subir é o que
    // permite a tela dizer *não consegui carregar* em vez de *você nunca escolheu*.
    retry: false,
    staleTime: 60_000,
  });
}

/**
 * A escrita. **A resposta do servidor é a autoridade** — não há atualização otimista.
 *
 * Otimismo aqui custaria caro: se o `PUT` falhar depois de a tela já mostrar "salvo em Português",
 * a pessoa acredita que registrou uma preferência que não existe. O estado confirmado só muda com
 * a resposta, e é ela que entra no cache.
 */
export function useSalvarIdioma(): UseMutationResult<
  LanguagePreferenceView,
  unknown,
  EffectiveLanguage
> {
  const client = useV1Client();
  return useMutation({
    mutationFn: (idioma: EffectiveLanguage) => client.setMeLanguage(idioma),
  });
}
