// @/app/(app)/clientes/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addDays } from "date-fns";
import type { Client, Plan, Server } from "@/lib/types";
import { addCustomerSchema, editCustomerSchema, importCustomerSchema } from "@/lib/schemas";
import { createServerSupabaseClientForActions } from '@/lib/supabase/unified-client';
import { mapDatabaseClientToClient, mapClientToDatabaseClient, mapClientUpdateToDatabaseUpdate } from "@/lib/database-mappers";
import { generateUniqueManagerId } from "@/lib/id-generators";
import { getServers } from "@/app/(app)/servidores/actions";
import { MessageQueueService } from "@/services/message-queue.service";
import { PeriodCalculationService } from "@/services/period-calculation.service";
import { logger } from '@/utils/production-logger'

// Helper para gerar um link único para a área do cliente.
const generateUniqueLink = () => `/cliente/link_${new Date().getTime()}${Math.random().toString(36).substring(2, 8)}`;

// Helper para sincronizar renovação com painel IPTV
async function syncRenewalWithPanel({
  server,
  client,
  plan,
  newExpirationDate
}: {
  server: any;
  client: any;
  plan: any;
  newExpirationDate: Date;
}) {
  if (!server.api_url) return;
  
  try {
    // Obter configuração de identificação do painel
    const panelConfig = PeriodCalculationService.getPanelIdentificationConfig(server.name || 'generic', server.api_url);
    
    // Calcular período para o painel
    const renewalPeriod = PeriodCalculationService.calculateRenewalPeriod(
      plan.validity,
      panelConfig
    );
    
    const apiBody = JSON.parse(server.api_body || '{}');
    
    // Preparar dados baseado no tipo de painel
    let requestBody: any = {
      ...apiBody,
      plan_id: plan.panel_plan_id,
      expiration_date: newExpirationDate.toISOString()
    };
    
    // Lógica específica para cada tipo de painel
    switch (panelConfig.panelType) {
      case 'natv':
        // NATV pode usar tanto ID quanto username
        if (client.iptv_user_id) {
          requestBody.user_id = client.iptv_user_id;
        }
        if (client.iptv_username) {
          requestBody.username = client.iptv_username;
        }
        // Adicionar período em formato que o NATV entende
        if (renewalPeriod.unit === 'months') {
          requestBody.duration_months = renewalPeriod.value;
        } else {
          requestBody.duration_days = renewalPeriod.value;
        }
        break;
        
      case 'thebest':
        // The Best usa apenas ID
        if (!client.iptv_user_id) {
          throw new Error('ID IPTV é obrigatório para renovação no painel The Best');
        }
        requestBody.user_id = client.iptv_user_id;
        // The Best sempre usa meses
        requestBody.duration_months = renewalPeriod.value;
        break;
        
      default:
        // Painel genérico - incluir ambos se disponíveis
        if (client.iptv_user_id) {
          requestBody.user_id = client.iptv_user_id;
        }
        if (client.iptv_username) {
          requestBody.username = client.iptv_username;
        }
        requestBody.duration = renewalPeriod.value;
        requestBody.duration_unit = renewalPeriod.unit;
        break;
    }
    
    // Processar tags no corpo da requisição
    const processedBody = processApiBodyTags(requestBody, {
      client,
      plan,
      server,
      renewalPeriod,
      newExpirationDate
    });
    
    const headers = JSON.parse(server.api_headers || '{}');
    
    const response = await fetch(server.api_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(processedBody)
    });
    
    if (!response.ok) {
      throw new Error(`Erro na API do painel: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    logger.debug('Sincronização com painel IPTV realizada com sucesso:', {
      panelType: panelConfig.panelType,
      serverId: server.id,
      clientId: client.id,
      renewalPeriod,
      response: responseData
    });
    
    return responseData;
  } catch (error) {
    console.error('Erro ao sincronizar com painel IPTV:', error);
    throw error;
  }
}

// Helper para processar tags no corpo da API
function processApiBodyTags(body: any, context: {
  client: any;
  plan: any;
  server: any;
  renewalPeriod: { value: number; unit: 'days' | 'months' };
  newExpirationDate: Date;
}): any {
  const { client, plan, server, renewalPeriod, newExpirationDate } = context;
  
  // Converter objeto para string para processar tags
  let bodyString = JSON.stringify(body);
  
  // Substituir tags comuns
  const tagReplacements: Record<string, string> = {
    '{{USUARIO_IPTV}}': client.iptv_username || '',
    '{{SENHA_IPTV}}': client.iptv_password || '',
    '{{ID_PLANO_PAINEL}}': plan.panel_plan_id || '',
    '{{ID_USUARIO_IPTV}}': client.iptv_user_id || '',
    '{{DATA_EXPIRACAO}}': newExpirationDate.toISOString(),
    '{{DURACAO_DIAS}}': renewalPeriod.unit === 'days' ? renewalPeriod.value.toString() : '',
    '{{DURACAO_MESES}}': renewalPeriod.unit === 'months' ? renewalPeriod.value.toString() : '',
    '{{NOME_CLIENTE}}': client.name || '',
    '{{EMAIL_CLIENTE}}': client.email || '',
    '{{TELEFONE_CLIENTE}}': client.whatsapp || ''
  };
  
  // Aplicar substituições
  Object.entries(tagReplacements).forEach(([tag, value]) => {
    bodyString = bodyString.replace(new RegExp(tag, 'g'), value);
  });
  
  // Converter de volta para objeto
  try {
    return JSON.parse(bodyString);
  } catch (error) {
    console.error('Erro ao processar tags do corpo da API:', error);
    return body;
  }
}

export async function getClienteById(id: string): Promise<Client | undefined> {
  const supabase = await createServerSupabaseClientForActions();
  const { data, error } = await supabase.from('clients').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return mapDatabaseClientToClient(data);
}

/**
 * Busca e filtra os clientes no servidor a partir do Firestore.
 * @param params - Objeto com os parâmetros de busca e filtro.
 * @returns Uma lista de clientes que correspondem aos critérios.
 */
export async function getClientes(params?: {
  q?: string;
  status?: string | string[];
  plan?: string | string[];
  uniqueLink?: string;
}): Promise<Client[]> {
  const supabase = await createServerSupabaseClientForActions();
  let query = supabase.from('clients').select('*');
  if (params?.uniqueLink) query = query.eq('unique_link', params.uniqueLink);
  if (params?.status) {
    const statusArray = Array.isArray(params.status) ? params.status : [params.status];
    query = query.in('status', statusArray as ('Ativo' | 'Em teste' | 'Inativo' | 'Bloqueado')[]);
  }
  if (params?.plan) query = query.in('plan_id', Array.isArray(params.plan) ? params.plan : [params.plan]);
  const { data, error } = await query;
  let clientsData = (data || []).map(mapDatabaseClientToClient);
  if (params?.q) {
    const searchTerm = params.q.toLowerCase();
    clientsData = clientsData.filter((client: Client) =>
      client.name.toLowerCase().includes(searchTerm) ||
      client.iptvUsername?.toLowerCase().includes(searchTerm) ||
      client.iptvUserId?.toLowerCase().includes(searchTerm) ||
      client.managerId?.toLowerCase().includes(searchTerm)
    );
  }
  return clientsData;
}

/**
 * Busca e retorna todos os clientes com status 'Em teste' do Firestore.
 * @returns Uma lista de clientes em teste.
 */
export async function getTestes(): Promise<Client[]> {
  const supabase = await createServerSupabaseClientForActions();
  const { data, error } = await supabase.from('clients').select('*').eq('status', 'Em teste');
  return (data || []).map(mapDatabaseClientToClient);
}

/**
 * Adiciona um novo cliente ao sistema.
 * @param data - Dados do cliente validados pelo schema `addCustomerSchema`.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function addCustomerAction(data: z.infer<typeof addCustomerSchema>, allPlans: Plan[]) {
  const supabase = await createServerSupabaseClientForActions();
  
  const plan = allPlans.find(p => p.id === data.planId);
  if (!plan) {
    return { success: false, error: "Plano não encontrado" };
  }
  // Geração automática do ID do gestor se não informado ou inválido
  let managerId = data.managerId;
  if (!managerId || !/^([A-Z][0-9]|[A-Z]{3}[0-9]{3})$/.test(managerId)) {
    // Buscar IDs existentes para garantir unicidade
    const { data: existingClients } = await supabase.from('clients').select('manager_id');
    const existingIds = (existingClients || []).map((c: any) => c.manager_id).filter(Boolean) as string[];
    managerId = generateUniqueManagerId(existingIds, 'long');
  }
  if (data.serverId && data.serverId !== 'none') {
    const servers = await getServers();
    const server = servers.find(s => s.id === data.serverId);
    if (server?.paymentGateway && !data.iptvUserId) {
      return { success: false, error: "O ID IPTV é obrigatório para servidores com gateway de pagamento ativado." };
    }
  }
  const newCustomerData: Omit<Client, 'id'> = {
    name: data.name,
    iptvUsername: data.iptvUsername,
    iptvUserId: data.iptvUserId || undefined,
    iptvPassword: data.iptvPassword || undefined,
    managerId: managerId || undefined,
    email: data.email || undefined,
    whatsapp: data.whatsapp || undefined,
    startDate: new Date().toISOString(),
    expirationDate: data.expirationDate ? data.expirationDate.toISOString() : addDays(new Date(), plan.validity).toISOString(),
    status: 'Ativo',
    planId: data.planId,
    serverId: data.serverId === 'none' ? undefined : data.serverId,
    notes: data.notes || undefined,
    paymentHistory: [],
    uniqueLink: generateUniqueLink(),
  };
  
  const dbData = mapClientToDatabaseClient(newCustomerData);
  const { data: inserted, error } = await supabase.from('clients').insert([dbData]).select().single();
  
  // Enviar mensagem de boas-vindas se o cliente tiver email ou WhatsApp
  if (inserted && (newCustomerData.email || newCustomerData.whatsapp)) {
    try {
      const client = mapDatabaseClientToClient(inserted);
      await MessageQueueService.getInstance().queueWelcomeMessage({
        clientId: client.id,
        clientName: client.name,
        email: client.email,
        whatsapp: client.whatsapp,
        planName: plan.name,
        expirationDate: client.expirationDate
      });
    } catch (messageError) {
      console.error('Erro ao enviar mensagem de boas-vindas:', messageError);
      // Não falha a operação principal se o envio da mensagem falhar
    }
  }
  
  revalidatePath('/clientes');
  revalidatePath('/dashboard');
  if (error || !inserted) return { success: false, error: error?.message || 'Erro ao adicionar cliente' };
  return { success: true, customer: mapDatabaseClientToClient(inserted) };
}

/**
 * Edita os dados de um cliente existente.
 * @param data - Dados do cliente validados pelo schema `editCustomerSchema`.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function editCustomerAction(data: Omit<z.infer<typeof editCustomerSchema>, 'expirationDate'> & { expirationDate: string }) {
  const { id, ...updateData } = data;
  if (data.serverId && data.serverId !== 'none') {
    const servers: Server[] = await getServers();
    const server = servers.find(s => s.id === data.serverId);
    if (server?.paymentGateway && !data.iptvUserId) {
      return { success: false, error: "O ID IPTV é obrigatório para servidores com gateway de pagamento ativado." };
    }
  }
  const finalUpdateData = {
    ...updateData,
    serverId: updateData.serverId === 'none' ? undefined : updateData.serverId,
  };
  
  const dbUpdateData = mapClientUpdateToDatabaseUpdate(finalUpdateData);
  const supabase = await createServerSupabaseClientForActions();
  const { error } = await supabase.from('clients').update(dbUpdateData).eq('id', id);
  revalidatePath('/clientes');
  revalidatePath(`/clientes/${data.id}`);
  revalidatePath('/testes');
  revalidatePath(`/testes/${data.id}`);
  revalidatePath('/dashboard');
  if (error) return { success: false, error: error.message };
  return { success: true, customer: data as Client };
}

/**
 * Atualiza o status de um cliente.
 * @param customerId - ID do cliente a ser atualizado.
 * @param status - Novo status para o cliente.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function updateCustomerStatusAction(customerId: string, status: 'Ativo' | 'Inativo' | 'Bloqueado' | 'Em teste') {
  const supabase = await createServerSupabaseClientForActions();
  const { error } = await supabase.from('clients').update({ status }).eq('id', customerId);
  revalidatePath('/clientes');
  revalidatePath(`/clientes/${customerId}`);
  revalidatePath('/testes');
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Renova a assinatura de um cliente.
 * @param customerId - ID do cliente a ser renovado.
 * @param planId - ID do plano para renovação.
 * @param serverId - ID do servidor (opcional) para sincronização com painel IPTV.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function renewCustomerAction(
  customerId: string, 
  planId: string,
  serverId?: string
) {
  const supabase = await createServerSupabaseClientForActions();
  
  try {
    // 1. Buscar dados necessários
    const [clientResult, planResult, serverResult] = await Promise.all([
      supabase
        .from('clients')
        .select('id, expiration_date, status, iptv_username, iptv_user_id')
        .eq('id', customerId)
        .single(),
      supabase
        .from('plans')
        .select('id, name, validity, panel_plan_id')
        .eq('id', planId)
        .single(),
      serverId ? supabase
        .from('servers')
        .select('id, name, url')
        .eq('id', serverId)
        .single() : { data: null, error: null }
    ]);
    
    // Validar dados
    if (clientResult.error || !clientResult.data) {
      return { success: false, error: "Cliente não encontrado" };
    }
    
    if (planResult.error || !planResult.data) {
      return { success: false, error: "Plano não encontrado" };
    }
    
    const client = clientResult.data;
    const plan = planResult.data as { id: string; name: string; validity: number; panel_plan_id: string | null };
    const server = serverResult?.data;
    
    // 2. Calcular nova data de expiração usando o PeriodCalculationService
    const currentExpiration = new Date(client.expiration_date);
    const baseDate = currentExpiration > new Date() ? currentExpiration : new Date();
    
    const serverConfig = { 
      period_calculation_type: 'days' as const, 
      period_calculation_config: {} 
    };
    
    const calculationResult = PeriodCalculationService.calculateExpirationDate(
      baseDate,
      plan.validity,
      serverConfig
    );
    const newExpirationDate = calculationResult.expirationDate;
    
    // 3. Atualizar cliente no banco de dados
    const { error: updateError } = await supabase
      .from('clients')
      .update({ 
        expiration_date: newExpirationDate.toISOString(), 
        status: 'Ativo' 
      })
      .eq('id', customerId);
    
    if (updateError) {
      return { success: false, error: updateError.message };
    }
    
    // 4. Se há servidor configurado, sincronizar com painel IPTV
    if (server && server.url) {
      try {
        await syncRenewalWithPanel({
          server,
          client,
          plan,
          newExpirationDate
        });
      } catch (syncError) {
        console.error('Erro ao sincronizar com painel IPTV:', syncError);
        // Não falha a renovação se a sincronização falhar
      }
    }
    
    // 5. Buscar dados completos do cliente para enviar mensagem de renovação
    try {
      const { data: clientData } = await supabase.from('clients').select('*').eq('id', customerId).single();
      if (clientData && (clientData.email || clientData.whatsapp)) {
        const client = mapDatabaseClientToClient(clientData);
        await MessageQueueService.getInstance().queueWelcomeMessage({
          type: 'general',
          clientId: client.id,
          clientName: client.name,
          email: client.email,
          whatsapp: client.whatsapp,
          subject: 'Assinatura Renovada',
          message: `Olá ${client.name}! Sua assinatura foi renovada com sucesso. Nova data de vencimento: ${new Date(newExpirationDate).toLocaleDateString('pt-BR')}.`,
          priority: 'normal'
        });
      }
    } catch (messageError) {
      console.error('Erro ao enviar mensagem de renovação:', messageError);
    }
    
    revalidatePath('/clientes');
    revalidatePath(`/clientes/${customerId}`);
    
    return { success: true };
    
  } catch (error) {
    console.error('Erro na renovação do cliente:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro interno do servidor' 
    };
  }
}

/**
 * Converte um usuário de teste em um cliente ativo.
 * @param customerId - ID do teste a ser convertido.
 * @param planValidity - Validade do plano em dias.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function convertTestToCustomerAction(customerId: string, planValidity: number) {
  const supabase = await createServerSupabaseClientForActions();
  // Busca o cliente de teste
  const { data, error } = await supabase.from('clients').select('*').eq('id', customerId).single();
  if (error || !data) return { success: false, error: 'Cliente não encontrado' };
  const newExpirationDate = addDays(new Date(), planValidity);
  // Atualiza o cliente para status Ativo e define datas
  const { error: updateError } = await supabase.from('clients').update({
    status: 'Ativo',
    expiration_date: newExpirationDate.toISOString(),
    start_date: new Date().toISOString()
  }).eq('id', customerId);
  
  // Enviar mensagem de conversão de teste para cliente ativo
  if (!updateError && (data.email || data.whatsapp)) {
    try {
      const client = mapDatabaseClientToClient(data);
      await MessageQueueService.getInstance().queueWelcomeMessage({
        type: 'general',
        clientId: client.id,
        clientName: client.name,
        email: client.email,
        whatsapp: client.whatsapp,
        subject: 'Teste Convertido - Bem-vindo!',
        message: `Parabéns ${client.name}! Seu teste foi convertido para uma assinatura ativa. Data de vencimento: ${newExpirationDate.toLocaleDateString('pt-BR')}.`,
        priority: 'normal'
      });
    } catch (messageError) {
      console.error('Erro ao enviar mensagem de conversão:', messageError);
    }
  }
  
  revalidatePath('/clientes');
  revalidatePath(`/clientes/${customerId}`);
  revalidatePath('/testes');
  revalidatePath('/dashboard');
  if (updateError) return { success: false, error: updateError.message };
  return { success: true, customer: { ...data, status: 'Ativo', expiration_date: newExpirationDate.toISOString(), start_date: new Date().toISOString() } };
}

/**
 * Atualiza as notas internas de um cliente ou teste.
 * @param customerId - ID do cliente/teste.
 * @param notes - Novo conteúdo das notas.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function updateCustomerNotesAction(customerId: string, notes: string) {
  const supabase = await createServerSupabaseClientForActions();
  const { error } = await supabase.from('clients').update({ notes }).eq('id', customerId);
  revalidatePath(`/clientes/${customerId}`);
  revalidatePath(`/testes/${customerId}`);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Exclui um cliente do sistema.
 * @param customerId - O ID do cliente a ser excluído.
 * @returns Um objeto indicando sucesso ou falha.
 */
export async function deleteCustomerAction(customerId: string) {
  const supabase = await createServerSupabaseClientForActions();
  const { error } = await supabase.from('clients').delete().eq('id', customerId);
  revalidatePath('/clientes');
  revalidatePath('/testes');
  revalidatePath('/dashboard');
  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Importa uma lista de clientes para o sistema.
 * @param importedData - Um array de clientes para importar.
 * @returns Um objeto com o resultado da importação (sucessos, falhas, erros).
 */
export async function importCustomersAction(importedData: z.infer<typeof importCustomerSchema>[], allPlans: Plan[]) {
  let successCount = 0;
  let failureCount = 0;
  const errors: { line: number; message: string; data: any }[] = [];
  const supabase = await createServerSupabaseClientForActions();
  
  // Buscar todos os servidores para mapear panelServerId para UUID
  const allServers = await getServers();
  
  for (let i = 0; i < importedData.length; i++) {
    const row = importedData[i];
    try {
      // 1. Validação dos dados da linha com Zod
      const validatedData = importCustomerSchema.parse(row);
      // 2. Validação de regras de negócio (ex: plano existe?)
      const plan = allPlans.find(p => p.panel_plan_id === validatedData.planId);
      if (!plan) {
        throw new Error(`Plano com ID "${validatedData.planId}" não encontrado.`);
      }
      
      // 3. Mapear serverId numérico para UUID do servidor
      let serverUuid: string | undefined = undefined;
      if (validatedData.serverId && validatedData.serverId !== 'none') {
        const server = allServers.find(s => s.panelServerId === validatedData.serverId);
        if (!server) {
          throw new Error(`Servidor com ID "${validatedData.serverId}" não encontrado.`);
        }
        serverUuid = server.id;
      }
      
      // 4. Criação do novo cliente
      const newClientData: Omit<Client, 'id'> = {
        ...validatedData,
        planId: plan.id, // Usar UUID do plano
        iptvPassword: validatedData.iptvPassword ?? undefined,
        email: validatedData.email ?? undefined,
        whatsapp: validatedData.whatsapp ?? undefined,
        notes: validatedData.notes ?? undefined,
        status: 'Ativo',
        startDate: new Date().toISOString(),
        expirationDate: addDays(new Date(), plan.validity).toISOString(),
        paymentHistory: [],
        serverId: serverUuid, // Usar UUID do servidor
        uniqueLink: generateUniqueLink(),
      };
      
      const dbData = mapClientToDatabaseClient(newClientData);
      const { error } = await supabase.from('clients').insert([dbData]);
      if (error) {
        throw new Error(error.message);
      }
      successCount++;
    } catch (error: any) {
      failureCount++;
      errors.push({
        line: i + 2, // +2 para corresponder à linha da planilha (cabeçalho + índice 0)
        message: error instanceof z.ZodError ? JSON.stringify(error.flatten().fieldErrors) : error.message,
        data: row,
      });
    }
  }
  if (successCount > 0) {
    revalidatePath('/clientes');
    revalidatePath('/dashboard');
  }
  return { successCount, failureCount, errors };
}

