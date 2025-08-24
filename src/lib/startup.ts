// @/lib/startup.ts

import { MessageQueueService } from '@/services/message-queue.service';
import { ReminderService } from '@/services/reminder.service';
import { LoggerService } from '@/services/logger.service';

/**
 * Inicializa os serviços essenciais da aplicação
 */
export async function initializeServices() {
  try {
    // Inicializar o serviço de fila de mensagens
    const messageQueueService = MessageQueueService.getInstance();
    messageQueueService.startProcessing();
    LoggerService.info('MessageQueueService iniciado com sucesso');

    // Inicializar o serviço de lembretes
    ReminderService.startReminderService();
    LoggerService.info('ReminderService iniciado com sucesso');

    LoggerService.info('Todos os serviços foram inicializados com sucesso');
  } catch (error) {
    LoggerService.error('Erro ao inicializar serviços', 'Startup', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * Para todos os serviços da aplicação
 */
export async function shutdownServices() {
  try {
    // Parar o serviço de fila de mensagens
    const messageQueueService = MessageQueueService.getInstance();
    messageQueueService.stopProcessing();
    LoggerService.info('MessageQueueService parado');

    // Parar o serviço de lembretes
    ReminderService.stopReminderService();
    LoggerService.info('ReminderService parado');

    LoggerService.info('Todos os serviços foram parados com sucesso');
  } catch (error) {
    LoggerService.error('Erro ao parar serviços', 'Startup', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}