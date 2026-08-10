// M28 — do documento canônico para as zonas de Trust.
//
// Puro: recebe o view model já resolvido e devolve linhas. Não busca, não formata número, não
// deduz. Cada linha carrega o CAMPO de contrato que a produziu — é o DoD da missão, e é por isso
// que `campo` não é opcional.
//
// ## O que entra, e de onde
//
// Blueprint §10 lista 11 informações de Trust. Nem todas vivem no mesmo lugar, e a decisão de
// owner sobre os dois portadores de Analytics fecha de onde ler: **depois que o documento canônico
// existe, é ele a referência da composição**. Então aqui só entra o que o DOCUMENTO carrega.
//
// `snapshot_digest`, `projection_digest`, `disclosure_rule_version` e `generated_at` existem no
// read model de `GET /analytics` e **não** no view model do documento. Buscá-los no endpoint
// enquanto o documento está montado faria as duas fontes aparecerem lado a lado na mesma
// composição — exatamente o que a decisão de owner proíbe. Ficam declarados como dívida, não
// preenchidos por conveniência.
//
// `method_*`, `privacy_policy_version` e `min_group_size` são de CADA projeção aninhada, não do
// documento: eles pertencem ao bloco que descrevem, e subi-los para uma zona de documento
// afirmaria que valem para a projeção inteira.

import type { ResultadoResolvido } from "./adaptar";
import type { ZonaDeProcedencia } from "../ui/analytics/PainelDeProcedencia";

type Resolvido = Extract<ResultadoResolvido, { contrato: "v1" | "v2" }>;

export function zonasDeProcedencia(
  resolvido: Resolvido,
  t: (chave: string) => string,
): readonly ZonaDeProcedencia[] {
  const v = resolvido.view;

  const documento: ZonaDeProcedencia = {
    titulo: t("canonicalAnalysis.result.trustDocument"),
    elementos: [
      {
        rotulo: t("canonicalAnalysis.result.provContractDoc"),
        valor: v.schemaVersion || null,
        campo: "result_schema_version",
      },
      {
        rotulo: t("canonicalAnalysis.result.provRegistryDoc"),
        valor: v.indicatorRegistryVersion || null,
        campo: "indicator_registry_version",
      },
    ],
  };

  // O v1 não tem bloco analítico: as zonas de projeção e privacidade seriam caixas vazias, e uma
  // caixa vazia afirma que existe algo ali que não foi preenchido.
  if (resolvido.contrato === "v1") return [documento];

  const analytics = resolvido.view.analytics;
  // `measurement_contract_version` EXISTE no view model do v2 e **não** está entre as 11
  // informações do Blueprint §10. Eu o havia incluído; o gate que compara os campos impressos com
  // a tabela §10 reprovou, e estava certo — a lista de Trust é autoridade, e acrescentar um 12º
  // elemento não é decisão desta missão. Fica registrado como dívida, fora da tela.
  return [
    documento,
    {
      titulo: t("canonicalAnalysis.result.trustProjection"),
      elementos: [
        {
          rotulo: t("canonicalAnalysis.result.analytics.provSnapshot"),
          valor: analytics.lineage.snapshotContractVersion || null,
          campo: "analytics.snapshot_contract_version",
        },
      ],
    },
    {
      titulo: t("canonicalAnalysis.result.trustPrivacy"),
      elementos: [
        {
          rotulo: t("canonicalAnalysis.result.provOmission"),
          // O ESTADO da omissão, nunca o que foi omitido. `withheld` é conclusão publicada; o
          // conteúdo retido não viaja no documento, e nomeá-lo descreveria a população que a
          // retenção existe para proteger.
          valor: t(`canonicalAnalysis.result.analytics.state.${analytics.status}`),
          campo: "analytics.component_status",
        },
      ],
    },
  ];
}
