// @/app/(app)/testes/supabase-actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addMinutes, format } from "date-fns";
import type { Client, Plan, Server, ServerTestConfig } from "@/lib/types";
import { addTestSchema } from "@/lib/schemas";
import { createServerSupabaseClientForActions } from "@/lib/supabase/clients/server";
import { logger } from '@/utils/production-logger'
// Usando fetch nativo do Node.js/Next.js

// Helper para gerar um link único para a área do cliente.
const generateUniqueLink = () => `/cliente/link_${new Date().getTime()}${Math.random().toString(36).substring(2, 8)}`;

/**
 * Busca todos os testes ativos.
 * @returns Uma lista de clientes com status "Em teste".
 */
export async function getTestes(): Promise<Client[]> {
  const supabase = await createServerSupabaseClientForActions();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('status', 'Em teste');
  
  if (error) {
    console.error('Error fetching tests:', error);
    return [];
  }
  
  // Mapear dados do banco (snake_case) para o tipo Client (camelCase)
    const mappedClients: Client[] = data.map(client => ({
      id: client.id,
      name: client.name,
      iptvUsername: client.iptv_username,
      iptvUserId: client.iptv_user_id || undefined,
      iptvPassword: client.iptv_password || undefined,
      managerId: client.manager_id || undefined,
      email: client.email || undefined,
      whatsapp: client.whatsapp || undefined,
      startDate: client.start_date,
      expirationDate: client.expiration_date,
      status: client.status,
      planId: client.plan_id,
      serverId: client.server_id || undefined,
      notes: client.notes || undefined,
      paymentHistory: client.payment_history as any[] | undefined,
      uniqueLink: client.unique_link || undefined,
      created_at: client.created_at,
       updated_at: client.updated_at
    }));
  
  return mappedClients as Client[];
}

/**
 * Busca um teste pelo ID.
 * @param id - ID do teste.
 * @returns O teste encontrado ou undefined.
 */
export async function getTesteById(id: string): Promise<Client | undefined> {
  const supabase = await createServerSupabaseClientForActions();
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('status', 'Em teste')
    .single();
  
  if (error || !data) {
    console.error('Error fetching test by ID:', error);
    return undefined;
  }
  
  // Mapear dados do banco (snake_case) para o tipo Client (camelCase)
  const mappedClient: Client = {
    id: data.id,
    name: data.name,
    iptvUsername: data.iptv_username,
    iptvUserId: data.iptv_user_id || undefined,
    iptvPassword: data.iptv_password || undefined,
    managerId: data.manager_id || undefined,
    email: data.email || undefined,
    whatsapp: data.whatsapp || undefined,
    startDate: data.start_date,
    expirationDate: data.expiration_date,
    status: data.status,
    planId: data.plan_id,
    serverId: data.server_id || undefined,
    notes: data.notes || undefined,
    paymentHistory: data.payment_history as any[] | undefined,
    uniqueLink: data.unique_link || undefined,
    created_at: data.created_at,
     updated_at: data.updated_at
  };
  
  return mappedClient;
}

/**
 * Cria um novo teste, com possibilidade de automação via API.
 * @param data - Dados do teste validados pelo schema `addTestSchema`.
 * @param allPlans - Lista de todos os planos disponíveis.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function addTestAction(data: z.infer<typeof addTestSchema>, allPlans: Plan[]) {
  const plan = allPlans.find(p => p.id === data.planId);
  if (!plan) {
    return { success: false, error: "Plano não encontrado." };
  }

  // Buscar informações do servidor
  const supabase = await createServerSupabaseClientForActions();
  const { data: serverData, error: serverError } = await supabase
    .from('servers')
    .select('*')
    .eq('id', data.serverId)
    .single();

  if (serverError || !serverData) {
    console.error('Error fetching server:', serverError);
    return { success: false, error: "Servidor não encontrado." };
  }

  const server: Server = {
    id: serverData.id,
    name: serverData.name,
    url: serverData.url || undefined,
    apiKey: serverData.api_key || undefined,
    status: serverData.status,
    integrationType: serverData.integration_type,
    testAutomation: serverData.test_automation,
    renewalAutomation: serverData.renewal_automation,
    paymentGateway: serverData.payment_gateway,
    testConfig: (serverData.test_config as ServerTestConfig) || undefined,
    sendExpirationReminder: serverData.send_expiration_reminder || false,
    sendUsageInstructions: serverData.send_usage_instructions || false
  };
  let testDurationMinutes = 240; // Duração padrão de 4 horas
  let apiResponseData: Partial<Client> = {};

  // Se um servidor com automação de teste está configurado, executa a chamada à API.
  if (server?.testAutomation && server.apiKey) {
    const testConfig = server.testConfig as any;
    testDurationMinutes = testConfig?.testDurationMinutes || testDurationMinutes;

    try {
      if (server.integrationType === 'natv') {
        const url = `https://revenda.pixbot.link/user`;
        const body = { username: data.iptvUsername, minutes: String(testDurationMinutes) };
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${server.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const result = await response.json() as any;
        if (!response.ok) throw new Error(result.detail || `Erro na API NATV: ${response.statusText}`);
        
        apiResponseData = {
          iptvUserId: result.id?.toString(),
          iptvUsername: result.username,
          iptvPassword: result.password,
        };

      } else if (server.integrationType === 'pixbot') {
        // A API Pixbot requer a URL, que agora é armazenada no objeto do servidor
        if (!server.url) throw new Error("A URL do servidor Pixbot não está configurada.");
        
        const url = `${server.url}/user`;
        const body = { minutes: String(testDurationMinutes) };
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${server.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const result = await response.json() as any;
        if (!response.ok) throw new Error(result.error_message || `Erro na API Pixbot: ${response.statusText}`);

        apiResponseData = {
          iptvUsername: result.username,
          iptvPassword: result.password,
        };

      } else if (server.integrationType === 'generic' && testConfig) {
        if (testConfig.type === 'api' && server.url && testConfig.apiEndpoint && server.apiKey) {
          const url = server.url.endsWith('/') ? `${server.url}${testConfig.apiEndpoint.substring(1)}` : `${server.url}${testConfig.apiEndpoint}`;
          
          const headersString = (testConfig.apiHeaders || '{}').replace('{{API_KEY}}', server.apiKey);
          const bodyString = (testConfig.apiBody || '{}')
            .replace('{{USUARIO_IPTV}}', data.iptvUsername)
            .replace('{{SENHA_IPTV}}', data.iptvPassword || '')
            .replace('{{ID_PLANO_PAINEL}}', plan.panel_plan_id || '');

          const response = await fetch(url, {
            method: 'POST',
            headers: JSON.parse(headersString),
            body: bodyString
          });
          const result = await response.json() as any;

          if (!response.ok) throw new Error(`Erro na API Genérica: ${response.statusText}`);
          
          // Função auxiliar para extrair valores de objetos aninhados (JSONPath)
          const getNestedValue = (obj: any, path: string) => path.split('.').reduce((o, k) => (o && o[k] !== undefined) ? o[k] : undefined, obj);

          apiResponseData = {
            iptvUsername: testConfig.responseUsernamePath ? getNestedValue(result, testConfig.responseUsernamePath) : data.iptvUsername,
            iptvPassword: testConfig.responsePasswordPath ? getNestedValue(result, testConfig.responsePasswordPath) : data.iptvPassword,
            iptvUserId: testConfig.responseUserIdPath ? getNestedValue(result, testConfig.responseUserIdPath)?.toString() : undefined,
          };

        } else if (testConfig.type === 'chatbot') {
          logger.debug(`--- [SIMULAÇÃO DE AUTOMAÇÃO DE TESTE VIA CHATBOT] ---`, undefined, "DEBUG");
          logger.debug(`Link do Chatbot: ${testConfig.chatbotLink}`, undefined, "DEBUG");
          logger.debug(`Mensagem: ${testConfig.chatbotMessage}`, undefined, "DEBUG");
          logger.debug(`-------------------------------------------`, undefined, "DEBUG");
        }
      }
    } catch (error: any) {
      console.error(`Falha na automação do servidor ${server.name}:`, error);
      return { success: false, error: `Falha na automação: ${error.message}` };
    }
  }

  const startDate = format(new Date(), 'yyyy-MM-dd');
  const expirationDate = format(
    addMinutes(new Date(), testDurationMinutes),
    'yyyy-MM-dd'
  );

  // Mapear dados do tipo Client (camelCase) para o banco (snake_case)
  const newTestCustomerData = {
    name: data.name,
    iptv_username: data.iptvUsername || '',
    iptv_user_id: data.iptvUserId || null,
    iptv_password: data.iptvPassword || null,
    whatsapp: data.whatsapp || null,
    start_date: startDate,
    expiration_date: expirationDate,
    status: 'Em teste' as const,
    plan_id: data.planId,
    server_id: data.serverId || null,
    notes: data.notes || null,
    payment_history: null,
    unique_link: generateUniqueLink(),
    ...apiResponseData, // Sobrescreve os dados manuais com os da API
  };

  // Inserir o novo teste no Supabase
  const supabase2 = await createServerSupabaseClientForActions();
  const { data: newTest, error } = await supabase2
    .from('clients')
    .insert([newTestCustomerData])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding test:', error);
    return { success: false, error: `Erro ao adicionar teste: ${error.message}` };
  }
  
  // Revalidar os caminhos para atualizar a UI
  revalidatePath('/testes');
  revalidatePath('/dashboard');
  
  // Mapear dados do banco (snake_case) para o tipo Client (camelCase)
  const mappedClient: Client = {
    id: newTest.id,
    name: newTest.name,
    iptvUsername: newTest.iptv_username,
    iptvUserId: newTest.iptv_user_id || undefined,
    iptvPassword: newTest.iptv_password || undefined,
    managerId: newTest.manager_id || undefined,
    email: newTest.email || undefined,
    whatsapp: newTest.whatsapp || undefined,
    startDate: newTest.start_date,
    expirationDate: newTest.expiration_date,
    status: newTest.status,
    planId: newTest.plan_id,
    serverId: newTest.server_id || undefined,
    notes: newTest.notes || undefined,
    paymentHistory: newTest.payment_history as any[] | undefined,
    uniqueLink: newTest.unique_link || undefined,
    created_at: newTest.created_at,
    updated_at: newTest.updated_at
  };
  
  return { success: true, customer: mappedClient };
}

/**
 * Converte um teste em cliente ativo.
 * @param id - ID do teste a ser convertido.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function convertTestToCustomerAction(id: string) {
  // Buscar o teste
  const supabase = await createServerSupabaseClientForActions();
  const { data: test, error: testError } = await supabase
    .from('clients')
    .select('*, plans!inner(*)')
    .eq('id', id)
    .eq('status', 'Em teste')
    .single();
  
  if (testError || !test) {
    console.error('Error fetching test:', testError);
    return { success: false, error: "Teste não encontrado." };
  }
  
  // Calcular a nova data de expiração com base na validade do plano
  const plan = test.plans as unknown as Plan;
  const expirationDate = format(
    addMinutes(new Date(), plan.validity * 24 * 60),
    'yyyy-MM-dd'
  );
  
  // Atualizar o status para Ativo e a data de expiração
  const supabase2 = await createServerSupabaseClientForActions();
  const { error } = await supabase2
    .from('clients')
    .update({ 
      status: 'Ativo',
      expirationDate,
      startDate: format(new Date(), 'yyyy-MM-dd')
    })
    .eq('id', id);
  
  if (error) {
    console.error('Error converting test to customer:', error);
    return { success: false, error: `Erro ao converter teste: ${error.message}` };
  }
  
  // Revalidar os caminhos para atualizar a UI
  revalidatePath('/testes');
  revalidatePath('/clientes');
  revalidatePath('/dashboard');
  
  return { success: true };
}

/**
 * Exclui um teste.
 * @param id - ID do teste a ser excluído.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function deleteTestAction(id: string) {
  const supabase = await createServerSupabaseClientForActions();
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('status', 'Em teste');
  
  if (error) {
    console.error('Error deleting test:', error);
    return { success: false, error: `Erro ao excluir teste: ${error.message}` };
  }
  
  // Revalidar os caminhos para atualizar a UI
  revalidatePath('/testes');
  revalidatePath('/dashboard');
  
  return { success: true };
}
