import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface para configuração de monitoramento de créditos
 */
interface CreditMonitoringConfig {
  serverId: string;
  enabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  notificationEnabled: boolean;
}

/**
 * Interface para resultado de verificação de créditos
 */
interface CreditCheckResult {
  serverId: string;
  serverName: string;
  currentCredits: number;
  status: 'ok' | 'warning' | 'critical';
  shouldNotify: boolean;
  lastNotified?: Date;
}

/**
 * Interface para notificação de crédito
 */
interface CreditNotification {
  id: string;
  userId: string;
  serverId: string;
  serverName: string;
  currentCredits: number;
  threshold: number;
  type: 'warning' | 'critical';
  message: string;
  createdAt: Date;
  read: boolean;
}

/**
 * Serviço para monitoramento e notificação de créditos baixos
 */
export class CreditMonitoringService {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createApiSupabaseClient();
  }

  /**
   * Verifica créditos de todos os servidores com monitoramento habilitado
   */
  async checkAllServersCredits(userId: string): Promise<CreditCheckResult[]> {
    try {
      // Buscar servidores com monitoramento habilitado
      const { data: servers, error } = await this.supabase
        .from('servers')
        .select('id, name, api_url, api_headers, api_body, credit_monitoring_enabled, credit_warning_threshold, credit_critical_threshold')
        .eq('credit_monitoring_enabled', true);

      if (error) {
        console.error('Erro ao buscar servidores:', error);
        return [];
      }

      if (!servers || servers.length === 0) {
        return [];
      }

      const results: CreditCheckResult[] = [];

      // Verificar créditos de cada servidor
      for (const server of servers) {
        try {
          const creditResult = await this.checkServerCredits(server, userId);
          if (creditResult) {
            results.push(creditResult);
          }
        } catch (error) {
          console.error(`Erro ao verificar créditos do servidor ${server.name}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error('Erro ao verificar créditos de servidores:', error);
      return [];
    }
  }

  /**
   * Verifica créditos de um servidor específico
   */
  private async checkServerCredits(server: any, userId: string): Promise<CreditCheckResult | null> {
    try {
      // Fazer chamada para API do servidor para obter créditos
      const credits = await this.fetchServerCredits(server);
      
      if (credits === null) {
        return null;
      }

      // Determinar status baseado nos thresholds
      let status: 'ok' | 'warning' | 'critical' = 'ok';
      let shouldNotify = false;

      if (credits <= server.credit_critical_threshold) {
        status = 'critical';
        shouldNotify = true;
      } else if (credits <= server.credit_warning_threshold) {
        status = 'warning';
        shouldNotify = true;
      }

      // Verificar se já foi notificado recentemente
      if (shouldNotify && status !== 'ok') {
        const lastNotification = await this.getLastNotification(userId, server.id, status as 'warning' | 'critical');
        if (lastNotification && this.isRecentNotification(lastNotification.createdAt, status as 'warning' | 'critical')) {
          shouldNotify = false;
        }
      }

      return {
        serverId: server.id,
        serverName: server.name,
        currentCredits: credits,
        status,
        shouldNotify
      };
    } catch (error) {
      console.error(`Erro ao verificar créditos do servidor ${server.name}:`, error);
      return null;
    }
  }

  /**
   * Busca créditos do servidor via API
   */
  private async fetchServerCredits(server: any): Promise<number | null> {
    try {
      if (!server.api_url) {
        return null;
      }

      const headers = JSON.parse(server.api_headers || '{}');
      const body = JSON.parse(server.api_body || '{}');

      // Adicionar endpoint específico para consulta de créditos
      const creditsUrl = `${server.api_url}/credits` || `${server.api_url}?action=get_credits`;

      const response = await fetch(creditsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          ...body,
          action: 'get_credits'
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extrair créditos da resposta (pode variar por painel)
      return this.extractCreditsFromResponse(data, server);
    } catch (error) {
      console.error(`Erro ao buscar créditos do servidor ${server.name}:`, error);
      return null;
    }
  }

  /**
   * Extrai créditos da resposta da API baseado no tipo de painel
   */
  private extractCreditsFromResponse(data: any, server: any): number | null {
    try {
      // Para NATV
      if (data.credits !== undefined) {
        return parseInt(data.credits);
      }

      // Para The Best
      if (data.balance !== undefined) {
        return parseInt(data.balance);
      }

      // Para outros painéis - tentar campos comuns
      if (data.credit !== undefined) {
        return parseInt(data.credit);
      }

      if (data.remaining_credits !== undefined) {
        return parseInt(data.remaining_credits);
      }

      console.warn(`Formato de resposta não reconhecido para servidor ${server.name}:`, data);
      return null;
    } catch (error) {
      console.error(`Erro ao extrair créditos da resposta:`, error);
      return null;
    }
  }

  /**
   * Cria notificação de crédito baixo
   */
  async createCreditNotification(
    userId: string,
    serverId: string,
    serverName: string,
    currentCredits: number,
    threshold: number,
    type: 'warning' | 'critical'
  ): Promise<void> {
    try {
      const message = this.generateNotificationMessage(serverName, currentCredits, type);

      const { error } = await this.supabase
        .from('server_credit_notifications')
        .insert({
          user_id: userId,
          server_id: serverId,
          server_name: serverName,
          current_credits: currentCredits,
          threshold: threshold,
          type: type,
          message: message,
          read: false
        });

      if (error) {
        console.error('Erro ao criar notificação de crédito:', error);
      }
    } catch (error) {
      console.error('Erro ao criar notificação de crédito:', error);
    }
  }

  /**
   * Gera mensagem de notificação
   */
  private generateNotificationMessage(serverName: string, currentCredits: number, type: 'warning' | 'critical'): string {
    if (type === 'critical') {
      if (currentCredits === 0) {
        return `⚠️ CRÍTICO: O servidor "${serverName}" está sem créditos!`;
      }
      return `⚠️ CRÍTICO: O servidor "${serverName}" está com apenas ${currentCredits} créditos restantes.`;
    }

    return `⚡ AVISO: O servidor "${serverName}" está com ${currentCredits} créditos restantes.`;
  }

  /**
   * Busca última notificação para um servidor
   */
  private async getLastNotification(userId: string, serverId: string, type: 'warning' | 'critical'): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('server_credit_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('server_id', serverId)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Erro ao buscar última notificação:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar última notificação:', error);
      return null;
    }
  }

  /**
   * Verifica se a notificação é recente (evita spam)
   */
  private isRecentNotification(lastNotificationDate: Date, type: 'warning' | 'critical'): boolean {
    const now = new Date();
    const diffInHours = (now.getTime() - new Date(lastNotificationDate).getTime()) / (1000 * 60 * 60);

    // Para notificações críticas, notificar a cada 1 hora
    // Para warnings, notificar a cada 6 horas
    const cooldownHours = type === 'critical' ? 1 : 6;

    return diffInHours < cooldownHours;
  }

  /**
   * Busca notificações não lidas para um usuário
   */
  async getUnreadNotifications(userId: string): Promise<CreditNotification[]> {
    try {
      const { data, error } = await this.supabase
        .from('server_credit_notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar notificações não lidas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro ao buscar notificações não lidas:', error);
      return [];
    }
  }

  /**
   * Marca notificação como lida
   */
  async markNotificationAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('server_credit_notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }

  /**
   * Executa verificação completa e cria notificações necessárias
   */
  async runCreditMonitoring(userId: string): Promise<void> {
    try {
      const results = await this.checkAllServersCredits(userId);

      for (const result of results) {
        if (result.shouldNotify) {
          const threshold = result.status === 'critical' 
            ? await this.getCriticalThreshold(result.serverId)
            : await this.getWarningThreshold(result.serverId);

          await this.createCreditNotification(
            userId,
            result.serverId,
            result.serverName,
            result.currentCredits,
            threshold || 0,
            result.status as 'warning' | 'critical'
          );
        }
      }
    } catch (error) {
      console.error('Erro ao executar monitoramento de créditos:', error);
    }
  }

  /**
   * Busca threshold de warning para um servidor
   */
  private async getWarningThreshold(serverId: string): Promise<number | null> {
    try {
      const { data, error } = await this.supabase
        .from('servers')
        .select('credit_warning_threshold')
        .eq('id', serverId)
        .single();

      if (error) {
        console.error('Erro ao buscar warning threshold:', error);
        return null;
      }

      return data?.credit_warning_threshold || null;
    } catch (error) {
      console.error('Erro ao buscar warning threshold:', error);
      return null;
    }
  }

  /**
   * Busca threshold crítico para um servidor
   */
  private async getCriticalThreshold(serverId: string): Promise<number | null> {
    try {
      const { data, error } = await this.supabase
        .from('servers')
        .select('credit_critical_threshold')
        .eq('id', serverId)
        .single();

      if (error) {
        console.error('Erro ao buscar critical threshold:', error);
        return null;
      }

      return data?.credit_critical_threshold || null;
    } catch (error) {
      console.error('Erro ao buscar critical threshold:', error);
      return null;
    }
  }
}

// Instância singleton
let creditMonitoringInstance: CreditMonitoringService | null = null;

export function getCreditMonitoringService(): CreditMonitoringService {
  if (!creditMonitoringInstance) {
    creditMonitoringInstance = new CreditMonitoringService();
  }
  return creditMonitoringInstance;
}

// Export types
export type {
  CreditMonitoringConfig,
  CreditCheckResult,
  CreditNotification
};