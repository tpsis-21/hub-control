import { createBrowserSupabaseClient } from './supabase/clients/browser';
export async function getUserById(id: string) {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}
