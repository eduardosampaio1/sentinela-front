// M31 — RES-01 julgada como SUPERFÍCIE, e o que o julgamento mudou.
//
// ## Por que esta missão existe
//
// Cada região de RES-01 foi aprovada isolada e passa nos seus próprios testes. O defeito nasceu da
// SOMA: catorze cartões idênticos, vinte "não informado", a narrativa depois da lista derivada
// dela, e a região que deveria ser a primeira leitura sendo a menor coisa da tela. Nenhum teste de
// fatia podia ver isso, porque nenhum deles olhava a tela inteira.
//
// Os casos abaixo guardam as decisões tomadas a partir das capturas, para que a próxima missão não
// as desfaça sem saber que existiam.
//
// ## O que NÃO está aqui
//
// Regressão visual. A infraestrutura não existe neste repositório (não há Chromatic, Percy,
// `toHaveScreenshot` nem baseline de imagem versionada), e inventá-la não era escopo. O que existe
// é a matriz capturada em navegador real, fora da árvore, e estes testes sobre o que é asserível.

import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LanguageProvider } from "@/contexts/LanguageContext";
import pt from "@/i18n/pt.json";
import en from "@/i18n/en.json";
import { ComparisonRow, ComparisonRowQuebrada } from "@/design/patterns/ComparisonRow";
import type { IndicatorView } from "@/features/canonical-analysis/result/indicadores";
import { SecaoDeAtencao } from "@/features/canonical-analysis/ui/analytics/SecaoDeAtencao";
import {
  CartaoIndicador,
  SecaoDeIndicadores,
  SecaoDeRecomendacoes,
} from "@/features/canonical-analysis/ui/analytics/SecoesDaEngine";
import { IndiceDeRegioes } from "@/features/canonical-analysis/ui/analytics/IndiceDeRegioes";

const RAIZ = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(RAIZ, rel), "utf-8");

/** Comentários explicam decisões; eles NÃO são a decisão. Medir prosa foi o defeito das M25 e
 *  M28, e o gate da M30 sobreviveu a uma mutação por causa de uma classe citada num comentário. */
const semComentarios = (f: string) =>
  f.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

function ind(over: Partial<IndicatorView> = {}): IndicatorView {
  return {
    id: "useful_outcome_rate",
    descriptor: {
      labelKey: "canonicalAnalysis.result.indicator.useful_outcome_rate.label",
      descriptionKey: "canonicalAnalysis.result.indicator.useful_outcome_rate.description",
      sourceField: "useful_outcome_rate",
    },
    state: "measured",
    display: "80",
    unitSuffix: "%",
    rawValue: 0.8,
    denominator: null,
    coverage: null,
    coverageDisplay: null,
    outOfRange: false,
    ...over,
  } as IndicatorView;
}

const montar = (ui: React.ReactElement) => {
  window.localStorage.setItem("sentinela:language", "pt");
  return render(<LanguageProvider>{ui}</LanguageProvider>);
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 1. Procedência deixa de ser papel de parede — sem deixar de ser procedência
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 1. a margem aparece onde há o que mostrar", () => {
  /** As catorze medidas de `MASSA_A`, reduzidas ao que decide a margem. */
  const CATORZE = [
    { id: "a", denominator: { kind: "conversations", value: 100 } as const, coverageDisplay: null },
    { id: "b", denominator: { kind: "conversations", value: 100 } as const, coverageDisplay: null },
    { id: "c", denominator: { kind: "conversations", value: 100 } as const, coverageDisplay: null },
    { id: "d", denominator: { kind: "intents", value: 20 } as const, coverageDisplay: null },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `z${i}`, denominator: null, coverageDisplay: null })),
    { id: "y", denominator: { kind: "conversations", value: 80 } as const, coverageDisplay: null },
    { id: "x", denominator: { kind: "conversations", value: 100 } as const, coverageDisplay: null },
  ];

  it("com a massa da tela, seis números carregam margem — não catorze", () => {
    montar(
      <SecaoDeIndicadores
        indicators={CATORZE.map((c) => ind(c as Partial<IndicatorView>))}
        partial={false}
        partialityReasons={[]}
        unsupportedIndicatorIds={[]}
      />,
    );
    // Contagem EXATA. `toBeGreaterThan(0)` deixou passar duas mutações na M27 e na M30: com dois
    // campos, mutar um só ainda deixava o outro respondendo "existe pelo menos um".
    expect(screen.getAllByRole("group")).toHaveLength(6);
  });

  it("e a palavra do produto some junto — de vinte ocorrências para seis", () => {
    montar(
      <SecaoDeIndicadores
        indicators={CATORZE.map((c) => ind(c as Partial<IndicatorView>))}
        partial={false}
        partialityReasons={[]}
        unsupportedIndicatorIds={[]}
      />,
    );
    // Seis margens × um campo ausente cada (cobertura). Antes: 14 margens × ~1,4 campos ausentes.
    expect(screen.getAllByText(pt.canonicalAnalysis.result.provenanceAbsent)).toHaveLength(6);
  });

  it("sem procedência publicada não há margem — e o número continua nomeado e legível", () => {
    montar(<ul><CartaoIndicador item={ind()} /></ul>);
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByText(pt.canonicalAnalysis.result.indicator.useful_outcome_rate.label)).toBeTruthy();
    expect(screen.getByText("80")).toBeTruthy();
    // E não sobra rótulo de procedência órfão na célula.
    expect(screen.queryByText(pt.canonicalAnalysis.result.provenanceLabel)).toBeNull();
  });

  it("basta UM campo publicado para a margem existir — o critério é o contrato, não a estética", () => {
    // Se o gate fosse "os dois campos", a cobertura sozinha perderia a casa dela. A margem existe
    // por qualquer procedência publicada; some só quando não há nenhuma.
    montar(<ul><CartaoIndicador item={ind({ coverageDisplay: "85%" })} /></ul>);
    const grupo = screen.getByRole("group");
    expect(within(grupo).getByText("85%")).toBeTruthy();
    expect(within(grupo).getAllByText(pt.canonicalAnalysis.result.provenanceAbsent)).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 2. Painel, não cartão — a borda passa a representar a REGIÃO
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 2. a rampa substituiu as caixas", () => {
  const FONTE = () => semComentarios(ler("src/features/canonical-analysis/ui/analytics/SecoesDaEngine.tsx"));

  it("nenhuma célula desenha a própria borda", () => {
    // A pergunta do owner — "qual agrupamento semântico esta borda representa?" — não tinha
    // resposta quando a borda era de cada item. Catorze bordas idênticas não agrupam nada.
    expect(FONTE()).not.toContain("rounded-lg border border-border bg-card");
  });

  it("as três listas da região usam a MESMA moldura única com fios internos", () => {
    const f = FONTE();
    // Resumo, indicadores e recomendações: uma borda por região, `gap-px` sobre `bg-border` como
    // fio interno. Duas linguagens visuais para listas vizinhas era a inconsistência medida.
    const molduras = f.match(/gap-px overflow-hidden rounded-lg border border-border bg-border/g) ?? [];
    expect(molduras).toHaveLength(3);
  });

  it("as células ficam a UMA coluna abaixo de `lg` — a margem se põe ao lado a partir de `md`", () => {
    // Medido no navegador em 834px: coluna útil 566px. Em duas colunas cada célula teria ~280px,
    // e a margem sozinha reserva 16rem (256px) — a evidência voltaria a quebrar em duas linhas,
    // que é o que a M26 mediu e recusou em três colunas no desktop.
    expect(FONTE()).toContain("lg:grid-cols-2");
    expect(semComentarios(ler("src/design/patterns/ProvenanceMargin.tsx"))).toContain("md:max-w-[16rem]");
  });

  it("controle positivo: a âncora da moldura existe mesmo no arquivo, não só no comentário", () => {
    // Sem isto, os dois casos acima passariam num arquivo vazio.
    expect(FONTE()).toContain("bg-border");
    expect(FONTE().length).toBeGreaterThan(2000);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 3. Ausência é estado — e ocupa o mesmo espaço que a presença
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 3. a região de atenção tem presença quando está vazia", () => {
  it("vazia, a frase mora numa moldura — não solta entre dois títulos", () => {
    const { container } = montar(<SecaoDeAtencao itens={[]} />);
    const frase = screen.getByText(pt.canonicalAnalysis.result.attentionNone);
    const moldura = frase.closest("div");
    expect(moldura, "a frase do estado vazio não está dentro de nenhuma moldura").toBeTruthy();
    expect(moldura!.className).toContain("border");
    // E a moldura é da REGIÃO: uma só, dentro da seção.
    expect(container.querySelectorAll("section > div.rounded-lg")).toHaveLength(1);
  });

  it("com itens, a lista usa a mesma rampa das outras regiões", () => {
    const f = semComentarios(ler("src/features/canonical-analysis/ui/analytics/SecaoDeAtencao.tsx"));
    expect(f).toContain("gap-px overflow-hidden rounded-lg border border-border bg-border");
    expect(f).not.toContain("rounded-lg border border-border bg-card px-4 py-3\n");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 4. A base vem antes do número que ela nomeia
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 4. `80 → 80` deixa de ser ambíguo", () => {
  const textoNaOrdem = (raiz: HTMLElement) =>
    Array.from(raiz.querySelectorAll("span,p,div"))
      .filter((e) => e.children.length === 0)
      .map((e) => e.textContent?.trim())
      .filter(Boolean);

  it("comparável: a base precede o valor anterior, e o atual vem depois", () => {
    const { container } = montar(
      <ComparisonRow rotulo="Taxa" antes="80" depois="92" base="anterior" delta={null} />,
    );
    const seq = textoNaOrdem(container);
    // Ordem, não presença: a base existia antes — embaixo do par, sem se amarrar a ninguém.
    expect(seq.indexOf("anterior")).toBeLessThan(seq.indexOf("80"));
    expect(seq.indexOf("80")).toBeLessThan(seq.indexOf("92"));
  });

  it("quebrada: a base continua precedendo, mesmo sem delta", () => {
    const { container } = montar(
      <ComparisonRowQuebrada rotulo="Taxa" antes="80" depois="92" base="anterior" motivo="mudou o registro" />,
    );
    const seq = textoNaOrdem(container);
    expect(seq.indexOf("anterior")).toBeLessThan(seq.indexOf("80"));
    expect(seq).toContain("mudou o registro");
  });

  it("a base não é impressa duas vezes", () => {
    montar(<ComparisonRow rotulo="Taxa" antes="80" depois="92" base="anterior" delta={null} />);
    expect(screen.getAllByText("anterior")).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 5. Composição da superfície
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 5. a ordem e as casas das regiões", () => {
  const PAGINA = () => semComentarios(ler("src/features/canonical-analysis/ui/ResultPage.tsx"));

  it("a narrativa vem antes da lista derivada dela", () => {
    const f = PAGINA();
    const tl = f.indexOf("<LinhaDoTempo");
    const cp = f.indexOf("<ComparacaoComAnterior");
    expect(tl, "`<LinhaDoTempo` não está na página").toBeGreaterThan(-1);
    expect(cp, "`<ComparacaoComAnterior` não está na página").toBeGreaterThan(-1);
    expect(tl).toBeLessThan(cp);
  });

  it("a ação de export não tem mais faixa própria — ela é o `acao` do Resumo", () => {
    const f = PAGINA();
    expect(f).toContain("acao={<AcaoDeExport");
    // A faixa de largura inteira encostada à direita foi o espaço morto medido na captura.
    expect(f).not.toContain('<div className="flex justify-end">');
  });

  it("o rótulo do item ativo da barra lateral não é mais `text-primary`", () => {
    // axe-core mediu 3,44:1 contra os 4,5:1 da AA. Quatro canais continuam marcando "ativo":
    // fundo, anel, ícone e ponto — nenhum deles é a cor do texto.
    const f = semComentarios(ler("src/shell/Sidebar.tsx"));
    expect(f).not.toContain("bg-primary/10 text-primary ring-1");
    expect(f).toContain("bg-primary/10 text-foreground ring-1");
  });

  it("nenhum rótulo de acessibilidade do shell está cravado em inglês", () => {
    const f = semComentarios(ler("src/shell/TopBar.tsx"));
    expect(f).not.toContain('aria-label="Open user menu"');
    expect(f).toContain('aria-label={t("shell.user.menu")}');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 6. A frase do export diz o que é, nos dois idiomas
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 6. cópia do export", () => {
  it("a dica nomeia quem produz o pacote sem falar de infraestrutura", () => {
    const p = pt.canonicalAnalysis.result.analytics.exportReadyHint;
    const e = en.canonicalAnalysis.result.analytics.exportReadyHint;
    for (const s of [p, e]) {
      expect(s.toLowerCase()).not.toContain("backend");
      expect(s.length).toBeGreaterThan(10);
    }
    // O sentido da D16 sobrevive: o pacote não é montado por esta tela.
    expect(p.toLowerCase()).toContain("análise");
    expect(e.toLowerCase()).toContain("analysis");
  });

  it("PT cabe no orçamento de +30% sobre EN", () => {
    const p = pt.canonicalAnalysis.result.analytics.exportReadyHint;
    const e = en.canonicalAnalysis.result.analytics.exportReadyHint;
    expect(p.length).toBeLessThanOrEqual(Math.ceil(e.length * 1.3));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 8. O índice das regiões, a prioridade nomeada e a linha de uma linha
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 8. atalho entre regiões e densidade da comparação", () => {
  it("o índice aponta para as âncoras que existem, com o nome que a seção usa", () => {
    montar(
      <IndiceDeRegioes
        regioes={[
          { ancora: "res-resumo", rotulo: pt.canonicalAnalysis.result.summaryTitle },
          { ancora: "res-trust", rotulo: pt.canonicalAnalysis.result.trustTitle },
        ]}
      />,
    );
    const nav = screen.getByRole("navigation", { name: pt.canonicalAnalysis.result.regionIndexLabel });
    const links = within(nav).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["#res-resumo", "#res-trust"]);
    expect(links.map((a) => a.textContent)).toEqual([
      pt.canonicalAnalysis.result.summaryTitle,
      pt.canonicalAnalysis.result.trustTitle,
    ]);
  });

  it("cada link do índice tem alvo de toque acima do mínimo do WCAG 2.2 AA", () => {
    // 2.5.8 pede 24×24. Texto de 14px sem padding dava ~20px de altura, e o axe não mede isso.
    montar(
      <IndiceDeRegioes
        regioes={[
          { ancora: "res-resumo", rotulo: "Resumo" },
          { ancora: "res-trust", rotulo: "Por que confiar" },
        ]}
      />,
    );
    for (const a of screen.getAllByRole("link")) {
      expect(a.className, "link do índice sem padding vertical").toContain("py-1.5");
      expect(a.className, "padding vertical não vale em elemento inline").toContain("inline-block");
    }
  });

  it("com menos de duas regiões o índice não nasce — sumário de um item é ruído", () => {
    const { container } = montar(
      <IndiceDeRegioes regioes={[{ ancora: "res-resumo", rotulo: "Resumo" }]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("as âncoras do índice são as MESMAS que os `<h2 id>` das seções", () => {
    // Índice apontando para âncora morta é pior que ausência de índice. As duas listas vivem em
    // arquivos diferentes, então o gate as confronta.
    const pagina = semComentarios(ler("src/features/canonical-analysis/ui/ResultPage.tsx"));
    const ancoras = [...pagina.matchAll(/ancora: "([^"]+)"/g)].map((m) => m[1]);
    expect(ancoras.length).toBeGreaterThanOrEqual(6);
    const fontes = [
      "src/features/canonical-analysis/ui/analytics/SecoesDaEngine.tsx",
      "src/features/canonical-analysis/ui/analytics/SecaoDeAtencao.tsx",
      "src/features/canonical-analysis/ui/analytics/PainelDeProcedencia.tsx",
      "src/features/canonical-analysis/ui/analytics/LinhaDoTempo.tsx",
      "src/features/canonical-analysis/ui/analytics/ComparacaoComAnterior.tsx",
      "src/features/canonical-analysis/ui/analytics/BlocoAnalitico.tsx",
    ].map(ler).join("\n");
    for (const a of ancoras) {
      expect(fontes, `âncora sem seção correspondente: ${a}`).toContain(`id="${a}"`);
    }
  });

  it("a recomendação NOMEIA o campo de prioridade em vez de largar `P1` solto", () => {
    montar(
      <SecaoDeRecomendacoes
        recommendations={[{ id: "r1", title: "Revisar intenções", priority: "P1" }] as never}
      />,
    );
    expect(screen.getByText(pt.canonicalAnalysis.result.recommendationPriority)).toBeTruthy();
    expect(screen.getByText("P1")).toBeTruthy();
  });

  it("o par da comparação cabe em UMA linha a partir de `sm`", () => {
    // ~950px de comparação era quase 40% da página, para dizer catorze vezes `80 → 80`. Nada foi
    // colapsado atrás de gatilho: os catorze pares seguem visíveis, na mesma ordem.
    const f = semComentarios(ler("src/design/patterns/ComparisonRow.tsx"));
    expect(f).toContain("sm:grid-cols-[minmax(0,1fr)_auto]");
    expect(f).toContain("sm:items-baseline");
  });

  it("nenhuma UI oferece ou nomeia a rota legada de configuracoes", () => {
    // A rota segue registrada no router — superfície legada, e apagá-la não é escopo. O que sai é
    // qualquer caminho pela interface até ela: item de menu, rótulo de breadcrumb, link.
    //
    // O alvo é montado em pedaços de propósito: escrito por extenso, ESTE arquivo passaria a
    // conter a rota e o gate se acusaria — foi o que aconteceu na primeira execução.
    const ALVO = ["/dashboard", "settings"].join("/");
    const arquivos: string[] = [];
    const varrer = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = `${dir}/${e.name}`;
        if (e.isDirectory()) varrer(p);
        else if (/\.tsx?$/.test(e.name) && !p.endsWith("src/app/router.tsx")) arquivos.push(p);
      }
    };
    varrer(resolve(RAIZ, "src"));
    expect(arquivos.length, "a varredura não achou arquivo nenhum").toBeGreaterThan(100);
    const culpados = arquivos.filter((p) => semComentarios(readFileSync(p, "utf-8")).includes(ALVO));
    expect(culpados.map((p) => p.replace(RAIZ, ""))).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 9. Os três achados que a própria crítica deixou abertos
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 9. estiramento, peso do export e índice no mobile", () => {
  it("a célula é coluna de altura cheia, e a glosa assenta no pé dela", () => {
    // Numa grade de duas colunas a linha assume a altura da célula mais alta. A sobra ia toda para
    // o rodapé da célula baixa, deixando as glosas das duas colunas desalinhadas entre si.
    const { container } = montar(<ul><CartaoIndicador item={ind()} /></ul>);
    const celula = container.querySelector("li")!;
    expect(celula.className).toContain("flex");
    expect(celula.className).toContain("h-full");
    expect(celula.className).toContain("flex-col");
    const glosa = screen.getByText(pt.canonicalAnalysis.result.indicator.useful_outcome_rate.description);
    const grupo = glosa.parentElement!;
    expect(grupo.className, "a glosa não é empurrada para o pé da célula").toContain("mt-auto");
    // E continua VISÍVEL: congelado pelo owner em 2026-08-10, nada de disclosure.
    expect(grupo.className).not.toContain("hidden");
    expect(glosa.textContent!.length).toBeGreaterThan(20);
  });

  it("a nota de parcialidade e a de fora de faixa acompanham a glosa no mesmo grupo", () => {
    // Se ficassem fora do grupo do pé, `mt-auto` empurraria só a glosa e a ordem de leitura
    // quebraria: explicação embaixo, ressalva solta no meio.
    montar(<ul><CartaoIndicador item={ind({ state: "partially_measured", outOfRange: true })} /></ul>);
    const glosa = screen.getByText(pt.canonicalAnalysis.result.indicator.useful_outcome_rate.description);
    const grupo = glosa.parentElement!;
    expect(within(grupo as HTMLElement).getAllByRole("note")).toHaveLength(2);
  });

  it("o export tem peso de ação secundária — sem caixa, com ícone, e continua `<button>`", () => {
    const f = semComentarios(ler("src/features/canonical-analysis/ui/analytics/AcaoDeExport.tsx"));
    expect(f).toContain('variant="ghost"');
    expect(f).not.toContain('variant="outline"');
    // `ghost` não tem borda: sem um segundo sinal, o alvo vira texto solto.
    expect(f).toContain("<Download");
    // A função não mudou: só `ready` age, e o resto continua frase.
    expect(f).toContain('estado === "ready"');
    expect(f).toContain("pedir.mutate");
  });

  it("o rótulo do índice só divide a linha a partir de `sm`", () => {
    // Medido: em 342px dividir a linha estreita a lista e ela quebra em MAIS linhas — 141px
    // contra 139. O ganho é de desktop e tablet (67→45px e 103→77px).
    const f = semComentarios(ler("src/features/canonical-analysis/ui/analytics/IndiceDeRegioes.tsx"));
    expect(f).toContain("sm:flex sm:flex-wrap sm:items-baseline");
    expect(f).toContain("sm:min-w-0 sm:flex-1");
    // Nenhuma forma que esconda: sem rolagem horizontal, sem colapso.
    expect(f).not.toContain("overflow-x-auto");
    expect(f).not.toContain("<details");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// 7. Nenhuma frase inglesa morando no locale PT
// ═══════════════════════════════════════════════════════════════════════════════════════════

describe("M31 · 7. o locale PT está em PT", () => {
  // A paridade de CHAVES já tinha gate (`i18n-paridade`), e ele estava verde: as chaves existiam
  // nos dois arquivos. O que ninguém media era o VALOR. Três frases de RES-01 estavam em inglês
  // dentro de `pt.json` — `calculationFailed`, `partiallyMeasured` e `unsupportedIndicators` — e
  // as três são renderizadas na tela: a primeira é o próprio valor do indicador quando o cálculo
  // falha. Chave presente não é tradução feita.
  const achatar = (o: unknown, pre = ""): [string, string][] =>
    typeof o === "string"
      ? [[pre, o]]
      : Object.entries(o as Record<string, unknown>).flatMap(([k, v]) =>
          achatar(v, pre ? `${pre}.${k}` : k),
        );

  it("nenhuma frase de RES-01 é idêntica à sua versão inglesa", () => {
    const ingles = new Map(achatar(en.canonicalAnalysis.result));
    // Frases, não termos: `delta`, `drift` e `P1` são iguais nos dois idiomas POR CONGELAMENTO
    // (§15), e exigir que difiram quebraria o vocabulário congelado. Duas palavras ou mais.
    const iguais = achatar(pt.canonicalAnalysis.result).filter(
      ([chave, valor]) => valor.split(/\s+/).length >= 2 && ingles.get(chave) === valor,
    );
    expect(iguais.map(([c]) => c)).toEqual([]);
  });

  it("controle positivo: o comparador enxerga uma frase idêntica quando ela existe", () => {
    // Sem isto, o caso acima passaria com um `achatar` que devolvesse lista vazia.
    const ingles = new Map(achatar(en.canonicalAnalysis.result));
    expect(ingles.size).toBeGreaterThan(100);
    const iguais = achatar({ a: "Calculation failed" }).filter(
      ([, valor]) => valor.split(/\s+/).length >= 2 && "Calculation failed" === valor,
    );
    expect(iguais).toHaveLength(1);
  });
});
