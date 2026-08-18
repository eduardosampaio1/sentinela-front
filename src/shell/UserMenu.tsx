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
//
// ## Perfil entrou aqui, e Configurações NÃO — e a diferença é uma decisão registrada
//
// O owner clicou no ícone do usuário procurando conta e configurações. O menu abriu com UM item,
// "Sair", porque o provedor desta instalação não expõe Account Console e o link some.
//
// `/profile` estava roteada, completa e **inalcançável pela interface**: dava para chegar
// digitando o endereço, e só. Tela construída que ninguém liga é o mesmo defeito que esta casa
// caça no dado; aqui ele estava na navegação. Ela entra.
//
// **`/dashboard/settings` NÃO entra.** Minha primeira versão a ligou também, e um gate a
// derrubou: `res01-m31` proíbe *"qualquer caminho pela interface"* até ela, porque é
// **superfície legada** — a rota fica registrada no router, e o que foi removido de propósito
// foram os caminhos. Eu tinha lido "órfã" onde estava escrito "aposentada", e a diferença é
// exatamente o que separa consertar de reabrir.
//
// **O vocabulário é o que já existe:** `account.profileTitle` é o título da própria página.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthClient } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";

/** A classe dos itens do menu. Uma só: três cópias divergem no primeiro ajuste. */
const ITEM =
  "w-full text-left px-2 py-1.5 rounded-lg text-xs text-muted-foreground " +
  "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

export function UserMenu({ recolhida = false }: { readonly recolhida?: boolean }) {
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
        className="w-full flex items-center justify-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="w-7 h-7 rounded-full bg-primary/[0.12] border border-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-foreground">{iniciais(nome)}</span>
        </span>
        {/* Recolhido, sobram as INICIAIS — que já são o avatar. O nome sai da tela e fica no
            `aria-label` do botão, que nunca dependeu dele para ter nome acessível. */}
        {recolhida ? null : (
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-xs font-semibold text-muted-foreground truncate leading-tight">
              {nome}
            </span>
          </span>
        )}
      </button>

      {aberto && (
        <div role="menu" aria-label={t("shell.user.menu")} className="mt-1 space-y-0.5">
          {/* AUTH-05 — link EXTERNO. Ausente quando o provedor não tem Account Console.
              Fica PRIMEIRO: é a ação principal de conta quando existe, e `shell-m25` afirma
              por teclado que ele é o primeiro foco depois de abrir o menu. */}
          {contaUrl && (
            <a
              role="menuitem"
              href={contaUrl}
              target="_blank"
              rel="noreferrer noopener"
              title={t("shell.user.accountHint")}
              className={`block ${ITEM}`}
            >
              {t("shell.user.account")}
            </a>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setAberto(false);
              navigate("/profile");
            }}
            className={ITEM}
          >
            {t("account.profileTitle")}
          </button>
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
