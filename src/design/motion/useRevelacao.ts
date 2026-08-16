// O laço React da revelação.
//
// Existe separado de `revelacao.ts` por uma razão prática: o motor é DOM puro e precisa continuar
// testável sem montar árvore React, e a folha de fronteira do DS reprova acoplamento desnecessário.
// Aqui mora só o ciclo de vida.

import { useEffect, useRef } from "react";
import { observarRevelacao } from "./revelacao";

/**
 * Liga a revelação dentro de um contêiner e devolve o `ref` para prendê-lo.
 *
 * `chave` é o que faz isto funcionar com dado assíncrono. O conteúdo que chega depois de uma
 * requisição não existia quando o efeito rodou, e um observador montado sobre a árvore vazia não
 * observa nada — a tela carrega e fica parada. Passar o que mudou (um identificador, um
 * contador, o estado da carga) remonta o observador sobre a árvore nova.
 *
 * O retorno de `observarRevelacao` é a desinscrição, e devolvê-lo direto do efeito é o que
 * garante que trocar de rota não deixe observadores vivos sobre nós desmontados.
 */
export function useRevelacao<T extends HTMLElement>(chave?: unknown) {
  const ref = useRef<T>(null);

  useEffect(() => observarRevelacao(ref.current), [chave]);

  return ref;
}
