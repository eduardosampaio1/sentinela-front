// Jornada canônica local — o painel mostrando a pressão certa sem abrir a parede.
//
// Preparação local do Big Bang. Nada aqui ativa nada: são provas do código local candidato.
//
// A jornada que o usuário percorre:
//   upload recebido → profiling → mapping automático  → validação/sanitização → ready
//                               ↘ needs_mapping (para, e DIZ por quê)
//   → análise iniciada → resultado
//
// O Gateway traduz tudo isso para o vocabulário público. O frontend não sabe o que é bucket,
// object key, worker, lease, purge ou fencing — e há teste provando que não sabe.

import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { describeAnalysisState } from "./stateView";
import { PUBLIC_STATES } from "@/lib/v1/contract/public-v1.types";
import en from "@/i18n/en.json";
import pt from "@/i18n/pt.json";

/**
 * O recorte do bundle que este arquivo indexa por `status` — M46.
 *
 * Aqui havia `Record<string, any>`. `any` não era necessário: a indexação é dinâmica (o `status`
 * vem de um laço), mas o VALOR tem forma conhecida, e é dela que os `expect` abaixo dependem.
 * Com `any`, renomear `canonicalAnalysis.state` compilaria e o teste morreria em runtime com
 * "cannot read property of undefined" — um erro que não diz o que aconteceu.
 */
interface DicionarioDeEstados {
  canonicalAnalysis?: {
    state?: Record<string, { title?: unknown; message?: unknown } | undefined>;
  };
}

describe("needs_mapping — a parada honesta", () => {
  const view = describeAnalysisState({ status: "needs_mapping", retry_allowed: false });

  it("NÃO é erro: nada quebrou, há uma pergunta", () => {
    // Pintar de erro faria o usuário procurar defeito onde há uma pergunta.
    expect(view.isError).toBe(false);
  });

  it("NÃO é indeterminado: um spinner aqui é a tela travada", () => {
    // O sintoma que a instrução nomeia. Nada está progredindo; mostrar progresso faria o
    // usuário esperar para sempre por algo que não vai acontecer sozinho.
    expect(view.indeterminate).toBe(false);
  });

  it("NÃO é terminal: a jornada continua quando a pessoa confirmar", () => {
    expect(view.terminal).toBe(false);
  });

  it("a ação é confirmar o mapping, e NUNCA `retry`", () => {
    // Reenviar o mesmo arquivo daria exatamente o mesmo resultado. Oferecer "tentar de novo"
    // seria mandar o usuário repetir trabalho sem chance de sucesso.
    expect(view.action).toBe("confirm_mapping");
    expect(view.action).not.toBe("retry");
  });

  it("não vira `retry` nem quando o backend permite retry por engano", () => {
    // Fail-closed de apresentação: se o Gateway mandar `retry_allowed: true` por defeito,
    // a tela ainda não oferece um retry que não resolve.
    const comRetry = describeAnalysisState({ status: "needs_mapping", retry_allowed: true });
    expect(comRetry.action).toBe("confirm_mapping");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// M45.2 — carregando não é estado, e ausência não é indisponibilidade
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** O recorte do dicionário que estes casos leem. Tipado para não precisar de `any`. */
interface Dicionario {
  readonly estadoPublico: Record<string, string>;
  readonly canonicalAnalysis: {
    readonly loading?: string;
    readonly list: { readonly recordsUnknown: string };
    readonly state: Record<string, { readonly title: string; readonly message: string }>;
  };
}

describe("M45.2 · o vocabulário da jornada não colapsa três coisas em uma", () => {
  it("o rótulo de CARREGANDO não é o nome de nenhum estado", () => {
    // A página usava `state.preparing.title` — "Preparando" — como rótulo de carregando. Enquanto
    // o status era buscado, a tela afirmava que a análise estava naquele estado; e se ela
    // estivesse mesmo, a pessoa veria a mesma palavra pelos dois motivos. Carregando e estado são
    // duas telas distintas, e essa é a regra que o programa inteiro repete.
    for (const [nome, dicionario] of [["pt", pt], ["en", en]] as const) {
      const ca = (dicionario as unknown as Dicionario).canonicalAnalysis;
      const carregando = String(ca.loading ?? "").trim();
      expect(carregando.length, `${nome} sem rótulo de carregando`).toBeGreaterThan(0);
      const titulos = PUBLIC_STATES.map((s) => String(ca.state[s].title));
      expect(titulos, `${nome}: o carregando usa o nome de um estado`).not.toContain(carregando);
    }
  });

  // Decisão de owner (2026-08-15), respondendo à dívida registrada no DOC-CLOSE da M45.2.
  //
  // Três estados tinham dois nomes conforme a superfície. Dois deles são a MESMA ideia dita curta
  // (etiqueta) ou longa (título de página) — "Falha"/"Não concluída" e "Ação necessária"/
  // "Confirmação necessária" —, e o owner os manteve: são registros diferentes, e os rótulos da
  // etiqueta estão congelados no §15 do Blueprint.
  //
  // `preparing` era outra coisa: "Reservada" diz que o lugar está guardado esperando VOCÊ, e
  // "Preparando" diz que o sistema está trabalhando. Só uma é verdade — o estado renderiza o passo
  // de upload, que pede o arquivo. O título alinhou com a etiqueta, que já estava certa.
  //
  // O caso mede a concordância E nomeia as duas exceções: sem nomeá-las, alinhar tudo passaria, e
  // isso contradiria o §15.
  it("`preparing` diz a mesma coisa na etiqueta e no título; os outros dois seguem separados", () => {
    for (const [nome, dicionario] of [["pt", pt], ["en", en]] as const) {
      const d = dicionario as unknown as Dicionario;
      expect(
        d.canonicalAnalysis.state.preparing.title,
        `${nome}: a página e a lista voltaram a discordar sobre \`preparing\``,
      ).toBe(d.estadoPublico.preparing);

      // E o título não pode voltar a afirmar trabalho em curso: o estado ESPERA o arquivo.
      expect(
        String(d.canonicalAnalysis.state.preparing.message),
        `${nome}: o texto voltou a dizer que o sistema está preparando`,
      ).not.toMatch(/preparing the|preparando a/i);

      // As duas divergências que o §15 mantém DE PROPÓSITO.
      for (const estado of ["failed", "needs_mapping"] as const) {
        expect(
          d.canonicalAnalysis.state[estado].title,
          `${nome}: \`${estado}\` foi alinhado, e o §15 do Blueprint não autoriza isso`,
        ).not.toBe(d.estadoPublico[estado]);
      }
    }
  });

  it("contagem não publicada NÃO é dita como indisponibilidade", () => {
    // `record_count: null` é o produtor não tendo publicado a contagem — não é o sistema fora do
    // ar. A copy dizia "Registros indisponíveis" / "Records not available", que é exatamente a
    // palavra da queda. A casa já tem o termo certo para isto: "não publicado".
    const proibidos = [/indispon/i, /unavailable/i, /couldn't|não foi possível/i];
    for (const [nome, dicionario] of [["pt", pt], ["en", en]] as const) {
      const texto = String((dicionario as unknown as Dicionario).canonicalAnalysis.list.recordsUnknown);
      expect(texto.trim().length, `${nome} sem texto`).toBeGreaterThan(0);
      for (const p of proibidos) {
        expect(texto, `${nome}: ausência dita como indisponibilidade — "${texto}"`).not.toMatch(p);
      }
    }
  });
});

describe("nenhum estado público fica sem texto", () => {
  // Cadeado de exaustividade: um estado novo sem i18n apareceria como a CHAVE crua na tela
  // ("canonicalAnalysis.state.needs_mapping.title"), que é a forma de a interface mentir sem
  // ninguém notar em teste de unidade.
  for (const status of PUBLIC_STATES) {
    it(`${status} tem título e mensagem em pt e en`, () => {
      for (const [nome, dicionario] of [["pt", pt], ["en", en]] as const) {
        const estado = (dicionario as DicionarioDeEstados).canonicalAnalysis?.state?.[status];
        // `throw`, e não `expect(...).toBeTruthy()` — M46.
        //
        // O `expect` reprovaria, mas não ESTREITA o tipo: as duas linhas seguintes continuariam
        // lendo de um valor possivelmente ausente. Antes isso passava porque o cast era `any`.
        // O `throw` faz as duas coisas, e a mensagem é a mesma.
        if (!estado) throw new Error(`${status} sem entrada em ${nome}`);
        expect(String(estado.title).trim().length, `${status}.title vazio em ${nome}`)
          .toBeGreaterThan(0);
        expect(String(estado.message).trim().length, `${status}.message vazio em ${nome}`)
          .toBeGreaterThan(0);
      }
    });
  }

  it("a UNIÃO e o array declaram exatamente os mesmos estados", () => {
    // A direção que faltava. O laço acima percorre `PUBLIC_STATES`: um estado acrescentado só
    // na união `AnalysisStatus` nunca seria testado, e o gate de sincronia com a origem que
    // pegaria isso não roda quando a origem não está na máquina.
    //
    // Este teste NÃO depende da origem: é uma coerência interna do arquivo, e vale sempre.
    const fonte = fs.readFileSync(
      path.resolve(__dirname, "../../../lib/v1/contract/public-v1.types.ts"),
      "utf-8",
    );
    const uniao = fonte.slice(
      fonte.indexOf("export type AnalysisStatus"),
      fonte.indexOf("export const PUBLIC_STATES"),
    );
    const daUniao = [...uniao.matchAll(/\|\s*"([a-z_]+)"/g)].map((m) => m[1]).sort();
    expect(daUniao.length, "nenhum estado extraído da união").toBeGreaterThan(0);
    expect(daUniao).toEqual([...PUBLIC_STATES].sort());
  });

  it("a máquina de apresentação cobre TODOS os estados declarados", () => {
    // Sem isto, um estado novo no contrato cairia no `switch` sem `case` e a função
    // devolveria `undefined` — a tela quebraria em runtime, não em teste.
    for (const status of PUBLIC_STATES) {
      const v = describeAnalysisState({ status, retry_allowed: false });
      expect(v, `sem apresentação para ${status}`).toBeTruthy();
      expect(v.status).toBe(status);
    }
  });
});

describe("o frontend não conhece o interior do sistema", () => {
  // O Gateway é fachada. Se um destes termos aparecer no vocabulário público ou nos textos
  // da jornada, o detalhe interno vazou para a tela — e o contrato deixou de ser fachada.
  /**
   * Um termo proibido vazou neste texto?
   *
   * Substring para todos, EXCETO `minio`, que vale como palavra. O motivo está escrito na
   * varredura do código: `dominio` — identificador em português do campo `domain`, que o contrato
   * v3 publica em toda medição — contém literalmente `minio`, e o cadeado passou a acusar três
   * arquivos de vazarem o nome do object storage por escreverem "domínio".
   *
   * Este é o matcher ÚNICO: a prova de sanidade usa o mesmo, porque um gate provado com um matcher
   * e executado com outro prova o matcher errado.
   */
  const vaza = (texto: string, proibido: string): boolean =>
    proibido === "minio" ? /\bminio\b/.test(texto) : texto.includes(proibido);

  const PROIBIDOS = [
    "bucket",
    "object_key",
    "objectkey",
    "worker",
    "lease",
    "fencing",
    "purge",
    "minio",
    "presigned",
    "attempt",
    "ingestion_id",
  ];


/**
 * MICROCORREÇÃO (M21) — `max_time_buckets` é PROPRIEDADE PUBLICADA, não infraestrutura.
 *
 * `bucket` entrou na lista como conceito de storage: MinIO, `object_key`, caminho de objeto. Depois
 * da BD08, o contrato aninhado publica `SerieTemporal.max_time_buckets` — o parâmetro de
 * agregação temporal —, e a palavra passou a ter dois significados. O gate acusava o segundo.
 *
 * A exceção NASCE DA SEMÂNTICA, não de uma lista: a ocorrência só é neutralizada se o schema
 * publicado pela BD08 de fato declarar essa propriedade. Se a BD08 sumir, se o campo sair do
 * contrato, ou se o schema não for encontrado, `max_time_buckets` volta a ser tratado como
 * vazamento — sem ninguém precisar lembrar de reverter nada.
 *
 * O CONCEITO segue proibido em qualquer forma: `const bucket`, `bucketName`, `object_key`,
 * `minio`, URL de storage. Só o nome exato da propriedade publicada é perdoado.
 */
const CONTRATO_ANINHADO = path.resolve(
  __dirname,
  "../../../../../sentinela-analytics-service/docs/contracts/analytics-snapshot-v9.json",
);

/** Nomes de propriedade que o contrato aninhado publica e que colidem com token interno. */
function propriedadesPublicadasQueColidem(): string[] {
  if (!fs.existsSync(CONTRATO_ANINHADO)) return [];
  const doc = JSON.parse(fs.readFileSync(CONTRATO_ANINHADO, "utf-8")) as {
    schema?: { $defs?: Record<string, { properties?: Record<string, unknown> }> };
  };
  const nomes = new Set<string>();
  for (const def of Object.values(doc.schema?.$defs ?? {})) {
    for (const prop of Object.keys(def.properties ?? {})) nomes.add(prop);
  }
  // Só as que de fato contêm um token proibido. Um campo publicado sem colisão não entra aqui.
  return [...nomes].filter((n) => PROIBIDOS.some((p) => n.toLowerCase().includes(p)));
}

/** Remove do texto APENAS os nomes de propriedade publicados — o conceito continua visível. */
function semPropriedadesPublicadas(fonte: string): string {
  let out = fonte;
  for (const nome of propriedadesPublicadasQueColidem()) {
    out = out.split(nome.toLowerCase()).join("");
  }
  return out;
}

  it("os estados públicos não usam vocabulário interno", () => {
    for (const status of PUBLIC_STATES) {
      for (const proibido of PROIBIDOS) {
        expect(status.toLowerCase()).not.toContain(proibido);
      }
    }
  });

  it("os textos da jornada não mencionam infraestrutura", () => {
    for (const dicionario of [pt, en]) {
      const estados = (dicionario as DicionarioDeEstados).canonicalAnalysis?.state ?? {};
      const texto = JSON.stringify(estados).toLowerCase();
      for (const proibido of PROIBIDOS) {
        expect(texto, `texto de estado menciona "${proibido}"`).not.toContain(proibido);
      }
    }
  });

  it("o CÓDIGO da jornada não menciona infraestrutura", () => {
    // Os dois testes acima cobrem o vocabulário e os textos. A afirmação, porém, é sobre o
    // frontend: um hook lendo `object_key`, uma chamada com `bucket` na URL ou um campo
    // `lease` num tipo passariam por eles inteiros. O que o Gateway esconde na fachada não
    // pode reaparecer aqui pela porta dos fundos.
    const raiz = path.resolve(__dirname, "..");
    const arquivos: string[] = [];
    const visitar = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const alvo = path.join(dir, e.name);
        if (e.isDirectory()) visitar(alvo);
        else if (/\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) arquivos.push(alvo);
      }
    };
    visitar(raiz);
    expect(arquivos.length, "nenhum arquivo da jornada encontrado").toBeGreaterThan(5);

    // `attempt` sai desta lista: `attempt_count` é conceito do Orchestrator, mas a palavra
    // aparece legitimamente em ingles corrente. O cadeado de estados acima ja o cobre onde
    // importa — no vocabulario publico.
    //
    // MICROCORREÇÃO — `minio` DENTRO de `dominio`.
    //
    // O contrato v3 publica `domain` em toda medição, com vocabulário fechado de quatro valores, e
    // a tela passou a agrupar por ele. Os identificadores em português saem `dominio`,
    // `agruparPorDominio`, `PARAM_DOMINIO` — e `dominio` contém literalmente a substring `minio`.
    // Três arquivos foram acusados de vazar o nome do object storage por escreverem "domínio".
    //
    // A AFIRMAÇÃO do cadeado é sobre MinIO, o armazenamento. O ALCANCE dele era a substring, e as
    // duas divergiram no dia em que a tela precisou da palavra "domínio". `minio` passa a valer
    // como PALAVRA: `minio.local` e `import minio` seguem pegos; `dominio` não é MinIO.
    //
    // Só `minio` muda de regra. Os outros seguem por substring de propósito — `worker` precisa
    // pegar `workerPool`, e exigir fronteira ali afrouxaria o cadeado em vez de afinar.
    const noCodigo = PROIBIDOS.filter((p) => p !== "attempt");
    const culpados: string[] = [];
    for (const a of arquivos) {
      const src = fs
        .readFileSync(a, "utf-8")
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/.*$/gm, "$1")
        .toLowerCase();
      // A exceção semântica entra AQUI, e só aqui: nomes de propriedade que o contrato aninhado
      // publica saem do texto antes da varredura. O que sobra é o conceito.
      const limpo = semPropriedadesPublicadas(src);
      for (const proibido of noCodigo) {
        if (vaza(limpo, proibido)) culpados.push(`${path.relative(raiz, a)}: ${proibido}`);
      }
    }
    expect(culpados).toEqual([]);
  });

  it("a exceção vem do CONTRATO, e cobre `max_time_buckets`", () => {
    // Se este caso ficar vazio, a exceção deixou de nascer da semântica — e o gate voltaria a
    // acusar o campo publicado, ou pior, passaria a perdoar por outro motivo.
    expect(
      propriedadesPublicadasQueColidem(),
      "o contrato da BD08 não foi encontrado ou não publica mais o campo",
    ).toContain("max_time_buckets");
  });

  it("o CONCEITO de infraestrutura continua proibido em qualquer forma", () => {
    // A direção que importa: a exceção perdoa o NOME publicado, nunca o conceito.
    for (const uso of [
      "const bucket = obterBucket();",
      "const bucketName = 's3';",
      "type Storage = { object_key: string };",
      "fetch('https://minio.local/bucket/x')",
      "import { presigned } from './storage';",
    ]) {
      const limpo = semPropriedadesPublicadas(uso.toLowerCase());
      const pegou = PROIBIDOS.filter((p) => p !== "attempt").some((p) => vaza(limpo, p));
      expect(pegou, `conceito de infraestrutura passou: ${uso}`).toBe(true);
    }
  });

  it("`max_time_buckets` legítimo passa; `bucket` solto na MESMA linha não", () => {
    const legitimo = "max_time_buckets: contagem(bruto.max_time_buckets),".toLowerCase();
    expect(
      PROIBIDOS.some((p) => vaza(semPropriedadesPublicadas(legitimo), p)),
      "o campo publicado foi acusado",
    ).toBe(false);

    const misturado = "max_time_buckets: 1; const bucket = 2;".toLowerCase();
    expect(
      semPropriedadesPublicadas(misturado).includes("bucket"),
      "o conceito escondeu-se atrás do campo publicado",
    ).toBe(true);
  });
});
