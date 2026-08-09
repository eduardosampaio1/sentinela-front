import { KeycloakRedirect } from "./KeycloakRedirect";

/**
 * `/register` — criação de conta hospedada pelo provedor.
 *
 * Mesma história de `ForgotPasswordPage`: o formulário que chamava `supabase.auth.signUp` já era
 * inalcançável sob Keycloak e saiu na M02. Quem decide se o auto-cadastro existe é o realm
 * (`registrationAllowed`), não a SPA.
 */
export function RegisterPage() {
  return <KeycloakRedirect mode="register" />;
}
