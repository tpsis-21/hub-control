/**
 * Exemplos Práticos de Uso do Sistema de Notificações
 * 
 * Este arquivo contém exemplos reais de como usar o sistema de notificações
 * em diferentes cenários do Hub Control.
 */

import { notificationSystem } from '../../notification-system';
import type { 
  NotificationType,
  NotificationChannel,
  NotificationPriority
} from '../../../types/notifications';

// Instância do serviço
const notificationService = notificationSystem;

// ============================================================================
// EXEMPLOS BÁSICOS
// ============================================================================

/**
 * Exemplo 1: Notificação simples de boas-vindas
 */
export async function sendWelcomeNotification(userEmail: string, userName: string) {
  const request = {
    type: 'user' as NotificationType,
    channel: 'email' as NotificationChannel,
    subject: 'Bem-vindo ao Hub Control',
    content: `Olá ${userName}, bem-vindo ao Hub Control!`,
    recipients: [userEmail],
    metadata: {
      user_name: userName,
      company_name: 'Hub Control',
      login_url: 'https://app.hubcontrol.com/login'
    },
    priority: 'medium' as NotificationPriority
  };

  return await notificationService.sendNotification(
    request.type,
    request.subject,
    request.content,
    request.recipients,
    {
      channels: [request.channel],
      data: request.metadata
    }
  );
}

/**
 * Exemplo 2: Alerta de segurança multi-canal
 */
export async function sendSecurityAlert(
  adminEmail: string, 
  alertDetails: {
    ip: string;
    location: string;
    userAgent: string;
    timestamp: string;
  }
) {
  const request = {
    type: 'security' as NotificationType,
    channel: 'email' as NotificationChannel,
    subject: '🚨 Tentativa de Login Suspeita',
    content: `Detectada tentativa de login suspeita de IP ${alertDetails.ip}`,
    recipients: [adminEmail],
    priority: 'high' as NotificationPriority,
    metadata: {
      alert_type: 'suspicious_login',
      ip_address: alertDetails.ip,
      location: alertDetails.location,
      user_agent: alertDetails.userAgent,
      timestamp: alertDetails.timestamp
    }
  };

  return await notificationService.sendNotification(
      request.type,
      request.subject,
      request.content,
      request.recipients,
      {
        channels: [request.channel],
        data: request.metadata
      }
    );
}

/**
 * Exemplo 3: Notificação de backup com webhook
 */
export async function sendBackupNotification(
  webhookUrl: string,
  backupDetails: {
    status: 'success' | 'failed';
    fileCount: number;
    size: string;
    duration: string;
    errors?: string[];
  }
) {
  const isSuccess = backupDetails.status === 'success';
  
  const request = {
    type: 'backup' as NotificationType,
    channel: 'webhook' as NotificationChannel,
    subject: isSuccess ? 'Backup Concluído com Sucesso' : 'Falha no Backup',
    content: isSuccess ? 'O backup foi concluído com sucesso.' : 'Ocorreu uma falha durante o backup.',
    recipients: [webhookUrl],
    variables: {
      status: backupDetails.status,
      file_count: backupDetails.fileCount.toString(),
      backup_size: backupDetails.size,
      duration: backupDetails.duration,
      error_details: backupDetails.errors?.join(', ') || 'Nenhum erro'
    },
    priority: (isSuccess ? 'low' : 'high') as NotificationPriority,
    metadata: {
      backup_type: 'automated',
      file_count: backupDetails.fileCount,
      size_bytes: backupDetails.size,
      duration_ms: backupDetails.duration
    }
  };

  return await notificationService.sendNotification(
    request.type,
    request.subject,
    request.content,
    request.recipients,
    {
      channels: [request.channel],
      data: request.metadata
    }
  );
}

// ============================================================================
// EXEMPLOS AVANÇADOS
// ============================================================================

/**
 * Exemplo 4: Sistema de notificações em lote
 */
export async function sendBulkUserNotifications(
  users: Array<{ email: string; name: string; preferences: string[] }>,
  announcement: {
    subject: string;
    content: string;
    type: 'maintenance' | 'feature' | 'security';
  }
) {
  const notifications = users.map(user => ({
    type: 'system' as NotificationType,
    channel: 'email' as NotificationChannel,
    subject: announcement.subject,
    content: announcement.content,
    recipients: [user.email],
    variables: {
      user_name: user.name,
      announcement_type: announcement.type
    },
    priority: (announcement.type === 'security' ? 'high' : 'medium') as NotificationPriority,
    metadata: {
      user_preferences: user.preferences,
      announcement_id: `ann_${Date.now()}`
    }
  }));

  // Enviar em lotes para evitar sobrecarga
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < notifications.length; i += batchSize) {
    const batch = notifications.slice(i, i + batchSize);
    const batchPromises = batch.map(notification => 
      notificationService.sendNotification(
        notification.type,
        notification.subject,
        notification.content,
        notification.recipients,
        {
          channels: [notification.channel],
          data: notification.metadata
        }
      )
    );
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
    
    // Pequena pausa entre lotes
    if (i + batchSize < notifications.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * Exemplo 5: Notificação condicional baseada em preferências
 */
export async function sendConditionalNotification(
  userId: string,
  notificationData: {
    type: string;
    subject: string;
    content: string;
    urgency: 'low' | 'medium' | 'high';
  }
) {
  // Buscar preferências do usuário (simulado)
  const userPreferences = await getUserNotificationPreferences(userId);
  
  // Verificar se o canal de email está habilitado
  if (!userPreferences.channels.email) {
    console.log(`Usuário ${userId} tem notificações por email desabilitadas`);
    return { skipped: true, reason: 'email_disabled' };
  }

  // Determinar canais baseado nas preferências
  const recipients = [];
  
  if (userPreferences.channels.email) {
    recipients.push(userPreferences.email);
  }

  if (recipients.length === 0) {
    return { skipped: true, reason: 'no_channels' };
  }

  const request = {
    type: notificationData.type as NotificationType,
    channel: 'email' as NotificationChannel,
    subject: notificationData.subject,
    content: notificationData.content,
    recipients,
    priority: notificationData.urgency as NotificationPriority,
    metadata: {
      user_id: userId,
      conditional_send: true
    }
  };

  return await notificationService.sendNotification(
    request.type,
    request.subject,
    request.content,
    recipients,
    {
      channels: [request.channel],
      data: request.metadata
    }
  );
}

/**
 * Exemplo 6: Notificação com retry personalizado
 */
export async function sendCriticalNotification(
  recipients: Array<{ email: string }>,
  message: {
    subject: string;
    content: string;
    actionUrl?: string;
  }
) {
  const request = {
    type: 'system' as NotificationType,
    channel: 'email' as NotificationChannel,
    subject: message.subject,
    content: message.content,
    recipients: recipients.map(r => r.email),
    priority: 'high' as NotificationPriority,
    metadata: {
      critical: true,
      action_url: message.actionUrl,
      max_retries: 5,
      retry_delay: 2000
    }
  };

  try {
    return await notificationService.sendNotification(
      request.type,
      request.subject,
      request.content,
      request.recipients,
      {
        channels: [request.channel],
        data: request.metadata
      }
    );
  } catch (error) {
    console.error('Falha ao enviar notificação crítica:', error);
    
    // Tentar canal de fallback
    const fallbackRequest = {
      type: 'system' as NotificationType,
      channel: 'webhook' as NotificationChannel,
      subject: `[FALLBACK] ${message.subject}`,
      content: `Falha no envio original. ${message.content}`,
      recipients: [process.env.EMERGENCY_WEBHOOK_URL || ''],
      priority: 'high' as NotificationPriority
    };
    
    return await notificationService.sendNotification(
      fallbackRequest.type,
      fallbackRequest.subject,
      fallbackRequest.content,
      fallbackRequest.recipients,
      {
        channels: [fallbackRequest.channel],
        data: {}
      }
    );
  }
}

// ============================================================================
// EXEMPLOS DE INTEGRAÇÃO COM REACT
// ============================================================================

/**
 * Exemplo 7: Hook personalizado para notificações de toast
 */
export function useToastNotifications() {
  const showToast = async (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const request = {
      type: 'system' as NotificationType,
      channel: 'in_app' as NotificationChannel,
      subject: type.charAt(0).toUpperCase() + type.slice(1),
      content: message,
      recipients: ['current_user'], // Seria obtido do contexto de autenticação
      priority: 'low' as NotificationPriority,
      metadata: {
        toast_type: type,
        auto_dismiss: true,
        duration: 5000
      }
    };

    return await notificationService.sendNotification(
      request.type,
      request.subject,
      request.content,
      request.recipients,
      {
        channels: [request.channel],
        data: request.metadata
      }
    );
  };

  return { showToast };
}

/**
 * Exemplo 8: Notificação de progresso de operação
 */
export async function sendProgressNotification(
  operationId: string,
  progress: {
    current: number;
    total: number;
    status: string;
    eta?: string;
  }
) {
  const percentage = Math.round((progress.current / progress.total) * 100);
  
  const request = {
    type: 'system' as NotificationType,
    channel: 'in_app' as NotificationChannel,
    subject: `Operação em andamento (${percentage}%)`,
    content: progress.status,
    recipients: ['current_user'],
    priority: 'low' as NotificationPriority,
    metadata: {
      operation_id: operationId,
      progress_current: progress.current,
      progress_total: progress.total,
      progress_percentage: percentage,
      eta: progress.eta,
      update_existing: true // Flag para atualizar notificação existente
    }
  };

  return await notificationService.sendNotification(
    request.type,
    request.subject,
    request.content,
    request.recipients,
    {
      channels: [request.channel],
      priority: request.priority,
      data: request.metadata
    }
  );
}

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

/**
 * Simula busca de preferências do usuário
 */
async function getUserNotificationPreferences(userId: string) {
  // Simulação - em produção viria do banco de dados
  return {
    channels: {
      email: true,
      webhook: false,
      in_app: true
    },
    email: `user-${userId}@company.com`,
    timezone: 'America/Sao_Paulo'
  };
}

/**
 * Exemplo de uso em um componente React
 */
export const NotificationExamples = {
  // Notificação de login
  onUserLogin: (userEmail: string, userName: string) => 
    sendWelcomeNotification(userEmail, userName),
  
  // Alerta de segurança
  onSecurityThreat: (details: any) => 
    sendSecurityAlert(
      'admin@company.com',
      details
    ),
  
  // Backup concluído
  onBackupComplete: (details: any) => 
    sendBackupNotification(
      'https://webhook.company.com/backup',
      details
    ),
  
  // Notificação crítica
  onCriticalError: (error: any) => 
    sendCriticalNotification(
      [{ email: 'admin@company.com' }],
      {
        subject: 'Erro Crítico no Sistema',
        content: `Erro detectado: ${error.message}`,
        actionUrl: '/admin/errors'
      }
    )
};

// Exportar exemplos para uso em testes
export default {
  sendWelcomeNotification,
  sendSecurityAlert,
  sendBackupNotification,
  sendBulkUserNotifications,
  sendConditionalNotification,
  sendCriticalNotification,
  useToastNotifications,
  sendProgressNotification,
  NotificationExamples
};