import { createServerSupabaseClient } from "@/lib/supabase/clients/server";
import { InAppNotification } from '@/lib/types';

export class NotificationsService {
  // Criar notificação in-app
  async createInAppNotification({
    userId,
    type,
    title,
    message,
    data = {}
  }: {
    userId: string;
    type: 'payment_activated' | 'payment_pending' | 'payment_confirmed' | 'system';
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<InAppNotification | null> {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: notification, error } = await supabase
        .from('in_app_notifications')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data,
          read: false
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar notificação:', error);
        return null;
      }

      return notification;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return null;
    }
  }

  // Buscar notificações do usuário
  async getInAppNotifications(userId: string, limit = 20): Promise<InAppNotification[]> {
    try {
      const supabase = await createServerSupabaseClient();
      const { data: notifications, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Erro ao buscar notificações:', error);
        return [];
      }

      return notifications || [];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return [];
    }
  }

  // Marcar notificação como lida
  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }

  // Marcar todas as notificações como lidas
  async markAllNotificationsAsRead(userId: string): Promise<boolean> {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('in_app_notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Erro ao marcar todas as notificações como lidas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      return false;
    }
  }

  // Contar notificações não lidas
  async getUnreadNotificationsCount(userId: string): Promise<number> {
    try {
      const supabase = await createServerSupabaseClient();
      const { count, error } = await supabase
        .from('in_app_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Erro ao contar notificações não lidas:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }

  // Deletar notificação
  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('in_app_notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Erro ao deletar notificação:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      return false;
    }
  }

  // Limpar notificações antigas (mais de 30 dias)
  async cleanupOldNotifications(): Promise<boolean> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const supabase = await createServerSupabaseClient();
      const { error } = await supabase
        .from('in_app_notifications')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (error) {
        console.error('Erro ao limpar notificações antigas:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao limpar notificações antigas:', error);
      return false;
    }
  }
}

export const notificationsService = new NotificationsService();
