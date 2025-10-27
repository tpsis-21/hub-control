// @/app/(app)/configuracoes/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClientForActions } from "@/lib/supabase/clients/server";
import type { Settings } from "@/lib/types";
import { settingsSchema } from "@/lib/schemas";

const defaultSettings: Omit<Settings, 'bot_api_key'> & { bot_api_key?: string } = {
  id: 'main',
  company_name: null,
  primary_color: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Substituir todas as operações Firestore por chamadas Supabase
const settingsTable = 'settings';
const settingsId = 'main';

// Getter
export async function getSettings(): Promise<Settings> {
  const supabase = await createServerSupabaseClientForActions();
  const { data, error } = await supabase.from(settingsTable).select('*').eq('id', settingsId).single();
  if (data) {
    return {
      ...defaultSettings,
      ...data,
      bot_api_key: data.bot_api_key || `secret_key_${new Date().getTime()}`,
    } as Settings;
  } else {
    // Se as configurações não existem, cria com valores padrão, incluindo uma nova botApiKey
    const newSettings = {
      ...defaultSettings,
      bot_api_key: `secret_key_${new Date().getTime()}`,
      id: settingsId,
    };
    await supabase.from(settingsTable).insert([newSettings]);
    return newSettings;
  }
}

// Saver
export async function saveSettingsAction(data: z.infer<typeof settingsSchema>) {
  const supabase = await createServerSupabaseClientForActions();
  const { error } = await supabase.from('settings').upsert([data]);
  revalidatePath('/configuracoes');
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function generateNewApiKeyAction() {
    const newKey = `secret_key_${new Date().getTime()}${Math.random().toString(36).substring(2, 10)}`;
    const currentSettings = await getSettings();
    const result = await saveSettingsAction({ ...currentSettings, bot_api_key: newKey });
    if(result.success) {
        return { success: true, newApiKey: newKey };
    }
    return { success: false, error: "Falha ao gerar nova chave de API." };
}

