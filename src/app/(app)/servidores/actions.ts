// @/app/(app)/servidores/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createApiSupabaseClient } from "@/lib/supabase-api";
import type { Server } from "@/lib/types";
import { serverFormSchema, editServerSchema } from "@/lib/schemas";

// Busca todos os servidores cadastrados no banco Supabase
export async function getServers(): Promise<Server[]> {
    const supabase = await createApiSupabaseClient();
    const { data, error } = await supabase.from('servers').select('*');
    if (error) {
      console.error('Error fetching servers:', error);
      return [];
    }
    // Mapear propriedades do banco para o tipo Server
    const servers = (data || []).map(server => ({
      id: server.id,
      name: server.name,
      url: server.url,
      apiKey: server.api_key,
      status: server.status,
      integrationType: server.integration_type,
      testAutomation: server.test_automation,
      renewalAutomation: server.renewal_automation,
      paymentGateway: server.payment_gateway,
      sendExpirationReminder: server.send_expiration_reminder,
      sendUsageInstructions: server.send_usage_instructions,
      testConfig: server.test_config,
      credits: server.credits,
      lastCreditsSync: server.last_credits_sync,
      panelServerId: server.panel_server_id,
      createdAt: server.created_at,
      updatedAt: server.updated_at,
    }));
    return servers as unknown as Server[];
}

// Adiciona um novo servidor, ajustando automações conforme o tipo de integração
export async function addServerAction(data: z.infer<typeof serverFormSchema>) {
  const supabase = await createApiSupabaseClient();
  
  // O panel_server_id será gerado automaticamente pelo trigger do banco de dados
  
  const isManual = data.integrationType === 'none';
  const newServerData = {
    name: data.name,
    url: data.url,
    api_key: data.apiKey,
    status: data.status,
    integration_type: data.integrationType,
    test_automation: isManual ? false : data.testAutomation,
    renewal_automation: isManual ? false : data.renewalAutomation,
    payment_gateway: isManual ? false : data.paymentGateway,
    send_expiration_reminder: typeof data.sendExpirationReminder === 'boolean' ? data.sendExpirationReminder : true,
    send_usage_instructions: typeof data.sendUsageInstructions === 'boolean' ? data.sendUsageInstructions : true,
    test_config: data.testConfig || null,
    // panel_server_id será gerado automaticamente pelo trigger
  };
  
  const { data: inserted, error } = await supabase.from('servers').insert([newServerData]).select().single();
  revalidatePath('/servidores');
  if (error || !inserted) return { success: false, error: error?.message || 'Erro ao adicionar servidor' };
  return { success: true, server: inserted as unknown as Server };
}

// Edita um servidor existente, garantindo consistência das automações
export async function editServerAction(data: z.infer<typeof editServerSchema>) {
    const { id, ...updateData } = data;
    const isManual = updateData.integrationType === 'none';
    
    // Mapear campos camelCase para snake_case para o banco de dados
    const dbUpdateData = {
      name: updateData.name,
      url: updateData.url,
      api_key: updateData.apiKey,
      status: updateData.status,
      integration_type: updateData.integrationType,
      test_automation: isManual ? false : updateData.testAutomation,
      renewal_automation: isManual ? false : updateData.renewalAutomation,
      payment_gateway: isManual ? false : updateData.paymentGateway,
      send_expiration_reminder: updateData.sendExpirationReminder,
      send_usage_instructions: typeof updateData.sendUsageInstructions === 'boolean' ? updateData.sendUsageInstructions : true,
      test_config: updateData.testConfig || null,
      panel_server_id: updateData.panelServerId, // Preservar ID numérico existente
    };
    
    const supabase = await createApiSupabaseClient();
    const { data: updated, error } = await supabase.from('servers').update(dbUpdateData).eq('id', id).select().single();
    revalidatePath('/servidores');
    if (error || !updated) return { success: false, error: error?.message || 'Erro ao atualizar servidor' };
    return { success: true, server: updated as unknown as Server };
}

// Remove um servidor pelo ID
export async function deleteServerAction(serverId: string) {
    const supabase = await createApiSupabaseClient();
    // Verificar se existem clientes usando este servidor
    const { count, error: countError } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('server_id', serverId);
    if (countError) {
      console.error('Error checking server usage:', countError);
      return { success: false, error: 'Erro ao verificar uso do servidor' };
    }
    if (count && count > 0) {
      return { success: false, error: `Este servidor não pode ser excluído porque está sendo usado por ${count} cliente(s).` };
    }
    const { error } = await supabase.from('servers').delete().eq('id', serverId);
    revalidatePath('/servidores');
    if (error) return { success: false, error: error.message };
    return { success: true };
}
