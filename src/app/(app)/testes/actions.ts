// @/app/(app)/testes/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { addMinutes } from "date-fns";
import type { Client, Plan, Server } from "@/lib/types";
// Usando fetch nativo do Node.js/Next.js
import { addTestSchema, addAutomaticTestSchema, addManualTestSchema } from "@/lib/schemas";
import { createApiSupabaseClient } from "@/lib/supabase-api";
import { getServers } from "@/app/(app)/servidores/actions";
import { mapClientToDatabaseClient, mapDatabaseClientToClient } from "@/lib/database-mappers";
import { NATVService } from "@/services/natv.service";


// Helper para gerar um link único para a área do cliente.
const generateUniqueLink = () => `/cliente/link_${new Date().getTime()}${Math.random().toString(36).substring(2, 8)}`;
const clientsTable = 'clients';


/**
 * Cria um novo teste, com possibilidade de automação via API.
 * @param data - Dados do teste validados pelo schema `addTestSchema`.
 * @returns Um objeto indicando sucesso ou falha na operação.
 */
export async function addTestAction(data: z.infer<typeof addTestSchema>, allPlans: Plan[]) {
  const plan = allPlans.find(p => p.id === data.planId);
  if (!plan) {
    return { success: false, error: "Plano não encontrado." };
  }

  const servers = await getServers();
  const server = servers.find(s => s.id === data.serverId);
  let testDurationMinutes = 240; // Duração padrão de 4 horas
  let apiResponseData: Partial<Client> = {};

  // Se um servidor com automação de teste está configurado, executa a chamada à API.
  if (server?.testAutomation && server.apiKey) {
    const testConfig = server.testConfig;
    testDurationMinutes = testConfig?.testDurationMinutes || testDurationMinutes;

    try {
        if (server.integrationType === 'natv') {
            const url = `https://natv.pm/user`;
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
                    .replace('{{ID_PLANO_PAINEL}}', plan.panelPlanId || '');

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
                console.log(`--- [SIMULAÇÃO DE AUTOMAÇÃO DE TESTE VIA CHATBOT] ---`);
                console.log(`Link do Chatbot: ${testConfig.chatbotLink}`);
                console.log(`Mensagem: ${testConfig.chatbotMessage}`);
                console.log(`-------------------------------------------`);
            }
        }
     } catch (error: any) {
        console.error(`Falha na automação do servidor ${server.name}:`, error);
        return { success: false, error: `Falha na automação: ${error.message}` };
    }
  }

  const newTestCustomerData: Omit<Client, 'id'> = {
    ...data,
    ...apiResponseData, // Sobrescreve os dados manuais com os da API
    status: 'Em teste',
    startDate: new Date().toISOString(),
    expirationDate: addMinutes(new Date(), testDurationMinutes).toISOString(),
    paymentHistory: [],
    serverId: data.serverId === 'none' ? undefined : data.serverId,
    uniqueLink: generateUniqueLink(),
  };
  const supabase = await createApiSupabaseClient();
  const databaseData = mapClientToDatabaseClient(newTestCustomerData);
  const { data: inserted, error } = await supabase.from(clientsTable).insert([databaseData]).select().single();
  revalidatePath('/testes');
  revalidatePath('/dashboard');
  if (error || !inserted) return { success: false, error: error?.message || 'Erro ao adicionar teste' };
  return { success: true, customer: mapDatabaseClientToClient(inserted) };
}

/**
 * Cria um teste automático via integração configurada.
 */
export async function addAutomaticTestAction(data: z.infer<typeof addAutomaticTestSchema>) {
  const servers = await getServers();
  const server = servers.find(s => s.id === data.serverId);
  
  if (!server) {
    return { success: false, error: "Servidor não encontrado." };
  }
  
  if (!server.testAutomation || !server.apiKey) {
    return { success: false, error: "Servidor não possui automação de teste configurada." };
  }

  const testDurationMinutes = data.testDurationHours * 60;
  let apiResponseData: Partial<Client> = {};
  let credits: number | null = null;

  try {
    if (server.integrationType === 'natv') {
      const url = `https://natv.pm/user`;
      const username = data.iptvUsername || `teste_${Date.now()}`;
      const body = { username, minutes: String(testDurationMinutes) };
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${server.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      const result = await response.json() as any;
      if (!response.ok) throw new Error(result.detail || `Erro na API NATV: ${response.statusText}`);
      
      // Integração com serviço NATV para sincronização de créditos
      const natvService = new NATVService();
      await natvService.loadConfig();
      
      if (natvService.isConfigured()) {
        // Sincronizar créditos após criação do usuário
        const creditsResponse = await natvService.syncCredits();
        if (creditsResponse.success && creditsResponse.data) {
          credits = creditsResponse.data.credits;
        }
      }
      
      // Extrair créditos da resposta se não obtidos via serviço
      if (credits === null && result.owner && result.owner.credits !== undefined) {
        credits = result.owner.credits;
      }
      
      apiResponseData = {
        name: data.testName || `Teste ${username}`,
        iptvUserId: result.id?.toString(),
        iptvUsername: result.username,
        iptvPassword: result.password,
        email: data.email,
        whatsapp: data.phone,
      };
    }
    // Adicionar outras integrações conforme necessário
  } catch (error: any) {
    console.error(`Falha na automação do servidor ${server.name}:`, error);
    return { success: false, error: `Falha na automação: ${error.message}` };
  }

  const newTestCustomerData: Omit<Client, 'id'> = {
    ...apiResponseData,
    name: apiResponseData.name || data.testName || `Teste ${Date.now()}`,
    status: 'Em teste',
    startDate: new Date().toISOString(),
    expirationDate: addMinutes(new Date(), testDurationMinutes).toISOString(),
    paymentHistory: [],
    serverId: data.serverId,
    uniqueLink: generateUniqueLink(),
    planId: '', // Será definido pelo plano padrão do servidor
    iptvPassword: apiResponseData.iptvPassword || '',
    notes: `Teste automático criado via ${server.name}`,
  };

  const supabase = await createApiSupabaseClient();
  const databaseData = mapClientToDatabaseClient(newTestCustomerData);
  const { data: inserted, error } = await supabase.from(clientsTable).insert([databaseData]).select().single();
  
  revalidatePath('/testes');
  revalidatePath('/dashboard');
  revalidatePath('/servidores');
  
  if (error || !inserted) return { success: false, error: error?.message || 'Erro ao criar teste automático' };
  
  // Atualizar créditos do servidor se disponível
  if (credits !== null) {
    await updateServerCredits(data.serverId, credits);
  }
  
  // Enviar mensagem se solicitado
  if (data.sendMessage && data.messageChannel && (data.email || data.phone)) {
    await sendTestMessage({
      channel: data.messageChannel,
      email: data.email,
      phone: data.phone,
      testData: apiResponseData,
      expirationDate: newTestCustomerData.expirationDate
    });
  }
  
  return { success: true, customer: mapDatabaseClientToClient(inserted), credits };
}

/**
 * Cria um teste manual com dados fornecidos pelo usuário.
 */
export async function addManualTestAction(data: z.infer<typeof addManualTestSchema>) {
  const testDurationMinutes = data.testDurationHours * 60;
  
  const newTestCustomerData: Omit<Client, 'id'> = {
    ...data,
    status: 'Em teste',
    startDate: new Date().toISOString(),
    expirationDate: addMinutes(new Date(), testDurationMinutes).toISOString(),
    paymentHistory: [],
    serverId: data.serverId || undefined,
    uniqueLink: generateUniqueLink(),
    iptvPassword: data.iptvPassword || '',
  };

  const supabase = await createApiSupabaseClient();
  const databaseData = mapClientToDatabaseClient(newTestCustomerData);
  const { data: inserted, error } = await supabase.from(clientsTable).insert([databaseData]).select().single();
  
  revalidatePath('/testes');
  revalidatePath('/dashboard');
  
  if (error || !inserted) return { success: false, error: error?.message || 'Erro ao criar teste manual' };
  return { success: true, customer: mapDatabaseClientToClient(inserted) };
}

/**
 * Atualiza os créditos de um servidor.
 */
async function updateServerCredits(serverId: string, credits: number) {
  try {
    const supabase = await createApiSupabaseClient();
    await supabase
      .from('servers')
      .update({ 
        credits,
        last_credits_sync: new Date().toISOString()
      })
      .eq('id', serverId);
  } catch (error) {
    console.error('Erro ao atualizar créditos do servidor:', error);
  }
}

/**
 * Envia mensagem com dados do teste.
 */
async function sendTestMessage(params: {
  channel: 'email' | 'whatsapp';
  email?: string;
  phone?: string;
  testData: Partial<Client>;
  expirationDate: string;
}) {
  try {
    // Implementar envio de mensagem
    console.log('Enviando mensagem de teste:', params);
    // TODO: Integrar com sistema de mensagens
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
  }
}

/**
 * Sincroniza créditos de um servidor específico.
 */
export async function syncServerCredits(serverId: string) {
  try {
    const servers = await getServers();
    const server = servers.find(s => s.id === serverId);
    
    if (!server || !server.apiKey) {
      return { success: false, error: 'Servidor não encontrado ou sem API configurada' };
    }

    let credits: number | null = null;

    if (server.integrationType === 'natv') {
      const natvService = new NATVService();
      await natvService.loadConfig();
      
      if (natvService.isConfigured()) {
        const creditsResponse = await natvService.syncCredits();
        if (creditsResponse.success && creditsResponse.data) {
          credits = creditsResponse.data.credits;
        }
      }
    }
    // Adicionar outras integrações conforme necessário

    if (credits !== null) {
      await updateServerCredits(serverId, credits);
      revalidatePath('/servidores');
      return { success: true, credits };
    }

    return { success: false, error: 'Não foi possível obter créditos do servidor' };
  } catch (error: any) {
    console.error('Erro ao sincronizar créditos:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obtém servidores com integração configurada.
 */
export async function getServersWithIntegration() {
  const servers = await getServers();
  return servers.filter(server => 
    server.integrationType !== 'none' && 
    server.testAutomation && 
    server.apiKey
  );
}
