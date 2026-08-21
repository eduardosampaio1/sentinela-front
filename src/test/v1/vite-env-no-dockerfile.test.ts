// Toda `VITE_*` que o código LÊ chega ao build — ou está declarada como ausente de propósito.
//
// ## O defeito que este arquivo existe para impedir
//
// `VITE_SENTINELA_CANONICAL_ANALYSIS_ENABLED` foi gravada no serviço, o deploy rodou depois
// disso, e mesmo assim o portão da jornada canônica chegou ao ar assim:
//
//     function i(){ return "".trim().toLowerCase()==="true" }
//
// String VAZIA. `"" === "true"` é falso, e o ramo falso é `Navigate to="/home"`. Clicar em
// "Nova análise" ia para `/analyses/new` e voltava no mesmo quadro — a tela nunca mudava, e o
// sintoma que chegou foi *"não abre nada"*.
//
// A causa: build Docker só enxerga variável declarada como `ARG`. O `Dockerfile.front`
// declarava seis, e essa não estava entre elas. **A variável existia e não chegava.**
//
// ## Por que a regra em prosa não bastou
//
// O cabeçalho do próprio `Dockerfile.front` já dizia *"por isso declaramos ARG p/ cada VITE_*"*.
// A regra estava escrita, correta, e no lugar certo — e não impediu nada, porque ninguém a
// verificava. Comentário não é gate: ele orienta quem o lê, e quem adiciona a variável nova
// está lendo outro arquivo.
//
// ## Por que a lista de EXCEÇÕES é declarada, e não inferida
//
// Duas variáveis DEVEM chegar vazias em produção, e não declará-las é acerto, não descuido:
// elas são cadeados. Inferir isso por heurística ("nomes com MOCK ou E2E") faria a próxima
// variável perigosa passar por parecer inofensiva. Aqui cada ausência tem nome e razão — e uma
// exceção nova exige escrever a razão junto.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { glob } from "glob";

const RAIZ = resolve(__dirname, "../../..");

/**
 * As que NÃO devem ser declaradas, e o motivo de cada uma.
 *
 * Declarar qualquer uma destas no Dockerfile é o defeito INVERSO do que este gate persegue:
 * abriria em produção um caminho que só existe para desenvolvimento.
 */
const AUSENTES_DE_PROPOSITO: Readonly<Record<string, string>> = {
  VITE_E2E:
    "liga o bypass de autenticação. Declarada, um build de produção poderia recebê-la e " +
    "dispensar login — a condição mais forte do cadeado é ela nunca chegar ao Dockerfile.",
  VITE_SENTINELA_MOCK:
    "liga o MSW. O `import()` do worker já morre por `import.meta.env.DEV`, mas manter a " +
    "variável fora do build é a segunda tranca, e as duas foram decididas juntas.",
};

function lerDockerfile(): string {
  return readFileSync(resolve(RAIZ, "Dockerfile.front"), "utf-8");
}

async function viteLidasPeloCodigo(): Promise<Set<string>> {
  // Só código de PRODUTO. Um teste que nomeia uma variável não a torna necessária ao
  // build — `account-boundary.test.ts`, por exemplo, monta a string de vazamento de uma
  // credencial de Account justamente para provar que a fronteira a recusa. Varrer testes
  // faria este gate exigir no Dockerfile a variável que outro gate proíbe de existir.
  const arquivos = (
    await glob("src/**/*.{ts,tsx}", { cwd: RAIZ, absolute: true })
  ).filter((f) => {
    // `split` por AMBOS os separadores: este teste roda no Windows e no CI Linux, e um caminho
    // partido só por `/` não encontraria `test` em `src\test\v1\...`.
    const partes = f.split(/[\\/]/);
    return !partes.includes("test") && !partes.includes("mocks") && !/\.test\.tsx?$/.test(f);
  });
  const achadas = new Set<string>();
  for (const f of arquivos) {
    const t = readFileSync(f, "utf-8");
    for (const m of t.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) {
      achadas.add(m[1]);
    }
  }
  return achadas;
}

function declaradas(fonte: string, diretiva: "ARG" | "ENV"): Set<string> {
  const s = new Set<string>();
  if (diretiva === "ARG") {
    for (const m of fonte.matchAll(/^ARG\s+(VITE_[A-Z0-9_]+)/gm)) s.add(m[1]);
  } else {
    // O `ENV` é uma instrução só, com continuações de linha: casa o nome à ESQUERDA do `=`.
    for (const m of fonte.matchAll(/(VITE_[A-Z0-9_]+)=\$/g)) s.add(m[1]);
  }
  return s;
}

describe("as `VITE_*` do código chegam ao build", () => {
  it("toda variável lida está declarada como `ARG`, ou tem ausência com razão escrita", async () => {
    const usadas = await viteLidasPeloCodigo();
    const args = declaradas(lerDockerfile(), "ARG");

    const faltando = [...usadas]
      .filter((v) => !args.has(v) && !(v in AUSENTES_DE_PROPOSITO))
      .sort();

    expect(
      faltando,
      "lida pelo código e ausente do Dockerfile: chega VAZIA ao bundle, e o defeito só aparece " +
        "no ambiente. Declare o `ARG` (e o `ENV`), ou registre a ausência em " +
        "`AUSENTES_DE_PROPOSITO` com o motivo.",
    ).toEqual([]);
  });

  it("todo `ARG` promovido a `ENV` — declarar sem promover não entrega nada", () => {
    // `ARG` sozinho existe só no escopo da instrução do Docker; o `npm run build` roda com o
    // AMBIENTE. Declarar e não promover produz exatamente o mesmo sintoma de não declarar, com
    // a agravante de o Dockerfile parecer correto para quem o lê.
    const fonte = lerDockerfile();
    const args = declaradas(fonte, "ARG");
    const envs = declaradas(fonte, "ENV");

    const semEnv = [...args].filter((v) => !envs.has(v)).sort();
    expect(semEnv, "declarada como ARG e não promovida a ENV").toEqual([]);
  });

  it("nenhuma exceção virou declaração — os cadeados continuam fora do build", () => {
    // A direção INVERSA, e ela importa mais: se `VITE_E2E` um dia aparecer no Dockerfile, um
    // build de produção pode recebê-la e dispensar autenticação.
    const args = declaradas(lerDockerfile(), "ARG");
    const vazadas = Object.keys(AUSENTES_DE_PROPOSITO).filter((v) => args.has(v)).sort();
    expect(
      vazadas,
      "declarada no Dockerfile apesar de listada como ausente de propósito — releia a razão " +
        "em `AUSENTES_DE_PROPOSITO` antes de remover esta linha",
    ).toEqual([]);
  });

  it("a razão de cada ausência é escrita, não um `true` mudo", () => {
    for (const [nome, razao] of Object.entries(AUSENTES_DE_PROPOSITO)) {
      expect(razao.length, `${nome} sem razão escrita`).toBeGreaterThan(40);
    }
  });
});
