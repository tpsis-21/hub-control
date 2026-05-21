// src/lib/system-settings.ts
import { createClientSupabaseClient } from './supabase/clients/browser';
import { logger } from '@/utils/production-logger'

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
    const supabase = createClientSupabaseClient();
    const { data, error } = await (supabase as any)
      .from('system_config')
      .select('value')
      .eq('key', 'app.allow_new_registrations')
      .single();
    
    if (error || !data) {
      return DEFAULT_SETTINGS.allow_new_registrations;
    }
    
    // O valor está armazenado como JSONB, então precisamos fazer parse
    return (data as any).value === true || (data as any).value === 'true';
  } catch (error) {
    console.error('Erro ao verificar configurações de registro:', error);
    return DEFAULT_SETTINGS.allow_new_registrations;
  }
}

// Função para obter todas as configurações do sistema
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const supabase = createClientSupabaseClient();
    const { data, error } = await (supabase as any)
      .from('system_config')
      .select('key, value')
      .like('key', 'app.%');
    
    if (error || !data) {
      return DEFAULT_SETTINGS;
    }
    
    const settings: SystemSettings = { ...DEFAULT_SETTINGS };
    (data as Array<{ key: string; value: any }>).forEach(({ key, value }) => {
      const settingKey = key.replace('app.', '') as keyof SystemSettings;
      switch (settingKey) {
        case 'allow_new_registrations':
          settings.allow_new_registrations = value === true || value === 'true';
          break;
        case 'max_users':
          settings.max_users = Number(value);
          break;
        case 'maintenance_mode':
          settings.maintenance_mode = value === true || value === 'true';
          break;
        default:
          break;
      }
    });
    
    return settings;
  } catch (error) {
    console.error('Erro ao obter configurações do sistema:', error);
    return DEFAULT_SETTINGS;
  }
}

// Função para atualizar uma configuração do sistema
export async function updateSystemSetting(key: keyof SystemSettings, value: boolean | number): Promise<boolean> {
  try {
    const supabase = createClientSupabaseClient();
    const configKey = `app.${key}`;
    
    console.log('Atualizando configuração:', { key: configKey, value, type: typeof value });
    
    const { data, error } = await supabase
      .from('system_config')
      .upsert({
        key: configKey,
        value: value,
        description: `Configuração ${key}`,
        category: 'app',
        is_public: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .select();
    
    if (error) {
      console.error('Erro detalhado ao atualizar configuração:', {
        error,
        key: configKey,
        value,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }
    
    console.log(`Configuração ${key} atualizada com sucesso:`, { value, data });
    return true;
  } catch (error) {
    console.error('Erro de exceção ao atualizar configuração do sistema:', {
      error,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined
    });
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
    
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .or(`id.eq.${session.user.id},user_id.eq.${session.user.id}`)
      .maybeSingle();

    return !error && data?.role === 'admin';
  } catch (error) {
    console.error('Erro ao verificar se usuário é admin:', error);
    return false;
  }
}
