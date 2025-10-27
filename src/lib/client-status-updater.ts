// @/lib/client-status-updater.ts
import { createApiSupabaseClient } from "@/lib/supabase/clients/api";
import { isPast, parseISO } from 'date-fns';
import { logger } from '@/utils/production-logger'

/**
 * Atualiza automaticamente o status dos clientes baseado na data de expiração
 */
export async function updateExpiredClientsStatus(): Promise<{
  success: boolean;
  updatedCount: number;
  error?: string;
}> {
  try {
    const supabase = await createApiSupabaseClient();
    
    // Buscar todos os clientes ativos ou em teste
    const { data: clients, error: fetchError } = await supabase
      .from('clients')
      .select('id, expiration_date, status')
      .in('status', ['Ativo', 'Em teste']);
    
    if (fetchError) {
      console.error('Erro ao buscar clientes:', fetchError);
      return { success: false, updatedCount: 0, error: fetchError.message };
    }
    
    if (!clients || clients.length === 0) {
      return { success: true, updatedCount: 0 };
    }
    
    // Filtrar clientes expirados
    const expiredClients = clients.filter((client: any) => {
      const expirationDate = parseISO(client.expiration_date);
      return isPast(expirationDate);
    });
    
    if (expiredClients.length === 0) {
      return { success: true, updatedCount: 0 };
    }
    
    // Atualizar status dos clientes expirados
    const clientIds = expiredClients.map((client: any) => client.id);
    
    const { error: updateError } = await supabase
      .from('clients')
      .update({ 
        status: 'Inativo',
        updated_at: new Date().toISOString()
      })
      .in('id', clientIds);
    
    if (updateError) {
      console.error('Erro ao atualizar status dos clientes:', updateError);
      return { success: false, updatedCount: 0, error: updateError.message };
    }
    
    logger.debug(`Status atualizado para ${expiredClients.length} clientes expirados`, undefined, "DEBUG");
    return { success: true, updatedCount: expiredClients.length };
    
  } catch (error) {
    console.error('Erro na atualização automática de status:', error);
    return { 
      success: false, 
      updatedCount: 0, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Verifica e atualiza o status de um cliente específico
 */
export async function checkAndUpdateClientStatus(clientId: string): Promise<{
  success: boolean;
  wasUpdated: boolean;
  newStatus?: string;
  error?: string;
}> {
  try {
    const supabase = await createApiSupabaseClient();
    
    // Buscar o cliente específico
    const { data: client, error: fetchError } = await supabase
      .from('clients')
      .select('id, expiration_date, status')
      .eq('id', clientId)
      .single();
    
    if (fetchError || !client) {
      return { success: false, wasUpdated: false, error: 'Cliente não encontrado' };
    }
    
    const expirationDate = parseISO(client.expiration_date);
    const isExpired = isPast(expirationDate);
    
    // Se o cliente está expirado mas ainda ativo ou em teste, atualizar para inativo
    if (isExpired && (client.status === 'Ativo' || client.status === 'Em teste')) {
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          status: 'Inativo',
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);
      
      if (updateError) {
        return { success: false, wasUpdated: false, error: updateError.message };
      }
      
      return { success: true, wasUpdated: true, newStatus: 'Inativo' };
    }
    
    return { success: true, wasUpdated: false };
    
  } catch (error) {
    return { 
      success: false, 
      wasUpdated: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Hook para executar a atualização automática de status em intervalos
 */
export function scheduleStatusUpdates() {
  // Executar a cada 5 minutos
  const interval = setInterval(async () => {
    const result = await updateExpiredClientsStatus();
    if (result.success && result.updatedCount > 0) {
      logger.debug(`Atualização automática: ${result.updatedCount} clientes marcados como inativos`, undefined, "DEBUG");
    }
  }, 5 * 60 * 1000); // 5 minutos
  
  return () => clearInterval(interval);
}
