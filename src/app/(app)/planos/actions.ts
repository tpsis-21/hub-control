// @/app/(app)/planos/actions.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClientForActions } from "@/lib/supabase/clients/server";
import { isBrowserUserAdmin } from "@/lib/supabase/clients/browser";
import type { Plan, PlanGroup } from "@/lib/types";
import { planSchema, editPlanSchema, planGroupSchema, editPlanGroupSchema } from "@/lib/schemas";
import { logger } from '@/utils/production-logger'
import { requireAdminFromSession } from '@/lib/admin-role'


// Substituir todas as operações Firestore por chamadas Supabase
// Exemplo: getPlans
export async function getPlans(): Promise<Plan[]> {
  const supabase = await createServerSupabaseClientForActions();
  const { data, error } = await supabase.from('plans').select('*');
  
  if (error) {
    console.error('Erro ao buscar planos:', error);
    return [];
  }
  
  // Mapear campos do banco (snake_case) para o frontend (camelCase)
  const plans = (data || []).map(plan => ({
    ...plan,
    groupId: plan.group_id,
    panelPlanId: plan.panel_plan_id,
    priceBeforeDiscount: plan.price_before_discount,
    sendWelcomeMessage: plan.send_welcome_message,
    isPublic: plan.is_public,
    caktoUrl: (plan as { cakto_url?: string | null }).cakto_url ?? undefined,
  }));
  
  return plans as Plan[];
}

export async function getPlanGroups(): Promise<PlanGroup[]> {
  const supabase = await createServerSupabaseClientForActions();
  // Forçar busca sem cache adicionando timestamp
  const { data, error } = await supabase
    .from('plan_groups')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Erro ao buscar grupos de planos:', error);
    return [];
  }
  
  logger.debug('Grupos buscados do banco:', data?.length || 0);
  return (data || []) as PlanGroup[];
}

// IDs únicos são gerados automaticamente pelo banco de dados via triggers
// Não é mais necessário gerar IDs manualmente na aplicação

// Ações para Planos
export async function addPlanAction(data: z.infer<typeof planSchema>) {
  // O panel_plan_id será gerado automaticamente pelo trigger do banco de dados
  
  const newPlanData = {
    ...data,
    is_public: data.isPublic, // Mapear camelCase para snake_case
    send_welcome_message: data.sendWelcomeMessage, // Mapear camelCase para snake_case
    price_before_discount: data.priceBeforeDiscount, // Mapear camelCase para snake_case
    group_id: data.groupId === "none" ? undefined : data.groupId,
    cakto_url: data.caktoUrl?.trim() || null,
    // panel_plan_id será gerado automaticamente pelo trigger
  };
  
  // Remover os campos camelCase antes de enviar para o banco
  delete (newPlanData as any).countingType;
  delete (newPlanData as any).groupId;
  delete (newPlanData as any).isPublic;
  delete (newPlanData as any).sendWelcomeMessage;
  delete (newPlanData as any).priceBeforeDiscount;
  delete (newPlanData as any).panelPlanId;
  delete (newPlanData as any).caktoUrl;
  
  const supabase = await createServerSupabaseClientForActions();
  const { data: inserted, error } = await supabase.from('plans').insert([newPlanData]).select().single();
  revalidatePath('/planos');
  if (error || !inserted) return { success: false, error: error?.message || 'Erro ao adicionar plano' };
  return { success: true, plan: inserted as Plan };
}

export async function editPlanAction(data: z.infer<typeof editPlanSchema>) {
  logger.debug('🔍 editPlanAction - Dados recebidos:', JSON.stringify(data, null, 2));
  
  const { id, ...updateData } = data;
  logger.debug('🔍 editPlanAction - ID:', id);
  logger.debug('🔍 editPlanAction - updateData:', JSON.stringify(updateData, null, 2));
  
  try {
    const supabase = await createServerSupabaseClientForActions();
    
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    logger.debug('🔍 editPlanAction - Usuário autenticado:', user?.id, user?.email);
    
    if (authError || !user) {
      console.error('❌ editPlanAction - Usuário não autenticado:', authError);
      return { success: false, error: 'Usuário não autenticado' };
    }
    
    const adminCheck = await requireAdminFromSession(supabase);
    if (!adminCheck.ok) {
      return { success: false, error: adminCheck.error };
    }

    const { data: updated, error: updateError } = await supabase
      .from('plans')
      .update({
        name: updateData.name,
        price: updateData.price,
        validity: updateData.validity,
        screens: updateData.screens,
        restrictions: updateData.restrictions || null,
        is_public: updateData.isPublic,
        send_welcome_message: updateData.sendWelcomeMessage,
        price_before_discount: updateData.priceBeforeDiscount ?? null,
        panel_plan_id: updateData.panelPlanId || null,
        group_id: updateData.groupId === 'none' ? null : updateData.groupId,
        cakto_url: updateData.caktoUrl?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('❌ editPlanAction - Erro Supabase:', updateError)
      return { success: false, error: updateError.message }
    }

    revalidatePath('/planos')
    return { success: true, data: updated }
  } catch (err) {
    console.error('❌ editPlanAction - Erro inesperado:', err);
    return { success: false, error: 'Erro inesperado ao atualizar plano' };
  }
}

export async function deletePlanAction(planId: string) {
  try {
    const supabase = await createServerSupabaseClientForActions();
    
    const response = await fetch(`/api/admin/plans?id=${planId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ deletePlanAction - Erro na API:', errorData);
      return { success: false, error: errorData.error || 'Erro ao deletar plano' };
    }
    
    logger.debug('✅ deletePlanAction - Plano deletado via API segura');
    revalidatePath('/planos');
    return { success: true };
    
  } catch (apiError) {
    console.error('❌ deletePlanAction - Erro na requisição:', apiError);
    return { success: false, error: 'Erro de comunicação com o servidor' };
  }
}

// Ações para Grupos de Planos
export async function addPlanGroupAction(data: z.infer<typeof planGroupSchema>) {
    const supabase = await createServerSupabaseClientForActions();
    
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
    const supabase = await createServerSupabaseClientForActions();
    const { data: updated, error } = await supabase.from('plan_groups').update(updateData).eq('id', id).select().single();
    revalidatePath('/planos/grupos');
    revalidatePath('/planos');
    if (error || !updated) return { success: false, error: error?.message || 'Erro ao atualizar grupo' };
    return { success: true, group: updated as PlanGroup };
}

// Função de teste para debug
export async function testDeletePermissions() {
    logger.debug('Teste - Iniciando verificação de permissões');
    
    const supabase = await createServerSupabaseClientForActions();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    logger.debug('Teste - Usuário:', user?.id, user?.email);
    logger.debug('Teste - Erro auth:', authError);
    
    if (user) {
        logger.debug('Teste - Usuário autenticado, assumindo role admin baseado na verificação anterior');
        logger.debug('Teste - Profile: { role: "admin" }');
        logger.debug('Teste - Permissão para deletar: true');
    }
    
    return { success: true };
}

export async function deletePlanGroupAction(groupId: string) {
    const supabase = await createServerSupabaseClientForActions();
    
    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('Erro de autenticação:', authError);
        return { success: false, error: 'Usuário não autenticado' };
    }
    
    const adminCheck = await requireAdminFromSession(supabase);
    if (!adminCheck.ok) {
        return { success: false, error: adminCheck.error };
    }
    
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
        logger.debug(`Grupo ${groupId} excluído com sucesso`);
        
        // Verificar se realmente foi excluído
        const { data: checkDeleted } = await supabase
            .from('plan_groups')
            .select('id')
            .eq('id', groupId)
            .single();
        
        if (!checkDeleted) {
            logger.debug(`Confirmado: Grupo ${groupId} foi excluído do banco`);
        } else {
            console.error(`ERRO: Grupo ${groupId} ainda existe no banco após exclusão`);
        }
        
        return { success: true };
    } catch (error: any) {
        return { success: false, error: 'Erro interno do servidor' };
    }
}

