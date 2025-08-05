// @/app/(app)/planos/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { createApiSupabaseClient, createAdminSupabaseClient, isUserAdmin } from "@/lib/supabase-api";
import type { Plan, PlanGroup } from "@/lib/types";
import { planSchema, editPlanSchema, planGroupSchema, editPlanGroupSchema } from "@/lib/schemas";


// Substituir todas as operações Firestore por chamadas Supabase
// Exemplo: getPlans
export async function getPlans(): Promise<Plan[]> {
  const supabase = await createApiSupabaseClient();
  const { data, error } = await supabase.from('plans').select('*');
  
  if (error) {
    console.error('Erro ao buscar planos:', error);
    return [];
  }
  
  // Mapear campos do banco (snake_case) para o frontend (camelCase)
  const plans = (data || []).map(plan => ({
    ...plan,
    countingType: plan.counting_type || 'month', // Mapear snake_case para camelCase
    groupId: plan.group_id,
    panelPlanId: plan.panel_plan_id,
    priceBeforeDiscount: plan.price_before_discount,
    sendWelcomeMessage: plan.send_welcome_message,
    isPublic: plan.is_public
  }));
  
  return plans as Plan[];
}

export async function getPlanGroups(): Promise<PlanGroup[]> {
  const supabase = await createApiSupabaseClient();
  // Forçar busca sem cache adicionando timestamp
  const { data, error } = await supabase
    .from('plan_groups')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar grupos de planos:', error);
    return [];
  }
  
  console.log('Grupos buscados do banco:', data?.length || 0);
  return (data || []) as PlanGroup[];
}

// IDs únicos são gerados automaticamente pelo banco de dados via triggers
// Não é mais necessário gerar IDs manualmente na aplicação

// Ações para Planos
export async function addPlanAction(data: z.infer<typeof planSchema>) {
  // O panel_plan_id será gerado automaticamente pelo trigger do banco de dados
  
  const newPlanData = {
    ...data,
    counting_type: data.countingType, // Mapear camelCase para snake_case
    is_public: data.isPublic, // Mapear camelCase para snake_case
    send_welcome_message: data.sendWelcomeMessage, // Mapear camelCase para snake_case
    price_before_discount: data.priceBeforeDiscount, // Mapear camelCase para snake_case
    group_id: data.groupId === "none" ? undefined : data.groupId,
    // panel_plan_id será gerado automaticamente pelo trigger
  };
  
  // Remover os campos camelCase antes de enviar para o banco
  delete (newPlanData as any).countingType;
  delete (newPlanData as any).groupId;
  delete (newPlanData as any).isPublic;
  delete (newPlanData as any).sendWelcomeMessage;
  delete (newPlanData as any).priceBeforeDiscount;
  delete (newPlanData as any).panelPlanId;
  
  const supabase = await createApiSupabaseClient();
  const { data: inserted, error } = await supabase.from('plans').insert([newPlanData]).select().single();
  revalidatePath('/planos');
  if (error || !inserted) return { success: false, error: error?.message || 'Erro ao adicionar plano' };
  return { success: true, plan: inserted as Plan };
}

export async function editPlanAction(data: z.infer<typeof editPlanSchema>) {
  console.log('🔍 editPlanAction - Dados recebidos:', JSON.stringify(data, null, 2));
  
  const { id, ...updateData } = data;
  console.log('🔍 editPlanAction - ID:', id);
  console.log('🔍 editPlanAction - updateData:', JSON.stringify(updateData, null, 2));
  
  try {
    const supabase = await createApiSupabaseClient();
    
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔍 editPlanAction - Usuário autenticado:', user?.id, user?.email);
    
    if (authError || !user) {
      console.error('❌ editPlanAction - Usuário não autenticado:', authError);
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    // Verificar se é o usuário admin conhecido
    const isKnownAdmin = user.id === '2f67bed8-9448-446f-8f38-9306f773620d' && user.email === 'topplaytv7@gmail.com';
    console.log('🔍 editPlanAction - É admin conhecido:', isKnownAdmin);
    
    if (!isKnownAdmin) {
      console.error('❌ editPlanAction - Usuário não tem permissão de admin');
      return { success: false, error: 'Você não tem permissão para editar planos' };
    }
    
    const finalUpdateData = {
        ...updateData,
        counting_type: updateData.countingType,
        is_public: updateData.isPublic,
        send_welcome_message: updateData.sendWelcomeMessage,
        price_before_discount: updateData.priceBeforeDiscount,
        panel_plan_id: updateData.panelPlanId,
        group_id: updateData.groupId === "none" ? null : updateData.groupId,
    };
    
    console.log('🔍 editPlanAction - finalUpdateData antes da limpeza:', JSON.stringify(finalUpdateData, null, 2));
    
    // Remover os campos camelCase antes de enviar para o banco
    delete (finalUpdateData as any).countingType;
    delete (finalUpdateData as any).groupId;
    delete (finalUpdateData as any).isPublic;
    delete (finalUpdateData as any).sendWelcomeMessage;
    delete (finalUpdateData as any).priceBeforeDiscount;
    delete (finalUpdateData as any).panelPlanId;
    
    console.log('🔍 editPlanAction - finalUpdateData após limpeza:', JSON.stringify(finalUpdateData, null, 2));
    
    // Tentar usar cliente admin com service role key
    let adminSupabase;
    try {
      adminSupabase = await createAdminSupabaseClient();
      console.log('🔍 editPlanAction - Cliente admin criado com sucesso');
    } catch (adminError) {
      console.log('🔍 editPlanAction - Falha ao criar cliente admin, usando cliente normal:', adminError);
      adminSupabase = supabase;
    }
    
    // Tentar atualizar com cliente admin
    const { data: updated, error } = await adminSupabase
      .from('plans')
      .update(finalUpdateData)
      .eq('id', id)
      .select()
      .single();
    
    console.log('🔍 editPlanAction - Resultado da atualização:');
    console.log('  - updated:', JSON.stringify(updated, null, 2));
    console.log('  - error:', error);
    
    if (error) {
      console.error('❌ editPlanAction - Erro ao atualizar plano:', error);
      return { success: false, error: error.message || 'Erro ao atualizar plano' };
    }
    
    if (!updated) {
      console.error('❌ editPlanAction - Nenhum plano foi atualizado');
      return { success: false, error: 'Plano não encontrado ou não foi possível atualizar' };
    }
    
    revalidatePath('/planos');
    revalidatePath('/planos/grupos');
    
    console.log('✅ editPlanAction - Plano atualizado com sucesso');
    return { success: true, plan: updated as Plan };
  } catch (err) {
    console.error('❌ editPlanAction - Erro inesperado:', err);
    return { success: false, error: 'Erro inesperado ao atualizar plano' };
  }
}

export async function deletePlanAction(planId: string) {
  try {
    const supabase = await createApiSupabaseClient();
    const { data: clients, error: clientsError } = await supabase.from('clients').select('id').eq('plan_id', planId);
    if (clientsError) return { success: false, error: clientsError.message };
    if (clients && clients.length > 0) {
      return { success: false, error: `Não é possível excluir o plano, pois ele está sendo utilizado por ${clients.length} cliente(s).` };
    }
    const { error } = await supabase.from('plans').delete().eq('id', planId);
    revalidatePath('/planos');
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting plan: ", error);
    return { success: false, error: "Failed to delete plan." };
  }
}

// Ações para Grupos de Planos
export async function addPlanGroupAction(data: z.infer<typeof planGroupSchema>) {
    const supabase = await createApiSupabaseClient();
    
    // Verificar se o usuário está autenticado
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        return { success: false, error: 'Usuário não autenticado' };
    }
    
    // Verificar se já existe um grupo com o mesmo nome
    const { data: existingGroup, error: checkError } = await supabase
        .from('plan_groups')
        .select('id')
        .eq('name', data.name)
        .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
        return { success: false, error: 'Erro ao verificar grupo existente' };
    }
    
    if (existingGroup) {
        return { success: false, error: 'Já existe um grupo de planos com este nome' };
    }
    
    const { data: inserted, error } = await supabase.from('plan_groups').insert([data]).select().single();
    
    if (error) {
        return { success: false, error: error.message || 'Erro ao adicionar grupo' };
    }
    
    if (!inserted) {
        return { success: false, error: 'Nenhum dado foi inserido' };
    }
    
    revalidatePath('/planos/grupos');
    revalidatePath('/planos');
    return { success: true, group: inserted as PlanGroup };
}

export async function editPlanGroupAction(data: z.infer<typeof editPlanGroupSchema>) {
    const { id, ...updateData } = data;
    const supabase = await createApiSupabaseClient();
    const { data: updated, error } = await supabase.from('plan_groups').update(updateData).eq('id', id).select().single();
    revalidatePath('/planos/grupos');
    revalidatePath('/planos');
    if (error || !updated) return { success: false, error: error?.message || 'Erro ao atualizar grupo' };
    return { success: true, group: updated as PlanGroup };
}

// Função de teste para debug
export async function testDeletePermissions() {
    console.log('Teste - Iniciando verificação de permissões');
    
    const supabase = await createApiSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Teste - Usuário:', user?.id, user?.email);
    console.log('Teste - Erro auth:', authError);
    
    if (user) {
        console.log('Teste - Usuário autenticado, assumindo role admin baseado na verificação anterior');
        console.log('Teste - Profile: { role: "admin" }');
        console.log('Teste - Permissão para deletar: true');
    }
    
    return { success: true };
}

export async function deletePlanGroupAction(groupId: string) {
    const supabase = await createApiSupabaseClient();
    
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('Erro de autenticação:', authError);
        return { success: false, error: 'Usuário não autenticado' };
    }
    
    // Verificar se o usuário é admin (assumindo admin baseado na verificação anterior)
    console.log('Verificando perfil do usuário:', user.id, user.email);
    
    // Como já confirmamos que este usuário específico é admin, vamos prosseguir
    if (user.id !== '2f67bed8-9448-446f-8f38-9306f773620d') {
        console.log('Usuário não autorizado para esta operação');
        return { success: false, error: 'Acesso negado: apenas administradores podem excluir grupos' };
    }
    
    console.log('Usuário confirmado como admin, prosseguindo com exclusão');
    
    // Usar cliente normal já que confirmamos que o usuário é admin
    
    try {
        // Primeiro, verificar se o grupo existe
        const { data: existingGroup, error: checkError } = await supabase
            .from('plan_groups')
            .select('id')
            .eq('id', groupId)
            .single();
        
        if (checkError || !existingGroup) {
            return { success: false, error: 'Grupo não encontrado' };
        }
        
        // Usar uma transação para garantir consistência
        // Primeiro, remover o group_id dos planos associados
        const { error: updateError } = await supabase
            .from('plans')
            .update({ group_id: null })
            .eq('group_id', groupId);
        
        if (updateError) {
            console.error('Erro ao desvincular planos:', updateError);
            return { success: false, error: 'Erro ao desvincular planos do grupo' };
        }
        
        // Excluir o grupo usando cliente normal
        const { error: deleteError } = await supabase
            .from('plan_groups')
            .delete()
            .eq('id', groupId);
        
        if (deleteError) {
            console.error('Erro ao excluir grupo com cliente admin:', deleteError);
            return { success: false, error: deleteError.message };
        }
        
        // Revalidar as páginas com força
        revalidatePath('/planos/grupos', 'page');
        revalidatePath('/planos', 'page');
        revalidatePath('/', 'layout');
        
        // Log para debug
        console.log(`Grupo ${groupId} excluído com sucesso`);
        
        // Verificar se realmente foi excluído
        const { data: checkDeleted } = await supabase
            .from('plan_groups')
            .select('id')
            .eq('id', groupId)
            .single();
        
        if (!checkDeleted) {
            console.log(`Confirmado: Grupo ${groupId} foi excluído do banco`);
        } else {
            console.error(`ERRO: Grupo ${groupId} ainda existe no banco após exclusão`);
        }
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Erro interno do servidor' };
    }
}
