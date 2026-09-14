// Criar workspace — o fluxo INTEIRO, num componente só.
//
// Ele existe porque a criação tem DOIS passos que precisam viver juntos: pedir o nome e,
// depois, renovar as claims e confirmar a membership pela projeção pública. Separá-los faria a
// ativação depender de quem chamou — e a chamada vem do seletor e da página de workspaces.
//
// A primeira versão punha a confirmação como painel na página. Funcionava lá e não funcionaria
// no seletor, que é estreito: quem criasse pela barra receberia o sucesso sem a instrução, e a
// instrução é a parte que importa.
//
// ## Por que a confirmação é um diálogo, e não um toast
//
// O diálogo só aparece no fallback: quando o Workspace nasceu, mas a renovação silenciosa não
// confirmou a membership. Ele preserva uma saída explícita em vez de fingir sucesso completo.
//
// ## Por que não navegamos para dentro do espaço criado
//
// O token em mãos foi emitido antes de o Workspace existir. Por isso renovamos a sessão e só
// navegamos depois que `/v1/me` confirmar a nova claim.

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CriarPorNome } from "@/design/patterns";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useV1Client } from "@/features/canonical-analysis/data/client";

export function CriarWorkspace({
  aberto,
  aoFechar,
}: {
  aberto: boolean;
  aoFechar: () => void;
}) {
  const { t } = useLanguage();
  const { activateWorkspace, signOut } = useAuth();
  const navigate = useNavigate();
  const cliente = useV1Client();
  // O nome do que nasceu. A confirmação PRECISA dizê-lo de volta: sem ele, "workspace criado"
  // não confirma nada — poderia ser qualquer um.
  const [criado, setCriado] = useState<string | null>(null);
  const operacao = useRef<{ name: string; key: string } | null>(null);

  const criar = async (nome: string) => {
    if (!operacao.current || operacao.current.name !== nome) {
      operacao.current = { name: nome, key: crypto.randomUUID() };
    }
    const ws = await cliente.createWorkspace(nome, { idempotencyKey: operacao.current.key });
    const ativado = await activateWorkspace(ws.workspace_id);
    if (ativado) {
      operacao.current = null;
      aoFechar();
      navigate("/home", { replace: true });
      return;
    }
    // Fallback honesto: o recurso existe, mas a nova claim ainda não foi confirmada.
    // Mantemos o nome e oferecemos o login novamente; não fingimos que a ativação ocorreu.
    setCriado(ws.name);
  };

  const fechar = () => {
    setCriado(null);
    operacao.current = null;
    aoFechar();
  };

  if (criado) {
    return (
      <Dialog open={aberto} onOpenChange={(v) => !v && fechar()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("workspacesPage.createdTitle")}</DialogTitle>
            <DialogDescription>
              {t("workspacesPage.createdBody", { name: criado })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2 sm:gap-2">
            <Button type="button" variant="ghost" onClick={fechar}>
              {t("workspacesPage.createdLater")}
            </Button>
            <Button type="button" onClick={() => void signOut()}>
              {t("workspacesPage.createdCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <CriarPorNome
      aberto={aberto}
      aoFechar={aoFechar}
      aoCriar={criar}
      textos={{
        titulo: t("workspacesPage.createTitle"),
        descricao: t("workspacesPage.createDescription"),
        rotulo: t("workspacesPage.createLabel"),
        ajuda: t("workspacesPage.createHelp"),
        exemplo: t("workspacesPage.createExample"),
        enviar: t("workspacesPage.createSubmit"),
        enviando: t("workspacesPage.createSubmitting"),
        cancelar: t("workspacesPage.createCancel"),
        erroVazio: t("workspacesPage.createEmptyError"),
        erroAoCriar: t("workspacesPage.createFailed"),
      }}
    />
  );
}
