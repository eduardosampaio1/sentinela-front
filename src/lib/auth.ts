import { supabase } from "./supabase";
import { ensureUserWorkspace } from "./workspaces";

export async function signUp(email: string, password: string) {
  const response = await supabase.auth.signUp({ email, password });

  const user = response.data.user;
  if (user) {
    await ensureUserWorkspace(user.id, user.email);
  }

  return response;
}

export async function signIn(email: string, password: string) {
  const response = await supabase.auth.signInWithPassword({ email, password });

  const user = response.data.user;
  if (user) {
    await ensureUserWorkspace(user.id, user.email);
  }

  return response;
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}