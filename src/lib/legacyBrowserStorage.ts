// Limpeza defensiva das chaves legadas do cache de resultado.
//
// O código que gravava `AnalysisResult` no `sessionStorage` foi removido — mas remover o
// escritor não apaga o que ele já escreveu. Quem usou o app antes desta versão tem, agora
// mesmo, uma cópia do resultado na máquina, e nenhum purge do servidor a alcança.
//
// Esta função apaga essas chaves no arranque, uma vez.
//
// ## Por que `removeItem` e nunca `clear()`
//
// `clear()` apagaria o storage inteiro: o estado de terceiros na mesma origem, e o estado
// legítimo da própria aplicação. Apagar dado alheio para limpar o nosso troca um problema de
// privacidade por um de corretude. Aqui só saem chaves que ESTE app criou, reconhecidas pelos
// prefixos que ele mesmo usava.
//
// ## Por que prefixo, e não uma lista fixa
//
// As chaves antigas carregavam sufixo dinâmico (`sentinela:analysis:<hash-ou-id>` e
// `sentinela:last_cache_key:<ws>:<proj>:<env>`). Uma lista fixa de nomes não alcançaria
// nenhuma delas — e passaria verde, que é a pior combinação.

/** Prefixos das chaves que o cache de resultado criava. Nada fora daqui é tocado. */
export const PREFIXOS_LEGADOS = [
  "sentinela:analysis:", // o `AnalysisResult` inteiro, serializado
  "sentinela:last_cache_key", // o ponteiro para a chave acima (com e sem escopo)
] as const;

function limparDe(storage: Storage): string[] {
  const alvos: string[] = [];
  // Coleta ANTES de apagar: `sessionStorage.key(i)` reindexa a cada remoção, e apagar dentro
  // do laço pula chaves — o defeito silencioso clássico deste padrão.
  for (let i = 0; i < storage.length; i += 1) {
    const chave = storage.key(i);
    if (chave && PREFIXOS_LEGADOS.some((p) => chave.startsWith(p))) alvos.push(chave);
  }
  for (const chave of alvos) storage.removeItem(chave);
  return alvos;
}

/**
 * Apaga as chaves legadas de resultado do `sessionStorage` e do `localStorage`.
 *
 * Devolve as chaves removidas (o teste precisa afirmar QUAIS saíram, não só que algo saiu).
 *
 * Nunca lança: um `SecurityError` de storage bloqueado (modo privado, cookies de terceiros
 * desligados) não pode impedir o app de subir. Falhar aqui deixaria o usuário sem aplicação
 * por causa de uma limpeza — pior do que a sujeira que ela remove.
 */
export function limparResultadosLegadosDoNavegador(): string[] {
  const removidas: string[] = [];
  for (const storage of [globalThis.sessionStorage, globalThis.localStorage]) {
    try {
      if (storage) removidas.push(...limparDe(storage));
    } catch {
      // storage indisponível: nada a limpar aqui, e nada a derrubar.
    }
  }
  return removidas;
}
