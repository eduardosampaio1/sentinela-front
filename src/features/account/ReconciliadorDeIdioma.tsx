// M41 — o ponto onde o backend passa a mandar no idioma da experiência autenticada.
//
// ## Por que existe um componente só para isto
//
// A alternativa seria o `LanguageProvider` chamar o backend sozinho. Ele não pode: ele monta acima
// do portão de autenticação, para servir a Landing e as páginas legais, onde não há sessão nem
// `QueryClient`. Um provider que tentasse ler `/v1/me/language` ali quebraria a experiência
// anônima para resolver um problema que ela não tem.
//
// Então a reconciliação mora onde a sessão existe: dentro da árvore autenticada.
//
// ## O que ele faz, e o que se recusa a fazer
//
// - **aplica `effective_language`**, que é o idioma que o produto deve usar agora. Não aplica
//   `stored_language`: `null` não é idioma, é ausência de escolha;
// - **não escreve nunca.** Não há `PUT` neste arquivo. Chegar com `pt` no navegador e entrar na
//   conta **não** persiste preferência — a escolha anônima não vira decisão da conta sem um ato
//   explícito, e esse ato mora na tela de Configurações;
// - **não trata erro como resposta.** Se o Account estiver fora do ar, a tela continua no idioma
//   do cache e a preferência fica *desconhecida*. Aplicar `"en"` no erro seria afirmar um default
//   que ninguém confirmou.
//
// Ele não renderiza nada.

import { useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAccountLanguage } from "./data/language";

export function ReconciliadorDeIdioma() {
  const { aplicarPreferenciaDaConta } = useLanguage();
  const { data } = useAccountLanguage();

  useEffect(() => {
    if (!data) return;
    // O backend venceu. Se o cache dizia outra coisa, a tela troca — e é essa a ordem correta:
    // cache é palpite enquanto a resposta não chega, e deixa de ser quando ela chega.
    aplicarPreferenciaDaConta(data.effective_language);
  }, [data, aplicarPreferenciaDaConta]);

  return null;
}
