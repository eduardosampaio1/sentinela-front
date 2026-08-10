// M25 — o menu do usuário, e a saída para a conta.
//
// ## D19: credencial não se gerencia aqui
//
// "Alteração de senha/credencial SAI da SPA e usa o Account Management do provedor canônico. Não
// criar backend novo para reproduzir formulário de identidade."
//
// A capacidade já existia — `authClient.accountManagementUrl()` — e era alcançável só por dentro
// de `ProfilePage`, num caminho que exigia tentar trocar a senha para ser desviado. A M25 a põe
// onde o Blueprint a coloca (AUTH-05, "menu do usuário → Account Management"), sem duplicar
// lógica: o link é o MESMO cliente de auth, chamado direto.
//
// Quando o provedor não expõe Account Console, `accountManagementUrl()` devolve `null` e o item
// **não aparece**. Um link morto seria pior que a ausência: prometeria uma porta que não abre.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthClient } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

function nomeExibido(user: ReturnType<typeof useAuth>["user"]): string {
  const meta = user?.user_metadata as Record<string, unknown> | undefined;
  return (
    (meta?.full_name as string | undefined) ??
    (meta?.name as string | undefined) ??
    user?.email ??
    "User"
  );
}

function iniciais(nome: string): string {
  const partes = nome.split(/\s+/).filter(Boolean);
  if (partes.length >= 2) return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
  return nome.slice(0, 2).toUpperCase();
}

export function UserMenu() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [aberto, setAberto] = useState(false);

  const nome = nomeExibido(user);
  const contaUrl = getAuthClient().accountManagementUrl();

  async function sair() {
    setAberto(false);
    await signOut();
    navigate("/login");
  }

  return (
    <div className="px-3 py-3 border-t border-border">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        aria-label={t("shell.user.menu")}
        className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="w-7 h-7 rounded-full bg-primary/[0.12] border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-foreground">{iniciais(nome)}</span>
        </span>
        <span className="flex-1 min-w-0 text-left">
          <span className="block text-xs font-semibold text-muted-foreground truncate leading-tight">
            {nome}
          </span>
        </span>
      </button>

      {aberto && (
        <div role="menu" aria-label={t("shell.user.menu")} className="mt-1 space-y-0.5">
          {/* AUTH-05 — link EXTERNO. Ausente quando o provedor não tem Account Console. */}
          {contaUrl && (
            <a
              role="menuitem"
              href={contaUrl}
              target="_blank"
              rel="noreferrer noopener"
              title={t("shell.user.accountHint")}
              className="block px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("shell.user.account")}
            </a>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => void sair()}
            className="w-full text-left px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("shell.user.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
