// F3 — a FRONTEIRA do `analysis-result-v3`: envelope público → documento, ou recusa.
//
// ## Por que ela não mora em `data/`
//
// A primeira versão punha `resolverLeituraArgos` junto do hook, e o cadeado BACKEND FIRST da
// casa reprovou — corretamente. `data/` TRANSPORTA; quem conhece o shape do documento é a
// camada de contrato. Com a validação no hook, qualquer consumidor novo teria de importar o
// transporte para entender o documento, e a regra de evolução do contrato passaria a viver em
// dois lugares.
//
// ## Um modelo por CONTRATO
//
// A prova da fonte única não proíbe dois leitores — proíbe dois modelos do MESMO contrato. O
// v1 tem `adapter.ts`, o v2 tem `adapterV2.ts`, e o v3 tem este. A lista cresceu do mesmo jeito
// quando o v2 nasceu.
//
// ## Sem queda silenciosa
//
// Um envelope que não se declara v3 é RECUSADO, e a recusa carrega o motivo. Oferecê-lo ao
// adapter do v1 "para aproveitar algo" faria o v1 aceitar a espinha comum e descartar as dez
// outras famílias sem nada na tela denunciando.

import type { AnalysisResultView } from "@/lib/v1";
import {
  validarResultadoV3,
  type AnalysisResultV3Document,
  type MotivoDeRecusaV3,
} from "./contratoV3";

/** O que a visão ARGOS recebe: o documento, ou a recusa com motivo. */
export type LeituraArgos =
  | { estado: "ok"; documento: AnalysisResultV3Document; registryVersion: string }
  | { estado: "recusado"; reason: MotivoDeRecusaV3; schemaVersion: string };

export function resolverLeituraArgos(publico: AnalysisResultView): LeituraArgos {
  const v = validarResultadoV3(publico.result_schema_version, publico.result);
  if (v.status === "ok") {
    return {
      estado: "ok",
      documento: v.documento,
      registryVersion: publico.indicator_registry_version,
    };
  }
  return {
    estado: "recusado",
    reason: v.reason,
    schemaVersion:
      typeof publico.result_schema_version === "string" ? publico.result_schema_version : "",
  };
}
