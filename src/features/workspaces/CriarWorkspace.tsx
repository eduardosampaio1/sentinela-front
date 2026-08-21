// Criar workspace — o fluxo INTEIRO, num componente só.
//
// Ele existe porque a criação tem DOIS passos que precisam viver juntos: pedir o nome e,
// depois, explicar por que o espaço recém-criado ainda não está na lista. Separá-los faria a
// segunda metade depender de quem chamou — e a chamada vem de dois lugares agora, o seletor da
// barra lateral e a própria página de workspaces.
//
// A primeira versão punha a confirmação como painel na página. Funcionava lá e não funcionaria
// no seletor, que é estreito: quem criasse pela barra receberia o sucesso sem a instrução, e a
// instrução é a parte que importa.
//
// ## Por que a confirmação é um diálogo, e não um toast
//
// Ela carrega uma ação que a pessoa PRECISA executar — entrar de novo. Toast some sozinho, e
// sumiria levando a única explicação de por que o espaço não aparece. Um diálogo espera.
//
// ## Por que não navegamos para dentro do espaço criado
//
// O token em mãos foi emitido antes de ele existir e não fala dele: o acesso é gravado no
// provedor de identidade, e a claim só entra num token novo. Entrar agora bateria em `403`, que
// a pessoa leria como defeito — e não como "seu acesso ainda não foi carregado".

import { useState } from "react";
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
  const { signOut } = useAuth();
  const cliente = useV1Client();
  // O nome do que nasceu. A confirmação PRECISA dizê-lo de volta: sem ele, "workspace criado"
  // não confirma nada — poderia ser qualquer um.
  const [criado, setCriado] = useState<string | null>(null);

  const criar = async (nome: string) => {
    const ws = await cliente.createWorkspace(nome);
    setCriado(ws.name);
  };

  const fechar = () => {
    setCriado(null);
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
