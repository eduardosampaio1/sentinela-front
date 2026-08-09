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

import { existsSync } from "node:fs";
import { resolve } from "node:path";

const RAIZ = resolve(__dirname, "../../..");

// Mesmo desenho do `SENTINELA_CONTRACT_ORIGIN`: quem sabe qual checkout é a autoridade diz o
// caminho. Aqui isso também é o que permite a prova negativa do A5 mutar uma CÓPIA — o repo do
// produtor está congelado e não é tocado por teste nenhum.
export const CONTRATOS_ANALYTICS = process.env.SENTINELA_ANALYTICS_CONTRACTS
  ? resolve(process.env.SENTINELA_ANALYTICS_CONTRACTS)
  : resolve(RAIZ, "../sentinela-analytics-service/src/analytics_service/contracts");

export const ARQUIVOS_ANALYTICS = [
  "distribuicao.py",
  "concentracao.py",
  "cruzamento.py",
  "serie_temporal.py",
  "snapshot.py",
];

export function analyticsDisponivel(): boolean {
  return (
    existsSync(CONTRATOS_ANALYTICS) &&
    ARQUIVOS_ANALYTICS.every((a) => existsSync(resolve(CONTRATOS_ANALYTICS, a)))
  );
}

export interface Projecao {
  nome: string;
  campos: string[];
  /** Campos declarados como `| None` (Python) ou `| null` (TS). */
  anulaveis: string[];
}

// `class Nome(Base):` — captura o nome e a base para herdar campos de bases privadas.
const CLASSE_PY = /^class\s+([A-Za-z0-9_]+)\s*\(\s*([A-Za-z0-9_]+)\s*\)\s*:/gm;
// `    campo: tipo` no corpo da classe, ignorando `_privados` e métodos.
const CAMPO_PY = /^ {4}([a-z][a-z0-9_]*)\s*:\s*([^\n=]+)/gm;

/** Extrai as projeções declaradas em um módulo Pydantic, resolvendo herança de bases locais. */
export function projecoesPython(fonte: string): Map<string, Projecao> {
  const limites: { nome: string; base: string; inicio: number }[] = [];
  for (const m of fonte.matchAll(CLASSE_PY)) {
    limites.push({ nome: m[1], base: m[2], inicio: m.index! });
  }
  const brutas = new Map<string, Projecao & { base: string }>();
  limites.forEach((c, i) => {
    const fim = i + 1 < limites.length ? limites[i + 1].inicio : fonte.length;
    const corpo = fonte.slice(c.inicio, fim);
    const campos: string[] = [];
    const anulaveis: string[] = [];
    for (const m of corpo.matchAll(CAMPO_PY)) {
      const [, nome, tipo] = m;
      campos.push(nome);
      if (/\|\s*None|Optional\[/.test(tipo)) anulaveis.push(nome);
    }
    brutas.set(c.nome, { nome: c.nome, base: c.base, campos, anulaveis });
  });

  // Herança: uma base privada (`_CruzamentoBase`, `_SerieBase`) contribui seus campos para a
  // subclasse. Sem isto, comparar `SerieTemporal` compararia metade da superfície e daria verde.
  const resolvido = new Map<string, Projecao>();
  for (const [nome, c] of brutas) {
    const campos = new Set(c.campos);
    const anulaveis = new Set(c.anulaveis);
    let base = c.base;
    const visto = new Set<string>([nome]);
    while (brutas.has(base) && !visto.has(base)) {
      visto.add(base);
      const b = brutas.get(base)!;
      b.campos.forEach((f) => campos.add(f));
      b.anulaveis.forEach((f) => anulaveis.add(f));
      base = b.base;
    }
    resolvido.set(nome, {
      nome,
      campos: [...campos].sort(),
      anulaveis: [...anulaveis].sort(),
    });
  }
  return resolvido;
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
