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
  /**
   * As operações como CONJUNTO (`METHOD path`), e não só a contagem.
   *
   * A contagem responde "quantas"; só o conjunto responde "quais", e é essa a diferença entre
   * duas situações que a contagem confunde: **checkout mais velho** (um é subconjunto estrito do
   * outro) e **divergência real** (cada um tem operação que o outro não tem). A primeira não é
   * ambiguidade nenhuma — é o mesmo contrato em dois pontos do tempo.
   */
  operacoesIds: readonly string[];
}

export type MotivoDaEscolha =
  | "declarada-por-env" // SENTINELA_CONTRACT_ORIGIN apontou
  | "candidata-unica" // só uma existe no disco
  | "candidatas-identicas" // várias existem, mesmo digest — não há o que arbitrar
  | "checkout-desatualizado" // uma é SUBCONJUNTO estrito da outra: mesmo contrato, ponto diferente
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
  let operacoesIds: string[] = [];
  try {
    const doc = JSON.parse(bruto) as { version?: string; operations?: unknown[] };
    versao = typeof doc.version === "string" ? doc.version : null;
    operacoes = Array.isArray(doc.operations) ? doc.operations.length : 0;
    operacoesIds = Array.isArray(doc.operations)
      ? doc.operations.map((o) => {
          const x = o as { method?: string; path?: string };
          return `${String(x.method ?? "?")} ${String(x.path ?? "?")}`;
        })
      : [];
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
    operacoesIds,
  };
}

/**
 * A candidata cujas operações CONTÊM as de todas as outras, quando ela existe.
 *
 * `null` quando alguma candidata tem operação que a maior não tem — aí não há "mais completa",
 * há divergência, e quem chama devolve `ambigua`.
 *
 * Empate em tamanho com conjuntos diferentes também devolve `null`: dois contratos do mesmo
 * tamanho e conteúdo diferente é exatamente o caso em que escolher seria adivinhar.
 */
function escolherSuperconjuntoEstrito(
  candidatas: CandidataDeOrigem[],
): CandidataDeOrigem | null {
  const maior = [...candidatas].sort((a, b) => b.operacoesIds.length - a.operacoesIds.length)[0];
  if (!maior || maior.operacoesIds.length === 0) return null;
  const dela = new Set(maior.operacoesIds);
  for (const c of candidatas) {
    if (c.caminho === maior.caminho) continue;
    if (c.operacoesIds.length === 0) return null;
    // Alguma operação que a maior NÃO tem? Então não é subconjunto, e não há arbitragem.
    if (c.operacoesIds.some((op) => !dela.has(op))) return null;
    // Mesmo tamanho e conteúdo diferente já foi barrado acima; mesmo tamanho e mesmo conteúdo
    // teria caído em `candidatas-identicas` pelo digest.
  }
  return maior;
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

  // ANTES de declarar ambiguidade: uma é SUBCONJUNTO ESTRITO da outra?
  //
  // Medido no estado real desta máquina: `../sentinela` e `../sentinela-facts` são o MESMO
  // repositório — mesmo remoto, 198 de 200 commits em comum — em dois checkouts. O contrato de um
  // tem 12 operações, o do outro 27, e as 12 estão TODAS entre as 27: zero operações próprias.
  //
  // Isso não é "duas autoridades", é a mesma autoridade em dois pontos do tempo. Recusar aqui
  // fazia o gate ficar vermelho em função de quais pastas existem no disco de quem roda — e
  // pedir `SENTINELA_CONTRACT_ORIGIN` para contornar transformava um diagnóstico em ritual.
  //
  // A ambiguidade CONTINUA para o caso que a merece: quando cada candidata tem operação que a
  // outra não tem, não há "mais nova" — há duas, e escolher seria adivinhar. O superconjunto só
  // vence porque o contrato desta casa é ADITIVO por regra declarada; remover operação pública é
  // quebra, e quebra tem gate próprio no repo do produtor.
  const superconjunto = escolherSuperconjuntoEstrito(candidatas);
  if (superconjunto) {
    return {
      motivo: "checkout-desatualizado",
      escolhida: superconjunto,
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
  if (r.motivo === "checkout-desatualizado") {
    const outras = r.candidatas.filter((c) => c.caminho !== e.caminho);
    return (
      `origem: ${e.caminho} (checkout-desatualizado) · ${e.operacoes} operações · ` +
      `digest ${e.digest.slice(0, 12)}\n  ` +
      `as outras são SUBCONJUNTO estrito e ficaram para trás: ` +
      outras.map((c) => `${c.caminho} → ${c.operacoes}`).join(", ")
    );
  }
  return `origem: ${e.caminho} (${r.motivo}) · versão ${e.versao ?? "—"} · ${e.operacoes} operações · digest ${e.digest.slice(0, 12)}`;
}
