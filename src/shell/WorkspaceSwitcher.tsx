// M25 — o escopo de tenant, SEMPRE visível, e a troca que não contamina.
//
// ## Por que a troca passa por aqui, e não pelo `AuthContext`
//
// `switchWorkspace` do `AuthContext` valida contra a projeção de `/v1/me` — pedir não é pertencer
// — e é só isso que ele faz. O descarte do cache canônico vive em `onWorkspaceSwitch`, que até a
// M25 **não tinha chamador de produção**: existia, estava testado, e nenhum caminho real o
// alcançava. Este componente é o chamador. Não há mecanismo novo de invalidação — o seam é o que
// já existia.
//
// A ORDEM importa e é o contrato desta peça:
//
//     1. trocar o escopo          (os observadores re-chaveiam para o workspace novo)
//     2. descartar a raiz ANTIGA  (`workspaceKeys.root(anterior)`)
//
// Invertendo, os observadores ainda montados no workspace antigo repovoariam o que acabou de ser
// removido. Contaminar o workspace NOVO é impossível por construção — toda chave começa por
// `["workspace", id]` —, então o que a ordem protege é o descarte, não o isolamento.
//
// ## O papel NÃO aparece
//
// D3: "não mostrar 'Admin' em badge, chip, seletor ou texto. Papel só informa quando existe outro
// papel possível". O `role` chega na projeção e governa comportamento onde houver; ele não é
// decoração. Antes da M25 o shell o imprimia sob o nome do workspace.

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { onWorkspaceSwitch } from "@/lib/v1";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { workspace, memberships, switchWorkspace } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [aberto, setAberto] = useState(false);

  async function trocar(alvo: string) {
    const anterior = workspace?.id ?? null;
    if (alvo === anterior) {
      setAberto(false);
      return;
    }
    // 1) o escopo muda primeiro: `switchWorkspace` recusa quem não está na projeção.
    if (!switchWorkspace(alvo)) return;
    setAberto(false);
    onNavigate?.();
    // 2) e só então a raiz antiga é cancelada e removida.
    await onWorkspaceSwitch(queryClient, anterior);
  }

  // Sem workspace ativo o escopo continua visível — dizer "nenhum" é informação, e some-lo faria
  // a ausência parecer um estado de carregamento que nunca termina.
  const rotulo = workspace?.name ?? t("shell.workspace.none");
  // WS-02/WS-04 não têm operação pública: com um único workspace não há troca a oferecer, e um
  // botão que abre uma lista de um item é um CTA que não leva a lugar nenhum.
  const podeTrocar = memberships.length > 1;

  return (
    <div className="px-4 py-3 border-b border-border">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">
        {t("shell.workspace.label")}
      </p>

      {podeTrocar ? (
        <>
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-haspopup="listbox"
            aria-label={t("shell.workspace.switch")}
            className="w-full text-left text-xs font-semibold text-foreground truncate leading-tight rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {rotulo}
          </button>

          {aberto && (
            <ul
              role="listbox"
              aria-label={t("shell.workspace.list")}
              className="mt-2 space-y-0.5"
            >
              {memberships.map((m) => {
                const ativo = m.id === workspace?.id;
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={ativo}
                      onClick={() => void trocar(m.id)}
                      className={cn(
                        "w-full text-left px-2 py-1.5 rounded-lg text-xs truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        ativo
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      {/* Só o NOME. O papel governa, não rotula (D3). */}
                      {m.name}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <p className="text-xs font-semibold text-foreground truncate leading-tight">{rotulo}</p>
      )}
    </div>
  );
}
