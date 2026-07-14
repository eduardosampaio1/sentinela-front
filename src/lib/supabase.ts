import { createClient } from "@supabase/supabase-js";
import { resolveProvider } from "./auth/resolveProvider";
import { assertSupabaseEnv, supabaseClientArgs } from "./auth/supabaseGuard";

const provider = resolveProvider(import.meta.env.VITE_AUTH_PROVIDER);
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// Modo supabase: preserva o guard (lança em PROD se faltar env; warn em dev).
// Modo keycloak: Supabase é opcional — nunca lança.
assertSupabaseEnv(provider, supabaseUrl, supabasePublishableKey, Boolean(import.meta.env.PROD));

// No modo keycloak sem env, usa placeholder para o createClient não quebrar (cliente nunca usado).
const args = supabaseClientArgs(provider, supabaseUrl, supabasePublishableKey);

export const supabase = createClient(args.url, args.key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: window.localStorage,
  },
});
