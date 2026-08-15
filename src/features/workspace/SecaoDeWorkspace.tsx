// M42 · CFG-03 — consultar e alterar o nome do espaço de trabalho.
//
// ## A decisão que esta seção existe para sustentar
//
// O nome que aparece aqui vem de `GET /v1/workspaces/{id}` — **nunca** da claim. A projeção de
// `/v1/me` carrega um `name` que é bootstrap e envelhece após um rename: ela responde `200`, o
// produtor responde `200`, e os dois divergem. Quem lê o errado mostra o errado com confiança,
// sem erro nenhum na tela.
//
// Por isso esta seção não recebe nome por props do shell nem lê `MeView`. Ela pede ao produtor.
//
// ## Indisponibilidade não vira nome confirmado
//
// Quando o produtor responde `503`, a seção diz *não consegui carregar* e oferece nova tentativa.
// Ela **não** cai para o nome da claim — nem como "último valor conhecido", nem em cinza, nem com
// asterisco. Um valor exibido no lugar do nome do espaço é lido como sendo o nome do espaço.
//
// ## O que não existe aqui, por decisão de contrato
//
// Criar espaço, excluir espaço, listar espaços, membros, papéis, convites, tema, idioma do espaço.
// Nem desabilitados, nem "em breve": o CRUD legado **não foi promovido**, e membership pertence ao
// provedor de identidade.

import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { CampoDeNome } from "@/shared/config/CampoDeNome";
import { useRenomearWorkspace, useWorkspaceConfig } from "./data/workspace";

export function SecaoDeWorkspace({ workspaceId }: { workspaceId: string | null }) {
  const { t } = useLanguage();
  const workspace = useWorkspaceConfig(workspaceId);
  const renomear = useRenomearWorkspace(workspaceId);
  const [confirmadoAgora, setConfirmadoAgora] = useState(false);

  if (!workspaceId) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {t("workspaceConfig.noContext")}
      </p>
    );
  }

  if (workspace.isPending) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        {t("workspaceConfig.loading")}…
      </p>
    );
  }

  // O produtor não respondeu. A seção fica indisponível — e o app continua utilizável, porque a
  // identidade e a navegação não dependem desta leitura.
  if (workspace.isError || !workspace.data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive" role="alert">
          {t("workspaceConfig.loadFailed")}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="min-h-11 rounded-xl border border-border text-foreground"
          onClick={() => workspace.refetch()}
        >
          {t("workspaceConfig.loadRetry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CampoDeNome
        confirmado={workspace.data.name}
        rotulo={t("workspaceConfig.nameLabel")}
        acao={t("workspaceConfig.save")}
        salvando={renomear.isPending}
        falhou={renomear.isError}
        confirmadoAgora={confirmadoAgora}
        textos={{
          salvando: t("workspaceConfig.saving"),
          salvo: t("workspaceConfig.saved"),
          falhou: t("workspaceConfig.saveFailed"),
          vazio: t("workspaceConfig.nameRequired"),
        }}
        onSalvar={async (nome) => {
          setConfirmadoAgora(false);
          // `mutateAsync` sem `catch` propagaria e derrubaria o handler do formulário. O erro já
          // vira estado em `renomear.isError`, e é ele que a seção mostra — sem afirmar que salvou.
          await renomear.mutateAsync(nome).then(
            () => setConfirmadoAgora(true),
            () => setConfirmadoAgora(false),
          );
        }}
      />
      {/* A identidade fica visível e NÃO é editável. Ela é a mesma que circula nas análises e nas
          Instâncias; renomear não a move, e mostrá-la aqui é o que torna isso verificável. */}
      <p className="text-xs text-muted-foreground">
        {t("workspaceConfig.identity")}: <code>{workspace.data.workspace_id}</code>
      </p>
    </div>
  );
}
