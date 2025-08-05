// @/services/reminder.service.ts

import { createApiSupabaseClient } from "@/lib/supabase-api";
import { mapDatabaseClientToClient } from "@/lib/database-mappers";
import { MessageQueueService } from "@/services/message-queue.service";
import { LoggerService } from "@/services/logger.service";
import type { Client } from "@/lib/types";

export class ReminderService {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;

  /**
   * Inicia o serviço de lembretes automáticos
   * Verifica clientes com vencimento próximo a cada hora
   */
  static startReminderService() {
    if (this.isRunning) {
      console.log('Serviço de lembretes já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('Iniciando serviço de lembretes automáticos...');

    // Executa imediatamente e depois a cada hora
    this.checkExpiringClients();
    this.intervalId = setInterval(() => {
      this.checkExpiringClients();
    }, 60 * 60 * 1000); // 1 hora

    LoggerService.log('system', 'Serviço de lembretes iniciado', {
      interval: '1 hora',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Para o serviço de lembretes automáticos
   */
  static stopReminderService() {
    if (!this.isRunning) {
      console.log('Serviço de lembretes não está em execução');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Serviço de lembretes parado');
    LoggerService.log('system', 'Serviço de lembretes parado', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Verifica clientes com vencimento próximo e envia lembretes
   */
  private static async checkExpiringClients() {
    try {
      console.log('Verificando clientes com vencimento próximo...');
      
      const supabase = await createApiSupabaseClient();
      const now = new Date();
      const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
      const oneDayFromNow = new Date(now.getTime() + (1 * 24 * 60 * 60 * 1000));

      // Buscar clientes ativos com vencimento em 3 dias ou 1 dia
      const { data: expiringClients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'Ativo')
        .or(`expiration_date.lte.${threeDaysFromNow.toISOString()},expiration_date.lte.${oneDayFromNow.toISOString()}`)
        .gte('expiration_date', now.toISOString());

      if (error) {
        console.error('Erro ao buscar clientes com vencimento próximo:', error);
        return;
      }

      if (!expiringClients || expiringClients.length === 0) {
        console.log('Nenhum cliente com vencimento próximo encontrado');
        return;
      }

      console.log(`Encontrados ${expiringClients.length} clientes com vencimento próximo`);

      for (const clientData of expiringClients) {
        const client = mapDatabaseClientToClient(clientData);
        
        // Verificar se o cliente tem email ou WhatsApp
        if (!client.email && !client.whatsapp) {
          continue;
        }

        const expirationDate = new Date(client.expirationDate);
        const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

        // Enviar lembrete baseado nos dias restantes
        if (daysUntilExpiration <= 1) {
          await this.sendUrgentReminder(client, daysUntilExpiration);
        } else if (daysUntilExpiration <= 3) {
          await this.sendNormalReminder(client, daysUntilExpiration);
        }
      }

      LoggerService.log('system', 'Verificação de lembretes concluída', {
        clientsChecked: expiringClients.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro na verificação de lembretes:', error);
      LoggerService.log('error', 'Erro na verificação de lembretes', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Envia lembrete normal (3 dias antes do vencimento)
   */
  private static async sendNormalReminder(client: Client, daysUntilExpiration: number) {
    try {
      await MessageQueueService.addExpirationReminder({
        clientId: client.id,
        clientName: client.name,
        email: client.email,
        whatsapp: client.whatsapp,
        expirationDate: client.expirationDate,
        daysUntilExpiration,
        isUrgent: false
      });

      console.log(`Lembrete normal enviado para ${client.name} (${daysUntilExpiration} dias)`);
    } catch (error) {
      console.error(`Erro ao enviar lembrete normal para ${client.name}:`, error);
    }
  }

  /**
   * Envia lembrete urgente (1 dia ou menos antes do vencimento)
   */
  private static async sendUrgentReminder(client: Client, daysUntilExpiration: number) {
    try {
      await MessageQueueService.addExpirationReminder({
        clientId: client.id,
        clientName: client.name,
        email: client.email,
        whatsapp: client.whatsapp,
        expirationDate: client.expirationDate,
        daysUntilExpiration,
        isUrgent: true
      });

      console.log(`Lembrete urgente enviado para ${client.name} (${daysUntilExpiration} dias)`);
    } catch (error) {
      console.error(`Erro ao enviar lembrete urgente para ${client.name}:`, error);
    }
  }

  /**
   * Verifica clientes vencidos e atualiza status
   */
  static async checkExpiredClients() {
    try {
      console.log('Verificando clientes vencidos...');
      
      const supabase = await createApiSupabaseClient();
      const now = new Date();

      // Buscar clientes ativos com data de vencimento passada
      const { data: expiredClients, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'Ativo')
        .lt('expiration_date', now.toISOString());

      if (error) {
        console.error('Erro ao buscar clientes vencidos:', error);
        return;
      }

      if (!expiredClients || expiredClients.length === 0) {
        console.log('Nenhum cliente vencido encontrado');
        return;
      }

      console.log(`Encontrados ${expiredClients.length} clientes vencidos`);

      // Atualizar status dos clientes vencidos para 'Inativo'
      const { error: updateError } = await supabase
        .from('clients')
        .update({ status: 'Inativo' })
        .in('id', expiredClients.map(c => c.id));

      if (updateError) {
        console.error('Erro ao atualizar status dos clientes vencidos:', updateError);
        return;
      }

      // Enviar notificação de vencimento para cada cliente
      for (const clientData of expiredClients) {
        const client = mapDatabaseClientToClient(clientData);
        
        if (client.email || client.whatsapp) {
          try {
            await MessageQueueService.addMessage({
              type: 'general',
              clientId: client.id,
              clientName: client.name,
              email: client.email,
              whatsapp: client.whatsapp,
              subject: 'Assinatura Vencida',
              message: `Olá ${client.name}! Sua assinatura venceu em ${new Date(client.expirationDate).toLocaleDateString('pt-BR')}. Entre em contato para renovar.`,
              priority: 'high'
            });
          } catch (messageError) {
            console.error(`Erro ao enviar notificação de vencimento para ${client.name}:`, messageError);
          }
        }
      }

      LoggerService.log('system', 'Clientes vencidos processados', {
        expiredCount: expiredClients.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Erro na verificação de clientes vencidos:', error);
      LoggerService.log('error', 'Erro na verificação de clientes vencidos', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Executa verificação manual de lembretes e clientes vencidos
   */
  static async runManualCheck() {
    console.log('Executando verificação manual...');
    await this.checkExpiringClients();
    await this.checkExpiredClients();
    console.log('Verificação manual concluída');
  }

  /**
   * Retorna o status do serviço
   */
  static getStatus() {
    return {
      isRunning: this.isRunning,
      hasInterval: this.intervalId !== null
    };
  }
}

// Iniciar o serviço automaticamente quando o módulo for carregado
if (typeof window === 'undefined') {
  // Apenas no servidor
  ReminderService.startReminderService();
}