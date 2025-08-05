// src/services/message-queue.service.ts
import MessageService, { EmailMessage, WhatsAppMessage, MessageResult } from './message.service';
import { LoggerService } from './logger.service';
import { CacheService } from './cache.service';

export interface QueuedMessage {
  id: string;
  type: 'email' | 'whatsapp' | 'welcome' | 'reminder';
  priority: 'low' | 'normal' | 'high';
  scheduledFor?: Date;
  attempts: number;
  maxAttempts: number;
  data: any;
  createdAt: Date;
  lastAttempt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
}

/**
 * Serviço de fila de mensagens para processamento em background
 * Implementa retry automático, priorização e agendamento
 */
export class MessageQueueService {
  private static instance: MessageQueueService;
  private queue: QueuedMessage[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private readonly PROCESS_INTERVAL = 5000; // 5 segundos
  private readonly MAX_CONCURRENT = 3; // Máximo de mensagens processadas simultaneamente
  private readonly RETRY_DELAYS = [30000, 60000, 300000]; // 30s, 1min, 5min

  private constructor() {
    this.startProcessing();
  }

  static getInstance(): MessageQueueService {
    if (!MessageQueueService.instance) {
      MessageQueueService.instance = new MessageQueueService();
    }
    return MessageQueueService.instance;
  }

  /**
   * Adiciona uma mensagem à fila
   */
  async addMessage(
    type: QueuedMessage['type'],
    data: any,
    options: {
      priority?: QueuedMessage['priority'];
      scheduledFor?: Date;
      maxAttempts?: number;
    } = {}
  ): Promise<string> {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedMessage: QueuedMessage = {
      id: messageId,
      type,
      priority: options.priority || 'normal',
      scheduledFor: options.scheduledFor,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      data,
      createdAt: new Date(),
      status: 'pending'
    };

    this.queue.push(queuedMessage);
    this.sortQueue();

    LoggerService.info('Mensagem adicionada à fila', 'MessageQueue', {
      messageId,
      type,
      priority: queuedMessage.priority,
      scheduledFor: queuedMessage.scheduledFor
    });

    // Cache das estatísticas
    CacheService.delete('message_queue_stats');

    return messageId;
  }

  /**
   * Adiciona mensagem de e-mail à fila
   */
  async queueEmail(
    emailData: EmailMessage,
    options: {
      priority?: QueuedMessage['priority'];
      scheduledFor?: Date;
    } = {}
  ): Promise<string> {
    return this.addMessage('email', emailData, options);
  }

  /**
   * Adiciona mensagem de WhatsApp à fila
   */
  async queueWhatsApp(
    whatsappData: WhatsAppMessage,
    options: {
      priority?: QueuedMessage['priority'];
      scheduledFor?: Date;
    } = {}
  ): Promise<string> {
    return this.addMessage('whatsapp', whatsappData, options);
  }

  /**
   * Adiciona mensagem de boas-vindas à fila
   */
  async queueWelcomeMessage(
    customerData: any,
    options: {
      priority?: QueuedMessage['priority'];
      scheduledFor?: Date;
    } = {}
  ): Promise<string> {
    return this.addMessage('welcome', customerData, {
      ...options,
      priority: options.priority || 'high' // Boas-vindas têm prioridade alta
    });
  }

  /**
   * Adiciona lembrete de vencimento à fila
   */
  async queueExpirationReminder(
    customerData: any,
    options: {
      priority?: QueuedMessage['priority'];
      scheduledFor?: Date;
    } = {}
  ): Promise<string> {
    return this.addMessage('reminder', customerData, options);
  }

  /**
   * Agenda múltiplos lembretes de vencimento
   */
  async scheduleExpirationReminders(
    customerData: any,
    reminderDays: number[] = [7, 3, 1] // 7, 3 e 1 dia antes do vencimento
  ): Promise<string[]> {
    const messageIds: string[] = [];
    const expirationDate = new Date(customerData.expirationDate);

    for (const days of reminderDays) {
      const reminderDate = new Date(expirationDate);
      reminderDate.setDate(reminderDate.getDate() - days);

      // Só agenda se a data for futura
      if (reminderDate > new Date()) {
        const messageId = await this.queueExpirationReminder(
          {
            ...customerData,
            daysUntilExpiration: days
          },
          {
            scheduledFor: reminderDate,
            priority: days === 1 ? 'high' : 'normal'
          }
        );
        messageIds.push(messageId);
      }
    }

    return messageIds;
  }

  /**
   * Ordena a fila por prioridade e data de agendamento
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Primeiro por status (pending primeiro)
      if (a.status !== b.status) {
        const statusOrder = { pending: 0, processing: 1, completed: 2, failed: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      }

      // Depois por prioridade
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }

      // Por último por data de criação
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  /**
   * Inicia o processamento da fila
   */
  private startProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, this.PROCESS_INTERVAL);

    LoggerService.info('Processamento da fila de mensagens iniciado', 'MessageQueue');
  }

  /**
   * Para o processamento da fila
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    LoggerService.info('Processamento da fila de mensagens parado', 'MessageQueue');
  }

  /**
   * Processa mensagens na fila
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;

    this.processing = true;

    try {
      const now = new Date();
      const processingCount = this.queue.filter(msg => msg.status === 'processing').length;
      
      if (processingCount >= this.MAX_CONCURRENT) {
        return;
      }

      // Busca mensagens prontas para processamento
      const readyMessages = this.queue
        .filter(msg => 
          msg.status === 'pending' &&
          (!msg.scheduledFor || msg.scheduledFor <= now)
        )
        .slice(0, this.MAX_CONCURRENT - processingCount);

      if (readyMessages.length === 0) {
        return;
      }

      // Processa mensagens em paralelo
      await Promise.all(
        readyMessages.map(message => this.processMessage(message))
      );

    } finally {
      this.processing = false;
    }
  }

  /**
   * Processa uma mensagem individual
   */
  private async processMessage(message: QueuedMessage): Promise<void> {
    message.status = 'processing';
    message.attempts++;
    message.lastAttempt = new Date();

    try {
      let result: MessageResult | any;

      switch (message.type) {
        case 'email':
          result = await MessageService.sendEmail(message.data);
          break;
        
        case 'whatsapp':
          result = await MessageService.sendWhatsApp(message.data);
          break;
        
        case 'welcome':
          result = await MessageService.sendWelcomeMessage(message.data);
          break;
        
        case 'reminder':
          result = await MessageService.sendExpirationReminder(message.data);
          break;
        
        default:
          throw new Error(`Tipo de mensagem não suportado: ${message.type}`);
      }

      // Verifica se houve sucesso
      const success = message.type === 'email' || message.type === 'whatsapp' 
        ? result.success 
        : (result.email?.success || result.whatsapp?.success);

      if (success) {
        message.status = 'completed';
        message.error = undefined;
        
        LoggerService.info('Mensagem processada com sucesso', 'MessageQueue', {
          messageId: message.id,
          type: message.type,
          attempts: message.attempts
        });
      } else {
        throw new Error(result.error || 'Falha no envio da mensagem');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      message.error = errorMessage;

      if (message.attempts >= message.maxAttempts) {
        message.status = 'failed';
        
        LoggerService.error('Mensagem falhou após todas as tentativas', 'MessageQueue', {
          messageId: message.id,
          type: message.type,
          attempts: message.attempts,
          error: errorMessage
        });
      } else {
        message.status = 'pending';
        
        // Agenda retry com delay exponencial
        const retryDelay = this.RETRY_DELAYS[message.attempts - 1] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
        message.scheduledFor = new Date(Date.now() + retryDelay);
        
        LoggerService.warn('Mensagem será reprocessada', 'MessageQueue', {
          messageId: message.id,
          type: message.type,
          attempts: message.attempts,
          nextAttempt: message.scheduledFor,
          error: errorMessage
        });
      }
    }

    // Limpa cache das estatísticas
    CacheService.delete('message_queue_stats');
  }

  /**
   * Obtém estatísticas da fila
   */
  getStats(): QueueStats {
    const cached = CacheService.get('message_queue_stats');
    if (cached) {
      return cached;
    }

    const stats: QueueStats = {
      pending: this.queue.filter(msg => msg.status === 'pending').length,
      processing: this.queue.filter(msg => msg.status === 'processing').length,
      completed: this.queue.filter(msg => msg.status === 'completed').length,
      failed: this.queue.filter(msg => msg.status === 'failed').length,
      totalProcessed: this.queue.filter(msg => msg.status === 'completed' || msg.status === 'failed').length
    };

    CacheService.set('message_queue_stats', stats, 30000); // Cache por 30 segundos
    return stats;
  }

  /**
   * Obtém mensagens da fila com filtros
   */
  getMessages(filters: {
    status?: QueuedMessage['status'];
    type?: QueuedMessage['type'];
    limit?: number;
  } = {}): QueuedMessage[] {
    let filtered = [...this.queue];

    if (filters.status) {
      filtered = filtered.filter(msg => msg.status === filters.status);
    }

    if (filters.type) {
      filtered = filtered.filter(msg => msg.type === filters.type);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Remove mensagens antigas da fila
   */
  cleanup(olderThanDays: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const initialLength = this.queue.length;
    this.queue = this.queue.filter(msg => 
      msg.createdAt > cutoffDate || 
      msg.status === 'pending' || 
      msg.status === 'processing'
    );

    const removedCount = initialLength - this.queue.length;
    
    if (removedCount > 0) {
      LoggerService.info('Limpeza da fila de mensagens concluída', 'MessageQueue', {
        removedCount,
        remainingCount: this.queue.length
      });
      
      CacheService.delete('message_queue_stats');
    }

    return removedCount;
  }

  /**
   * Reprocessa mensagens falhadas
   */
  retryFailedMessages(): number {
    const failedMessages = this.queue.filter(msg => msg.status === 'failed');
    
    failedMessages.forEach(msg => {
      msg.status = 'pending';
      msg.attempts = 0;
      msg.error = undefined;
      msg.scheduledFor = undefined;
    });

    if (failedMessages.length > 0) {
      this.sortQueue();
      CacheService.delete('message_queue_stats');
      
      LoggerService.info('Mensagens falhadas reprocessadas', 'MessageQueue', {
        count: failedMessages.length
      });
    }

    return failedMessages.length;
  }
}

// Instância singleton
export const messageQueue = MessageQueueService.getInstance();

// Limpeza automática a cada hora
setInterval(() => {
  messageQueue.cleanup();
}, 60 * 60 * 1000);

export default MessageQueueService;