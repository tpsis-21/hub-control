// @/app/(app)/servidores/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createApiSupabaseClient } from "@/lib/supabase/clients/api";
import type { Server } from "@/lib/types";
import { serverFormSchema, editServerSchema } from "@/lib/schemas";

// Busca todos os servidores do usuário autenticado
export async function getServers(): Promise<Server[]> {
    const supabase = await createApiSupabaseClient();
    
    // Obter o usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Error getting authenticated user:', authError);
      return [];
    }
    
    // Buscar apenas servidores do usuário autenticado
    const { data, error } = await supabase
      .from('servers')
      .select('*')
      .eq('user_id', user.id);
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
    }));
    return servers as unknown as Server[];
}

// Adiciona um novo servidor, ajustando automações conforme o tipo de integração
export async function addServerAction(data: z.infer<typeof serverFormSchema>) {
  const supabase = await createApiSupabaseClient();
  
  // Obter o usuário autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: 'Usuário não autenticado' };
  }
  
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
    user_id: user.id, // Vincular servidor ao usuário autenticado
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
    const supabase = await createApiSupabaseClient();
    
    // Obter o usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    // Verificar se o servidor pertence ao usuário
    const { data: serverData, error: serverError } = await supabase
      .from('servers')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
      
    if (serverError || !serverData) {
      return { success: false, error: 'Servidor não encontrado ou você não tem permissão para editá-lo' };
    }
    
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
    
    const { data: updated, error } = await supabase
      .from('servers')
      .update(dbUpdateData)
      .eq('id', id)
      .eq('user_id', user.id) // Garantir que só atualiza servidores do usuário
      .select()
      .single();
    revalidatePath('/servidores');
    if (error || !updated) return { success: false, error: error?.message || 'Erro ao atualizar servidor' };
    return { success: true, server: updated as unknown as Server };
}

// Remove um servidor pelo ID (apenas do usuário autenticado)
export async function deleteServerAction(serverId: string) {
    const supabase = await createApiSupabaseClient();
    
    // Obter o usuário autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    // Verificar se o servidor pertence ao usuário
    const { data: serverData, error: serverError } = await supabase
      .from('servers')
      .select('id')
      .eq('id', serverId)
      .eq('user_id', user.id)
      .single();
      
    if (serverError || !serverData) {
      return { success: false, error: 'Servidor não encontrado ou você não tem permissão para excluí-lo' };
    }
    
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
