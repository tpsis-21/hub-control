// src/lib/system-settings.ts
import { createClientSupabaseClient } from './supabase-client';

// Configurações padrão do sistema
const DEFAULT_SETTINGS = {
  allow_new_registrations: true,
  max_users: 1000,
  maintenance_mode: false,
};

// Interface para configurações do sistema
export interface SystemSettings {
  allow_new_registrations: boolean;
  max_users: number;
  maintenance_mode: boolean;
}

// Função para verificar se novos cadastros estão permitidos
export async function areRegistrationsAllowed(): Promise<boolean> {
  try {
    // Por enquanto, usar configuração local até termos a tabela system_settings
    // TODO: Implementar consulta à tabela system_settings quando estiver disponível
    
    // Verificação temporária - permitir cadastros por padrão
    return true;
    
    // Código futuro para consultar a tabela:
    // const supabase = createClientSupabaseClient();
    // const { data, error } = await supabase
    //   .from('system_settings')
    //   .select('setting_value')
    //   .eq('setting_key', 'allow_new_registrations')
    //   .single();
    // 
    // if (error || !data) {
    //   return DEFAULT_SETTINGS.allow_new_registrations;
    // }
    // 
    // return data.setting_value === 'true';
  } catch (error) {
    console.error('Erro ao verificar configurações de registro:', error);
    return DEFAULT_SETTINGS.allow_new_registrations;
  }
}

// Função para obter todas as configurações do sistema
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    // Por enquanto, retornar configurações padrão
    return DEFAULT_SETTINGS;
    
    // Código futuro para consultar a tabela:
    // const supabase = createClientSupabaseClient();
    // const { data, error } = await supabase
    //   .from('system_settings')
    //   .select('*');
    // 
    // if (error || !data) {
    //   return DEFAULT_SETTINGS;
    // }
    // 
    // const settings = { ...DEFAULT_SETTINGS };
    // data.forEach(setting => {
    //   if (setting.setting_key in settings) {
    //     settings[setting.setting_key] = setting.setting_value === 'true';
    //   }
    // });
    // 
    // return settings;
  } catch (error) {
    console.error('Erro ao obter configurações do sistema:', error);
    return DEFAULT_SETTINGS;
  }
}

// Função para atualizar uma configuração do sistema
export async function updateSystemSetting(key: keyof SystemSettings, value: boolean | number): Promise<boolean> {
  try {
    // Por enquanto, apenas simular a atualização
    console.log(`Configuração ${key} atualizada para:`, value);
    return true;
    
    // Código futuro para atualizar a tabela:
    // const supabase = createClientSupabaseClient();
    // const { error } = await supabase
    //   .from('system_settings')
    //   .upsert({
    //     setting_key: key,
    //     setting_value: value.toString(),
    //     updated_at: new Date().toISOString()
    //   });
    // 
    // return !error;
  } catch (error) {
    console.error('Erro ao atualizar configuração do sistema:', error);
    return false;
  }
}

// Função para verificar se o usuário é administrador
export async function isUserAdmin(): Promise<boolean> {
  try {
    const supabase = createClientSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return false;
    }
    
    // Verificar se é o administrador principal
    if (session.user.email === 'topplaytv7@gmail.com') {
      return true;
    }
    
    // Verificar na tabela profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    return !error && data?.role === 'admin';
  } catch (error) {
    console.error('Erro ao verificar se usuário é admin:', error);
    return false;
  }
}