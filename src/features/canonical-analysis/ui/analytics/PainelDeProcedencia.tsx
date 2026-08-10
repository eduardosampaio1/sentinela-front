// M28 — Trust: "por que confiar neste resultado?" (Blueprint §10).
//
// ## O DoD é literal e governa a forma
//
// *"cada elemento exibido tem origem canônica apontável."* Então cada linha imprime, junto do
// valor, o CAMPO que a produziu. Não é decoração de auditor: é o que separa procedência de
// metadado jogado no rodapé.
//
// ## Por que NÃO tem marginália aqui
//
// T1 — a assinatura do programa — põe procedência ao lado do número. Mas o Ataque 3 do DESIGN-05
// §4 fechou o escopo dela na resposta que a sustentou: *"marginália é de indicador publicado, não
// de todo número na tela"*. Trust de documento não é indicador publicado. Dar-lhe marginália
// transformaria a assinatura em papel de parede — que é exatamente o ataque que ela sobreviveu.
//
// ## Por que NÃO é um cartão por campo
//
// Linear separa por *"borda e alinhamento"*, não por caixa (§3, linha 1), e o `/design-critique`
// do §5 pede **painel, não cartão**. Três zonas fixas com régua à esquerda — Documento, Projeção,
// Privacidade — para o `/ux-heuristics` do §5: *"o olho precisa aprender onde as coisas moram"*.
//
// ## O que não entra
//
// Nenhum "trust score". O Blueprint §10 abre com isso: *"Só informação canônica existente. Nenhum
// trust score inventado."* Digest não vira selo de bom/ruim — ele é identidade, não nota.
//
// Campo ausente vira a palavra do produto. Um digest vazio não é um digest ruim.

import { useLanguage } from "@/contexts/LanguageContext";

/** Uma linha de procedência: o que é, o valor, e o CAMPO canônico que o produziu. */
export interface ElementoDeProcedencia {
  readonly rotulo: string;
  readonly valor: string | null;
  /** O nome do campo no contrato. É o "apontável" do DoD. */
  readonly campo: string;
}

export interface ZonaDeProcedencia {
  readonly titulo: string;
  readonly elementos: readonly ElementoDeProcedencia[];
}

function Zona({ zona, ausente, origem }: { zona: ZonaDeProcedencia; ausente: string; origem: string }) {
  if (zona.elementos.length === 0) return null;
  return (
    <div className="border-l border-border pl-4">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
        {zona.titulo}
      </p>
      <dl className="mt-2 space-y-1.5">
        {zona.elementos.map((e) => (
          <div key={e.campo} className="flex flex-wrap items-baseline gap-x-2">
            <dt className="text-xs text-muted-foreground">{e.rotulo}</dt>
            {/* A origem vive DENTRO do `<dd>`: ela descreve o valor, e `<span>` solto como
                filho de `<dl>` é violação de `definition-list` — o axe pegou na primeira
                execução. */}
            <dd className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-xs font-medium tabular-nums text-foreground">
                {e.valor ?? ausente}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {origem}: {e.campo}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PainelDeProcedencia({ zonas }: { zonas: readonly ZonaDeProcedencia[] }) {
  const { t } = useLanguage();
  const ausente = t("canonicalAnalysis.result.provenanceAbsent");
  const origem = t("canonicalAnalysis.result.trustSource");

  return (
    <section aria-labelledby="res-trust" className="space-y-3">
      <div>
        <h2 id="res-trust" className="text-lg font-semibold text-foreground">
          {t("canonicalAnalysis.result.trustTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("canonicalAnalysis.result.trustIntro")}
        </p>
      </div>

      {/* Zonas fixas, lado a lado no desktop e empilhadas no mobile. A informação é a MESMA nos
          dois — muda a forma, nunca o conteúdo. */}
      <div className="grid gap-4 md:grid-cols-3">
        {zonas.map((z) => (
          <Zona key={z.titulo} zona={z} ausente={ausente} origem={origem} />
        ))}
      </div>
    </section>
  );
}
