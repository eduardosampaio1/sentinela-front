// M18 — a porta do catálogo: um cenário é pedido pelo NOME, e só.
//
// ## Por que pedir por nome, e não montar handlers na chamada
//
// Um cenário montado no ponto de uso é um cenário que existe uma vez. O próximo teste monta
// parecido, o Storybook monta um terceiro jeito, e três semanas depois ninguém sabe qual deles
// representa o backend. O nome é o que faz `analytics-withheld` significar a mesma coisa em
// qualquer lugar que o peça.
//
// ## Por que o bloqueado LANÇA
//
// Devolver handlers vazios para um cenário bloqueado seria pior que não tê-lo: a tela montaria,
// mostraria estado vazio, e "não existe delta de backend para isto" viraria "não há dados". Quem
// pede um bloqueado recebe a razão na cara, com o nome do blocker.

import type { HttpHandler } from "msw";
import { CATALOGO, type EstadoDoScenario, type Scenario } from "./catalogo";

export { CATALOGO } from "./catalogo";
export type { EstadoDoScenario, Scenario } from "./catalogo";

/** Erro de uso do catálogo. Tipado para que um teste consiga afirmar o motivo, não só a mensagem. */
export class ScenarioIndisponivel extends Error {
  constructor(
    readonly id: string,
    readonly estado: EstadoDoScenario | "inexistente",
    mensagem: string,
  ) {
    super(mensagem);
    this.name = "ScenarioIndisponivel";
  }
}

const PORNOME = new Map<string, Scenario>();
for (const s of CATALOGO) {
  // Nome duplicado é ambiguidade silenciosa: o segundo venceria o primeiro num `Map`, e metade
  // dos consumidores passaria a receber outro cenário sem nada mudar na chamada deles.
  if (PORNOME.has(s.id)) {
    throw new Error(`catálogo de scenarios com id duplicado: \`${s.id}\``);
  }
  PORNOME.set(s.id, s);
}

export const NOMES: readonly string[] = CATALOGO.map((s) => s.id);

export const nomesPorEstado = (estado: EstadoDoScenario): readonly string[] =>
  CATALOGO.filter((s) => s.estado === estado).map((s) => s.id);

/** O cenário declarado, sem julgar disponibilidade. Lança se o nome não existe. */
export function scenario(id: string): Scenario {
  const s = PORNOME.get(id);
  if (!s) {
    throw new ScenarioIndisponivel(
      id,
      "inexistente",
      `scenario \`${id}\` não existe no catálogo. Conhecidos: ${NOMES.join(", ")}`,
    );
  }
  return s;
}

/**
 * Os handlers MSW de um cenário, prontos para `setupWorker`/`setupServer`.
 *
 * Lança em bloqueado — com a razão — em vez de devolver `[]`. Um array vazio faria a tela montar
 * e o delta ausente parecer um estado vazio legítimo.
 */
export function handlersDoScenario(id: string, base: string): HttpHandler[] {
  const s = scenario(id);
  if (s.estado === "bloqueado" || !s.handlers) {
    throw new ScenarioIndisponivel(
      id,
      s.estado,
      `scenario \`${id}\` está BLOQUEADO e não pode ser servido. Motivo: ${s.razao ?? "não declarado"}`,
    );
  }
  return s.handlers(base);
}
