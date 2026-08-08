// Baixar o que está na tela. O CSV é montado pela função pura de `result/exportar`.
//
// Este arquivo tem UMA responsabilidade além de chamar aquela função: entregar o texto ao
// navegador. Nenhuma linha do arquivo é decidida aqui — se fosse, a tela e o download poderiam
// discordar, e o download é o que sobrevive à aba.

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { exportarCsv, nomeDoArquivo } from "../../result/exportar";
import type { ResultadoResolvido } from "../../result/adaptar";

export function BotaoDeExport({
  resolvido,
}: {
  resolvido: Extract<ResultadoResolvido, { contrato: "v1" | "v2" }>;
}) {
  const { t } = useLanguage();

  function baixar() {
    const csv = exportarCsv(resolvido);
    // BOM: sem ele o Excel abre UTF-8 como ANSI e os acentos dos rótulos viram lixo. O arquivo
    // continua UTF-8 válido para todo o resto.
    //
    // Escapado, e não o caractere literal: um BOM cru no meio do fonte é invisível no editor, e
    // o lint o acusa como "irregular whitespace" — com razão, porque ninguém consegue revisar o
    // que não vê.
    const BOM = "﻿";
    const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeDoArquivo(resolvido.view.analysisId);
    link.click();
    // Revogar é obrigatório: cada objeto URL segura o Blob inteiro em memória até a aba morrer.
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" onClick={baixar}>
        {t("canonicalAnalysis.result.analytics.export")}
      </Button>
      <p className="text-xs text-muted-foreground">
        {t("canonicalAnalysis.result.analytics.exportHint")}
      </p>
    </div>
  );
}
