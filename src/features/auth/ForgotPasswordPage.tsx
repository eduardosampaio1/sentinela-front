import { KeycloakRedirect } from "./KeycloakRedirect";

/**
 * `/forgot-password` — a recuperação é hospedada pelo provedor (D19).
 *
 * Antes da M02 esta página tinha duas metades: o redirect, para Keycloak, e um formulário de
 * e-mail que chamava `supabase.auth.resetPasswordForEmail`. A segunda metade já era inalcançável
 * — `supportsPasswordForms()` devolve `false` desde que o Keycloak assumiu — e saiu com a
 * erradicação. O comportamento visível é o mesmo que a M01 aprovou.
 */
export function ForgotPasswordPage() {
  return <KeycloakRedirect mode="reset" />;
}
