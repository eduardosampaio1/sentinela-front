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

/**
 * A chave é uma das legadas?
 *
 * `startsWith("sentinela:last_cache_key")` puro era largo demais: pegaria
 * `sentinela:last_cache_keyboard` ou um `sentinela:last_cache_key_v2` legítimo de amanhã.
 * Uma limpeza que apaga o vizinho pelo nome parecido é o mesmo erro do `clear()`, em escala
 * menor — e mais difícil de notar.
 *
 * As duas formas que existiram são a chave EXATA (sem escopo) e a com escopo, que sempre
 * traz `:` depois. `sentinela:analysis:` já termina em `:` e não tem esse problema.
 */
function ehLegada(chave: string): boolean {
  return PREFIXOS_LEGADOS.some((p) =>
    p.endsWith(":") ? chave.startsWith(p) : chave === p || chave.startsWith(`${p}:`),
  );
}

function limparDe(storage: Storage): string[] {
  const alvos: string[] = [];
  // Coleta ANTES de apagar: `sessionStorage.key(i)` reindexa a cada remoção, e apagar dentro
  // do laço pula chaves — o defeito silencioso clássico deste padrão.
  for (let i = 0; i < storage.length; i += 1) {
    const chave = storage.key(i);
    if (chave && ehLegada(chave)) alvos.push(chave);
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
  // O ACESSO ao getter vai DENTRO do `try`.
  //
  // `globalThis.sessionStorage` não é um campo: é um getter que o navegador pode fazer lançar
  // `SecurityError` quando o storage está bloqueado (modo privado, cookies de terceiros
  // desligados). Montar o array `[globalThis.sessionStorage, globalThis.localStorage]` antes
  // do `try` deixava a exceção escapar — e como `main.tsx` chama isto ANTES do render, o app
  // não subia. A promessa "nunca lança" era mais forte que o código.
  for (const obter of [() => globalThis.sessionStorage, () => globalThis.localStorage]) {
    try {
      const storage = obter();
      if (storage) removidas.push(...limparDe(storage));
    } catch {
      // storage indisponível: nada a limpar aqui, e nada a derrubar.
    }
  }
  return removidas;
}
