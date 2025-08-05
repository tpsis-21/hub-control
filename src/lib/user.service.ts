import { createClientSupabaseClient } from "./supabase-client";
export async function getUserById(id: string) {
  const supabase = createClientSupabaseClient();
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}