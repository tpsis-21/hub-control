import webpush from 'web-push';
import { createClient } from '@/lib/supabase-server';

// Configurar VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@hubcontrol.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
  url?: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  created_at: string;
  updated_at: string;
}

class PushNotificationService {
  private supabase = createClient();

  /**
   * Enviar notificação push para um usuário específico
   */
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<boolean> {
    try {
      // Buscar subscriptions do usuário
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Erro ao buscar subscriptions:', error);
        return false;
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log(`Usuário ${userId} não possui subscriptions ativas`);
        return false;
      }

      // Enviar para todas as subscriptions do usuário
      const results = await Promise.allSettled(
        subscriptions.map(subscription => this.sendNotification(subscription, payload))
      );

      // Verificar se pelo menos uma notificação foi enviada com sucesso
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      
      console.log(`Enviadas ${successCount}/${subscriptions.length} notificações para usuário ${userId}`);
      
      return successCount > 0;
    } catch (error) {
      console.error('Erro ao enviar notificação para usuário:', error);
      return false;
    }
  }

  /**
   * Enviar notificação push para múltiplos usuários
   */
  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendToUser(userId, payload))
    );

    const success = results.filter(result => result.status === 'fulfilled' && result.value).length;
    const failed = results.length - success;

    console.log(`Notificações enviadas: ${success} sucessos, ${failed} falhas`);

    return { success, failed };
  }

  /**
   * Enviar notificação para todos os usuários com subscriptions ativas
   */
  async sendToAll(payload: PushNotificationPayload): Promise<{ success: number; failed: number }> {
    try {
      // Buscar todas as subscriptions ativas
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('*');

      if (error) {
        console.error('Erro ao buscar todas as subscriptions:', error);
        return { success: 0, failed: 0 };
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log('Nenhuma subscription ativa encontrada');
        return { success: 0, failed: 0 };
      }

      // Enviar para todas as subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(subscription => this.sendNotification(subscription, payload))
      );

      const success = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - success;

      console.log(`Notificação broadcast: ${success} sucessos, ${failed} falhas`);

      return { success, failed };
    } catch (error) {
      console.error('Erro ao enviar notificação broadcast:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Enviar notificação para usuários de uma empresa específica
   */
  async sendToCompany(empresaId: string, payload: PushNotificationPayload): Promise<{ success: number; failed: number }> {
    try {
      // Buscar usuários da empresa através da tabela profiles
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('empresa_id', empresaId);

      if (profilesError) {
        console.error('Erro ao buscar usuários da empresa:', profilesError);
        return { success: 0, failed: 0 };
      }

      if (!profiles || profiles.length === 0) {
        console.log(`Nenhum usuário encontrado para empresa ${empresaId}`);
        return { success: 0, failed: 0 };
      }

      const userIds = profiles.map(profile => profile.id);
      return await this.sendToUsers(userIds, payload);
    } catch (error) {
      console.error('Erro ao enviar notificação para empresa:', error);
      return { success: 0, failed: 0 };
    }
  }

  /**
   * Enviar notificação push individual
   */
  private async sendNotification(subscription: PushSubscription, payload: PushNotificationPayload): Promise<boolean> {
    try {
      const pushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh_key,
          auth: subscription.auth_key
        }
      };

      const notificationPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        badge: payload.badge || '/icon-72x72.png',
        tag: payload.tag || 'notification',
        data: {
          ...payload.data,
          url: payload.url || '/'
        },
        actions: payload.actions || [
          {
            action: 'view',
            title: 'Ver',
            icon: '/icon-view.png'
          },
          {
            action: 'dismiss',
            title: 'Dispensar',
            icon: '/icon-dismiss.png'
          }
        ],
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false,
        vibrate: payload.vibrate || [200, 100, 200]
      });

      await webpush.sendNotification(pushSubscription, notificationPayload);
      return true;
    } catch (error: any) {
      console.error('Erro ao enviar notificação push:', error);
      
      // Se a subscription é inválida, remover do banco
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('Subscription inválida, removendo do banco:', subscription.id);
        await this.removeInvalidSubscription(subscription.id);
      }
      
      return false;
    }
  }

  /**
   * Remover subscription inválida do banco de dados
   */
  private async removeInvalidSubscription(subscriptionId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) {
        console.error('Erro ao remover subscription inválida:', error);
      }
    } catch (error) {
      console.error('Erro ao remover subscription inválida:', error);
    }
  }

  /**
   * Obter estatísticas de subscriptions
   */
  async getSubscriptionStats(): Promise<{
    total: number;
    byUser: { [userId: string]: number };
    recent: number;
  }> {
    try {
      const { data: subscriptions, error } = await this.supabase
        .from('push_subscriptions')
        .select('user_id, created_at');

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return { total: 0, byUser: {}, recent: 0 };
      }

      const total = subscriptions?.length || 0;
      const byUser: { [userId: string]: number } = {};
      let recent = 0;

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      subscriptions?.forEach(sub => {
        byUser[sub.user_id] = (byUser[sub.user_id] || 0) + 1;
        
        if (new Date(sub.created_at) > oneDayAgo) {
          recent++;
        }
      });

      return { total, byUser, recent };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return { total: 0, byUser: {}, recent: 0 };
    }
  }
}

export const pushNotificationService = new PushNotificationService();

// Funções de conveniência para casos comuns
export const sendPaymentNotification = async (userId: string, paymentData: any) => {
  return await pushNotificationService.sendToUser(userId, {
    title: 'Novo Pagamento Recebido',
    body: `Pagamento de R$ ${paymentData.amount} foi processado`,
    tag: 'payment',
    data: { type: 'payment', paymentId: paymentData.id },
    url: '/pagamentos',
    vibrate: [200, 100, 200, 100, 200]
  });
};

export const sendClientNotification = async (userId: string, clientData: any) => {
  return await pushNotificationService.sendToUser(userId, {
    title: 'Novo Cliente Cadastrado',
    body: `Cliente ${clientData.name} foi adicionado`,
    tag: 'client',
    data: { type: 'client', clientId: clientData.id },
    url: '/clientes'
  });
};

export const sendSystemNotification = async (userIds: string[], message: string) => {
  return await pushNotificationService.sendToUsers(userIds, {
    title: 'Notificação do Sistema',
    body: message,
    tag: 'system',
    data: { type: 'system' },
    requireInteraction: true
  });
};