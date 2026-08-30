// WS-A4 — cobertura da superfície pública ANINHADA.
//
// O contrato de topo declara `snapshot` como um campo e não o abre. Quem procurar
// `method_id` em `public-v1.json` recebe "não existe" com a mesma confiança com que receberia
// "existe" — foi exatamente o erro da revisão. A superfície aninhada é declarada nos contratos
// Pydantic do `sentinela-analytics-service`, e é contra eles que o front precisa ser comparado.
//
// Comparação SEMÂNTICA, não byte a byte: nomes de campo, opcionalidade quando contratual, e a
// direção da divergência. Um campo publicado e não lido é dívida; um campo lido e não publicado
// é invenção.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(__dirname, "../../..");

/**
 * O contrato PUBLICADO da superfície aninhada — BD08.
 *
 * Antes daqui, este módulo lia e parseava os `.py` do produtor: o consumidor dependia do
 * CÓDIGO-FONTE de outro repositório para conhecer o contrato. Funcionava, e atravessava uma
 * fronteira que não deveria existir — um refactor interno do Analytics quebrava o gate do front
 * sem que contrato nenhum tivesse mudado.
 *
 * Mesmo desenho de `SENTINELA_CONTRACT_ORIGIN`: quem sabe qual checkout é a autoridade diz o
 * caminho, e é o que permite a prova negativa mutar uma CÓPIA sem tocar o repo do produtor.
 */
export const CONTRATO_ANALYTICS_PUBLICADO = process.env.SENTINELA_ANALYTICS_CONTRATO
  ? resolve(process.env.SENTINELA_ANALYTICS_CONTRATO)
  : resolve(RAIZ, "../sentinela-analytics-service/docs/contracts/analytics-snapshot-v11.json");

export function analyticsDisponivel(): boolean {
  return existsSync(CONTRATO_ANALYTICS_PUBLICADO);
}

export interface Projecao {
  nome: string;
  campos: string[];
  /** Campos que aceitam `null`. */
  anulaveis: string[];
}

interface SchemaDeObjeto {
  properties?: Record<string, unknown>;
  required?: string[];
}

/** Um campo aceita `null`? No JSON Schema do Pydantic isso vira `anyOf` com `{"type":"null"}`. */
function aceitaNulo(esquema: unknown): boolean {
  const texto = JSON.stringify(esquema ?? {});
  return texto.includes('"type":"null"');
}

/**
 * As projeções da superfície publicada.
 *
 * Vem de `$defs` — o que o Pydantic resolveu como estruturalmente alcançável a partir do read
 * model público — mais o próprio topo. Nenhum nome é digitado aqui: a transitividade é do
 * produtor, e este módulo só a lê.
 */
export function projecoesPublicadas(): Map<string, Projecao> {
  const doc = JSON.parse(readFileSync(CONTRATO_ANALYTICS_PUBLICADO, "utf-8")) as {
    version?: string;
    schema?: SchemaDeObjeto & { $defs?: Record<string, SchemaDeObjeto>; title?: string };
  };
  const schema = doc.schema ?? {};
  const out = new Map<string, Projecao>();

  const registrar = (nome: string, obj: SchemaDeObjeto) => {
    const props = obj.properties ?? {};
    const campos = Object.keys(props).sort();
    const anulaveis = campos.filter((c) => aceitaNulo(props[c])).sort();
    out.set(nome, { nome, campos, anulaveis });
  };

  if (schema.title) registrar(schema.title, schema);
  for (const [nome, def] of Object.entries(schema.$defs ?? {})) registrar(nome, def);
  return out;
}

/** A versão publicada, para o gate poder afirmar contra qual superfície ele comparou. */
export function versaoPublicada(): string | null {
  if (!analyticsDisponivel()) return null;
  const doc = JSON.parse(readFileSync(CONTRATO_ANALYTICS_PUBLICADO, "utf-8")) as { version?: string };
  return doc.version ?? null;
}

// `export interface Nome {` … `}` — o corpo até a chave de fechamento na coluna 0.
const INTERFACE_TS = /^export interface ([A-Za-z0-9_]+)\s*\{([\s\S]*?)^\}/gm;

export function projecoesTypeScript(fonte: string): Map<string, Projecao> {
  const semComentarios = fonte.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const mapa = new Map<string, Projecao>();
  for (const m of semComentarios.matchAll(INTERFACE_TS)) {
    const [, nome, corpo] = m;
    const campos: string[] = [];
    const anulaveis: string[] = [];
    for (const linha of corpo.split("\n")) {
      const campo = linha.match(/^\s{2}([a-z][A-Za-z0-9_]*)\??\s*:\s*(.+?);?\s*$/);
      if (!campo) continue;
      campos.push(campo[1]);
      if (/\bnull\b|\?\s*:/.test(linha)) anulaveis.push(campo[1]);
    }
    mapa.set(nome, { nome, campos: campos.sort(), anulaveis: anulaveis.sort() });
  }
  return mapa;
}

export interface DiffAninhado {
  /** Publicado pelo produtor e não lido pelo front. Dívida — delta de FRONTEND. */
  publicado_e_nao_lido: string[];
  /** Lido pelo front e não publicado. INVENÇÃO — nunca é dívida aceitável. */
  lido_sem_publicacao: string[];
  /** Nullability contratual que os dois lados descrevem de forma diferente. */
  nullability_mismatch: string[];
}

export function compararProjecao(py: Projecao, ts: Projecao): DiffAninhado {
  const camposPy = new Set(py.campos);
  const camposTs = new Set(ts.campos);
  const anulaveisPy = new Set(py.anulaveis);
  const anulaveisTs = new Set(ts.anulaveis);

  const nullability_mismatch: string[] = [];
  for (const campo of camposPy) {
    if (!camposTs.has(campo)) continue;
    if (anulaveisPy.has(campo) !== anulaveisTs.has(campo)) {
      nullability_mismatch.push(
        `${py.nome}.${campo}: produtor ${anulaveisPy.has(campo) ? "anulável" : "não-anulável"}, ` +
          `front ${anulaveisTs.has(campo) ? "anulável" : "não-anulável"}`,
      );
    }
  }

  return {
    publicado_e_nao_lido: [...camposPy].filter((c) => !camposTs.has(c)).sort(),
    lido_sem_publicacao: [...camposTs].filter((c) => !camposPy.has(c)).sort(),
    nullability_mismatch: nullability_mismatch.sort(),
  };
}
