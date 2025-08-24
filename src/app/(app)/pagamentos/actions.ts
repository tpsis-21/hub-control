// @/app/(app)/pagamentos/actions.ts
"use server";

import { createApiSupabaseClient } from "@/lib/supabase/clients/api";
import type { Payment } from "@/lib/types";

export async function getPayments(): Promise<Payment[]> {
  const supabase = await createApiSupabaseClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      client:clients(id, name, whatsapp),
      plan:plans(id, name, price)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pagamentos:', error);
    throw new Error('Erro ao carregar pagamentos');
  }

  return data || [];
}

export async function getPaymentsByClient(clientId: string): Promise<Payment[]> {
  const supabase = await createApiSupabaseClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      plan:plans(id, name, price)
    `)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pagamentos do cliente:', error);
    throw new Error('Erro ao carregar pagamentos do cliente');
  }

  return data || [];
}

export async function getPendingManualPayments(): Promise<Payment[]> {
  const supabase = await createApiSupabaseClient();
  
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      client:clients(id, name, whatsapp),
      plan:plans(id, name, price)
    `)
    .eq('status', 'Pendente de ativação manual')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pagamentos pendentes:', error);
    throw new Error('Erro ao carregar pagamentos pendentes');
  }

  return data || [];
}

export async function updatePaymentStatus(paymentId: string, status: 'Pago' | 'Pendente' | 'Atrasado' | 'Aguardando' | 'Confirmado' | 'Recusado' | 'Pendente de ativação manual' | 'Ativado'): Promise<{ success: boolean; error?: string }> {
  const supabase = await createApiSupabaseClient();
  
  const { error } = await supabase
    .from('payments')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', paymentId);

  if (error) {
    console.error('Erro ao atualizar status do pagamento:', error);
    return { success: false, error: 'Erro ao atualizar status do pagamento' };
  }

  return { success: true };
}

export async function activatePayment(paymentId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createApiSupabaseClient();
  
  try {
    // Atualizar status do pagamento
    const { error: paymentError } = await supabase
      .from('payments')
      .update({ 
        status: 'Ativado',
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (paymentError) {
      throw paymentError;
    }

    // Buscar dados do pagamento para criar notificação
    const { data: payment, error: fetchError } = await supabase
      .from('payments')
      .select(`
        *,
        client:clients(id, name),
        plan:plans(name)
      `)
      .eq('id', paymentId)
      .single();

    if (fetchError || !payment) {
      throw new Error('Pagamento não encontrado');
    }

    // Criar notificação in-app para o cliente
    await createInAppNotification({
      userId: payment.client.id,
      type: 'payment_activated',
      title: 'Pagamento Ativado',
      message: `Seu pagamento do plano ${payment.plan.name} foi ativado com sucesso!`,
      data: {
        paymentId: payment.id,
        planName: payment.plan.name,
        amount: payment.amount
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Erro ao ativar pagamento:', error);
    return { success: false, error: 'Erro ao ativar pagamento' };
  }
}

export async function createInAppNotification(notification: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createApiSupabaseClient();
  
  const { error } = await supabase
    .from('in_app_notifications')
    .insert({
      user_id: notification.userId,
      type: notification.type as any,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      read: false,
      created_at: new Date().toISOString()
    } as any);

  if (error) {
    console.error('Erro ao criar notificação:', error);
    return { success: false, error: 'Erro ao criar notificação' };
  }

  return { success: true };
}

export async function getInAppNotifications(userId: string): Promise<any[]> {
  const supabase = await createApiSupabaseClient();
  
  const { data, error } = await supabase
    .from('in_app_notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }

  return data || [];
}

export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createApiSupabaseClient();
  
  const { error } = await supabase
    .from('in_app_notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return { success: false, error: 'Erro ao marcar notificação como lida' };
  }

  return { success: true };
}