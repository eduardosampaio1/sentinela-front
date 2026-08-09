import { Navigate } from "react-router-dom";

/**
 * `/auth/reset-password` — **rota de compatibilidade**.
 *
 * Ela nasceu para receber o link do e-mail do Supabase, com um token de recuperação na URL. Esse
 * remetente não existe mais: o e-mail de recuperação passou a ser do Keycloak, e o link dele
 * aponta para o `action-token` do próprio provedor.
 *
 * A rota **não some**, por decisão do owner, e o motivo é concreto: links e favoritos antigos
 * continuam existindo no mundo, e devolver 404 a quem está justamente tentando recuperar acesso é
 * o pior momento possível para uma porta fechada. Ela também já sumiu uma vez, na Onda 6, e o
 * resultado foi 404 vindo do e-mail.
 *
 * O que ela faz agora é a coisa mínima: encaminha para o fluxo canônico. **Não** interpreta token
 * do remetente antigo — um token do Supabase não significa mais nada — **não** mantém formulário
 * e **não** inventa tela nova. `replace` para que o botão voltar não devolva a pessoa a uma rota
 * que só existe para redirecionar.
 */
export function ResetPasswordPage() {
  return <Navigate to="/forgot-password" replace />;
}
