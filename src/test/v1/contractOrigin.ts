// WS-A1 — resolução EXPLÍCITA da autoridade do contrato público.
//
// O problema que este módulo existe para matar: `ORIGENS.find(existe)` devolve a PRIMEIRA que
// existir no disco. Quando os dois checkouts existem e DIVERGEM — que é o estado real hoje, 11
// operações contra 6 — a escolha vira consequência de quais pastas alguém clonou. O gate lê um
// contrato, o outro contrato existe, e nada diz qual manda.
//
// Aqui a resolução passa a ser um FATO declarado: origem, caminho, digest, versão e o MOTIVO da
// escolha. E quando há mais de uma candidata com conteúdo diferente sem ninguém ter declarado a
// autoridade, isto não escolhe: devolve `ambigua` e quem chama falha. Escolher em silêncio é o
// defeito, não a inconveniência.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(__dirname, "../../..");
const ARQUIVO = "public-v1.json";

/** Ordem de busca quando ninguém declarou a autoridade. NÃO é preferência — é só a varredura. */
export const CANDIDATAS_PADRAO = [
  resolve(RAIZ, "../sentinela-facts/docs/contracts"),
  resolve(RAIZ, "../sentinela/docs/contracts"),
];

export interface CandidataDeOrigem {
  caminho: string;
  /** SHA-256 do arquivo bruto — o que detecta cópia stale sem precisar comparar campo a campo. */
  digest: string;
  /** `version` declarada dentro do contrato, quando existe. */
  versao: string | null;
  /** Quantidade de entradas em `operations` — o eixo em que as origens divergem hoje. */
  operacoes: number;
}

export type MotivoDaEscolha =
  | "declarada-por-env" // SENTINELA_CONTRACT_ORIGIN apontou
  | "candidata-unica" // só uma existe no disco
  | "candidatas-identicas" // várias existem, mesmo digest — não há o que arbitrar
  | "ambigua" // várias existem e divergem, e ninguém declarou: NÃO escolhemos
  | "ausente"; // nenhuma existe

export interface ResolucaoDeOrigem {
  motivo: MotivoDaEscolha;
  /** `null` em `ambigua` e em `ausente` — de propósito: não há autoridade resolvida. */
  escolhida: CandidataDeOrigem | null;
  candidatas: CandidataDeOrigem[];
  /** Preenchido só em `ambigua`: o que difere, em linguagem de quem vai decidir. */
  divergencia: string | null;
}

function lerCandidata(caminho: string): CandidataDeOrigem | null {
  const arquivo = resolve(caminho, ARQUIVO);
  if (!existsSync(arquivo)) return null;
  const bruto = readFileSync(arquivo, "utf-8");
  let versao: string | null = null;
  let operacoes = 0;
  try {
    const doc = JSON.parse(bruto) as { version?: string; operations?: unknown[] };
    versao = typeof doc.version === "string" ? doc.version : null;
    operacoes = Array.isArray(doc.operations) ? doc.operations.length : 0;
  } catch {
    // JSON quebrado é candidata inválida, não candidata silenciosa: fica com digest e 0 operações,
    // e a comparação de digest vai acusá-la como divergente.
  }
  return {
    caminho,
    // Digest do CONTEÚDO, com a quebra de linha normalizada — e não dos bytes crus do disco.
    //
    // O repo do produtor tem `core.autocrlf=true`: um checkout no Windows grava CRLF, um no
    // Linux grava LF, e o mesmo commit produz dois digests. Como este valor é selado
    // (`fixtures/public-v1/selo.ts`), o gate ficaria vermelho por plataforma — dizendo "o
    // contrato mudou" quando nenhuma linha de conteúdo mudou. Pior: o selo verdadeiro passaria
    // a depender de quem commitou por último.
    //
    // Normalizar aqui preserva exatamente o que o selo existe para detectar (conteúdo novo) e
    // descarta o que ele nunca quis detectar (como o disco escreveu a linha).
    digest: createHash("sha256").update(bruto.replace(/\r\n/g, "\n")).digest("hex"),
    versao,
    operacoes,
  };
}

/**
 * Resolve a autoridade. Nunca lança — devolve o veredicto para quem chama decidir o que fazer
 * com `ambigua` e `ausente`. Um resolvedor que lança esconde a informação de diagnóstico dentro
 * de uma mensagem de exceção; aqui ela é dado.
 */
export function resolverOrigemDoContrato(
  candidatasPadrao: string[] = CANDIDATAS_PADRAO,
  env: NodeJS.ProcessEnv = process.env,
): ResolucaoDeOrigem {
  const declarada = env.SENTINELA_CONTRACT_ORIGIN
    ? lerCandidata(resolve(env.SENTINELA_CONTRACT_ORIGIN))
    : null;

  const candidatas = candidatasPadrao
    .map(lerCandidata)
    .filter((c): c is CandidataDeOrigem => c !== null);

  if (declarada) {
    return {
      motivo: "declarada-por-env",
      escolhida: declarada,
      candidatas: candidatas.some((c) => c.caminho === declarada.caminho)
        ? candidatas
        : [declarada, ...candidatas],
      divergencia: null,
    };
  }

  if (candidatas.length === 0) {
    return { motivo: "ausente", escolhida: null, candidatas: [], divergencia: null };
  }
  if (candidatas.length === 1) {
    return {
      motivo: "candidata-unica",
      escolhida: candidatas[0],
      candidatas,
      divergencia: null,
    };
  }

  const digests = new Set(candidatas.map((c) => c.digest));
  if (digests.size === 1) {
    // Várias cópias do MESMO contrato. Não há arbitragem a fazer, e escolher a primeira aqui é
    // legítimo justamente porque a escolha não muda nada.
    return {
      motivo: "candidatas-identicas",
      escolhida: candidatas[0],
      candidatas,
      divergencia: null,
    };
  }

  return {
    motivo: "ambigua",
    escolhida: null,
    candidatas,
    divergencia: candidatas
      .map((c) => `${c.caminho} → ${c.operacoes} operações, digest ${c.digest.slice(0, 12)}`)
      .join("\n  "),
  };
}

/** Texto único usado nas mensagens de falha — mesma explicação em todo gate que depende disto. */
export function explicarResolucao(r: ResolucaoDeOrigem): string {
  if (r.motivo === "ambigua") {
    return (
      "AUTORIDADE DO CONTRATO AMBÍGUA: existem múltiplas origens com conteúdo DIFERENTE e " +
      "ninguém declarou qual manda.\n  " +
      r.divergencia +
      "\nDeclare a autoridade em SENTINELA_CONTRACT_ORIGIN, ou alinhe as origens. " +
      "Este gate NÃO escolhe por ordem de pasta."
    );
  }
  if (r.motivo === "ausente") {
    return (
      "origem de public-v1 não encontrada. Para rodar assim de propósito (clone isolado), " +
      "declare SENTINELA_CONTRACT_ORIGIN_ABSENT=1."
    );
  }
  const e = r.escolhida!;
  return `origem: ${e.caminho} (${r.motivo}) · versão ${e.versao ?? "—"} · ${e.operacoes} operações · digest ${e.digest.slice(0, 12)}`;
}
