// A ZONA de um bullet, e a fração de uma posição na régua. Lógica PURA, fora do componente.
//
// Saiu do `Bullet.tsx` pelo mesmo motivo — e com o mesmo precedente — de `PARAM_DOMINIO` ter
// saído do `AbasDeDominio.tsx`: o lint reclamou que um arquivo exportando componente E valor
// quebra o fast refresh, e estava certo por uma razão melhor que a dele. Lógica pura em arquivo
// de componente é lógica que ninguém testa sem montar árvore de React.
//
// A catraca do lint (`lint-catraca.test.ts`) tem teto de 14 warnings e nao se sobe por
// conveniencia: a saida certa era mover, nao afrouxar.

/** Onde o valor caiu. Derivado dos cortes publicados, nunca recebido pronto. */
export type ZonaDoBullet = "ok" | "atencao" | "critico";

export function zonaDoValor(
  valor: number,
  warn: number,
  critical: number,
): ZonaDoBullet {
  const menorEPior = critical < warn;
  if (menorEPior) {
    if (valor < critical) return "critico";
    return valor < warn ? "atencao" : "ok";
  }
  if (valor > critical) return "critico";
  return valor > warn ? "atencao" : "ok";
}

/** Fração 0..1 de uma posição na régua. Fora dos limites GRUDA na borda em vez de vazar. */
export function fracao(v: number, piso: number, teto: number): number {
  if (teto <= piso) return 0;
  return Math.min(1, Math.max(0, (v - piso) / (teto - piso)));
}
