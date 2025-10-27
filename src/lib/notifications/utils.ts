/**
 * Utilitários do Sistema de Notificações
 * 
 * Este arquivo contém funções auxiliares e utilitários para o sistema de notificações.
 */

import { 
  NotificationType, 
  NotificationChannel, 
  NotificationPriority, 
  NotificationStatus,
  DeliveryStatus,
  NotificationRecipient,
  EmailRecipient,
  ValidationResult,
  NotificationFilters,
  StatsFilters
} from '@/types/notifications';

// ============================================================================
// VALIDAÇÃO DE DADOS
// ============================================================================

/**
 * Valida um endereço de email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida um número de telefone (formato internacional)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s-()]/g, ''));
}

/**
 * Valida uma URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Valida um destinatário baseado no canal
 */
export function validateRecipient(
  recipient: NotificationRecipient, 
  channel: NotificationChannel
): ValidationResult {
  const errors: string[] = [];

  switch (channel) {
    case 'email':
      const emailRecipient = recipient as EmailRecipient;
      if (!emailRecipient.email) {
        errors.push('Email é obrigatório para canal de email');
      } else if (!validateEmail(emailRecipient.email)) {
        errors.push('Email inválido');
      }
      break;

    case 'webhook':
      const webhookRecipient = recipient as any;
      if (!webhookRecipient.webhook_url) {
        errors.push('URL do webhook é obrigatória');
      } else if (!validateUrl(webhookRecipient.webhook_url)) {
        errors.push('URL do webhook inválida');
      }
      break;

    case 'in_app':
      const inAppRecipient = recipient as any;
      if (!inAppRecipient.user_id) {
        errors.push('ID do usuário é obrigatório para notificações in-app');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Valida múltiplos destinatários
 */
export function validateRecipients(
  recipients: NotificationRecipient[], 
  channel: NotificationChannel
): ValidationResult {
  const errors: string[] = [];

  if (!recipients || recipients.length === 0) {
    errors.push('Pelo menos um destinatário é obrigatório');
    return { valid: false, errors };
  }

  recipients.forEach((recipient, index) => {
    const result = validateRecipient(recipient, channel);
    if (!result.valid) {
      errors.push(`Destinatário ${index + 1}: ${result.errors.join(', ')}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// FORMATAÇÃO DE DADOS
// ============================================================================

/**
 * Formata um número de telefone para o padrão internacional
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+55'): string {
  const cleaned = phone.replace(/[^\d]/g, '');
  
  if (cleaned.startsWith('55')) {
    return `+${cleaned}`;
  }
  
  if (cleaned.startsWith('0')) {
    return `${countryCode}${cleaned.substring(1)}`;
  }
  
  return `${countryCode}${cleaned}`;
}

/**
 * Formata um email removendo espaços e convertendo para minúsculas
 */
export function formatEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Formata uma URL garantindo que tenha protocolo
 */
export function formatUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// ============================================================================
// SANITIZAÇÃO DE CONTEÚDO
// ============================================================================

/**
 * Remove tags HTML de uma string
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Sanitiza conteúdo removendo scripts e tags perigosas
 */
export function sanitizeContent(content: string): string {
  // Remove scripts
  content = content.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove event handlers
  content = content.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');
  
  // Remove javascript: links
  content = content.replace(/javascript:/gi, '');
  
  return content;
}

/**
 * Trunca texto mantendo palavras completas
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

// ============================================================================
// UTILITÁRIOS DE TEMPLATE
// ============================================================================

/**
 * Extrai variáveis de um template (formato {{variavel}})
 */
export function extractTemplateVariables(template: string): string[] {
  const regex = /\{\{\s*([^}]+)\s*\}\}/g;
  const variables: string[] = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    const variable = match[1].trim();
    if (!variables.includes(variable)) {
      variables.push(variable);
    }
  }
  
  return variables;
}

/**
 * Renderiza um template substituindo variáveis
 */
export function renderTemplate(
  template: string, 
  variables: Record<string, any>
): string {
  return template.replace(/\{\{\s*([^}]+)\s*\}\}/g, (match, variable) => {
    const key = variable.trim();
    const value = variables[key];
    
    if (value === undefined || value === null) {
      return match; // Mantém a variável se não encontrada
    }
    
    return String(value);
  });
}

/**
 * Valida se todas as variáveis necessárias estão presentes
 */
export function validateTemplateVariables(
  template: string, 
  variables: Record<string, any>
): ValidationResult {
  const requiredVariables = extractTemplateVariables(template);
  const missingVariables = requiredVariables.filter(
    variable => variables[variable] === undefined || variables[variable] === null
  );
  
  return {
    valid: missingVariables.length === 0,
    errors: missingVariables.map(variable => `Variável '${variable}' é obrigatória`)
  };
}

// ============================================================================
// UTILITÁRIOS DE PRIORIDADE
// ============================================================================

/**
 * Converte prioridade para valor numérico para ordenação
 */
export function priorityToNumber(priority: NotificationPriority): number {
  const priorities = {
    low: 1,
    medium: 2,
    normal: 2,
    high: 3,
    urgent: 4
  };
  return priorities[priority] || 1;
}

/**
 * Determina a cor da prioridade para UI
 */
export function getPriorityColor(priority: NotificationPriority): string {
  const colors = {
    low: 'text-gray-500',
    medium: 'text-blue-500',
    normal: 'text-green-500',
    high: 'text-orange-500',
    urgent: 'text-red-500'
  };
  return colors[priority] || 'text-gray-500';
}

/**
 * Determina o ícone da prioridade
 */
export function getPriorityIcon(priority: NotificationPriority): string {
  const icons = {
    low: '🔵',
    medium: '🟡',
    normal: '⚪',
    high: '🟠',
    urgent: '🔴'
  };
  return icons[priority] || '🔵';
}

// ============================================================================
// UTILITÁRIOS DE STATUS
// ============================================================================

/**
 * Determina a cor do status para UI
 */
export function getStatusColor(status: NotificationStatus | DeliveryStatus): string {
  const colors = {
    pending: 'text-yellow-500',
    processing: 'text-blue-500',
    sent: 'text-blue-600',
    delivered: 'text-green-500',
    failed: 'text-red-500',
    cancelled: 'text-gray-500',
    bounced: 'text-orange-500',
    rejected: 'text-red-600',
    expired: 'text-gray-400'
  } as const;
  return colors[status] || 'text-gray-500';
}

/**
 * Determina o ícone do status
 */
export function getStatusIcon(status: NotificationStatus | DeliveryStatus): string {
  const icons = {
    pending: '⏳',
    processing: '⚙️',
    sent: '📤',
    delivered: '✅',
    failed: '❌',
    cancelled: '🚫',
    bounced: '↩️',
    rejected: '🚫',
    expired: '⌛'
  } as const;
  return icons[status] || '❓';
}

/**
 * Verifica se um status é final (não mudará mais)
 */
export function isFinalStatus(status: NotificationStatus | DeliveryStatus): boolean {
  return ['delivered', 'failed', 'cancelled', 'bounced', 'rejected', 'expired'].includes(status);
}

// ============================================================================
// UTILITÁRIOS DE CANAL
// ============================================================================

/**
 * Determina o ícone do canal
 */
export function getChannelIcon(channel: NotificationChannel): string {
  const icons = {
    email: '📧',
    sms: '📱',
    push: '🔔',
    webhook: '🔗',
    slack: '💬',
  
    teams: '👥',
    discord: '🎮',
    telegram: '✈️',
    in_app: '📱'
  };
  return icons[channel] || '📢';
}

/**
 * Determina a cor do canal
 */
export function getChannelColor(channel: NotificationChannel): string {
  const colors = {
    email: 'text-blue-500',
    sms: 'text-green-500',
    push: 'text-purple-500',
    webhook: 'text-gray-500',
    slack: 'text-green-600',
  
    teams: 'text-blue-600',
    discord: 'text-indigo-500',
    telegram: 'text-blue-400',
    in_app: 'text-gray-600'
  };
  return colors[channel] || 'text-gray-500';
}

/**
 * Obtém o nome amigável do canal
 */
export function getChannelDisplayName(channel: NotificationChannel): string {
  const names = {
    email: 'Email',
    sms: 'SMS',
    push: 'Push',
    webhook: 'Webhook',
    slack: 'Slack',
  
    teams: 'Microsoft Teams',
    discord: 'Discord',
    telegram: 'Telegram',
    in_app: 'In-App'
  };
  return names[channel] || channel;
}

// ============================================================================
// UTILITÁRIOS DE TIPO
// ============================================================================

/**
 * Obtém o nome amigável do tipo de notificação
 */
export function getTypeDisplayName(type: NotificationType): string {
  const names = {
    security: 'Segurança',
    security_alert: 'Alerta de Segurança',
    performance: 'Performance',
    performance_alert: 'Alerta de Performance',
    system: 'Sistema',
    backup: 'Backup',
    backup_status: 'Status do Backup',
    financial: 'Financeiro',
    marketing: 'Marketing',
    user: 'Usuário',
    integration: 'Integração',
    maintenance: 'Manutenção',
    compliance_alert: 'Alerta de Conformidade',
    error_report: 'Relatório de Erro',
    custom: 'Personalizado'
  };
  return names[type] || type;
}

/**
 * Determina a cor do tipo
 */
export function getTypeColor(type: NotificationType): string {
  const colors = {
    security: 'text-red-500',
    security_alert: 'text-red-600',
    performance: 'text-orange-500',
    performance_alert: 'text-orange-600',
    system: 'text-blue-500',
    backup: 'text-green-500',
    backup_status: 'text-green-600',
    financial: 'text-yellow-500',
    marketing: 'text-purple-500',
    user: 'text-indigo-500',
    integration: 'text-gray-500',
    maintenance: 'text-orange-600',
    compliance_alert: 'text-red-700',
    error_report: 'text-red-800',
    custom: 'text-indigo-600'
  };
  return colors[type] || 'text-gray-500';
}

// ============================================================================
// UTILITÁRIOS DE DATA
// ============================================================================

/**
 * Formata uma data para exibição
 */
export function formatDate(date: Date | string, locale: string = 'pt-BR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calcula tempo relativo (ex: "há 2 horas")
 */
export function getRelativeTime(date: Date | string, locale: string = 'pt-BR'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'agora';
  } else if (diffMinutes < 60) {
    return `há ${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
  } else if (diffHours < 24) {
    return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
  } else if (diffDays < 7) {
    return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`;
  } else {
    return formatDate(d, locale);
  }
}

/**
 * Converte período para range de datas
 */
export function periodToDateRange(period: string, timezone?: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  
  switch (period) {
    case '1h':
      start = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '90d':
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
  
  return { start, end };
}

// ============================================================================
// UTILITÁRIOS DE FILTROS
// ============================================================================

/**
 * Limpa filtros vazios
 */
export function cleanFilters(filters: NotificationFilters): NotificationFilters {
  const cleaned: NotificationFilters = {};
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '' && 
        (!Array.isArray(value) || value.length > 0)) {
      (cleaned as any)[key] = value;
    }
  });
  
  return cleaned;
}

/**
 * Converte filtros para query string
 */
export function filtersToQueryString(filters: NotificationFilters): string {
  const cleaned = cleanFilters(filters);
  const params = new URLSearchParams();
  
  Object.entries(cleaned).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, v));
    } else if (value instanceof Date) {
      params.set(key, value.toISOString());
    } else {
      params.set(key, String(value));
    }
  });
  
  return params.toString();
}

// ============================================================================
// UTILITÁRIOS DE PERFORMANCE
// ============================================================================

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Mede tempo de execução
 */
export function measureTime<T>(fn: () => T): { result: T; timeMs: number } {
  const start = performance.now();
  const result = fn();
  const timeMs = performance.now() - start;
  
  return { result, timeMs };
}

/**
 * Mede tempo de execução assíncrona
 */
export async function measureTimeAsync<T>(fn: () => Promise<T>): Promise<{ result: T; timeMs: number }> {
  const start = performance.now();
  const result = await fn();
  const timeMs = performance.now() - start;
  
  return { result, timeMs };
}

// ============================================================================
// UTILITÁRIOS DE ERRO
// ============================================================================

/**
 * Extrai mensagem de erro de diferentes tipos
 */
export function extractErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (error?.error) {
    return extractErrorMessage(error.error);
  }
  
  return 'Erro desconhecido';
}

/**
 * Cria um erro padronizado
 */
export function createError(message: string, code?: string, details?: any): Error {
  const error = new Error(message);
  (error as any).code = code;
  (error as any).details = details;
  return error;
}

// ============================================================================
// UTILITÁRIOS DE RETRY
// ============================================================================

/**
 * Calcula delay para retry com backoff exponencial
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number = 1000,
  multiplier: number = 2,
  maxDelay: number = 30000,
  jitter: boolean = true
): number {
  let delay = baseDelay * Math.pow(multiplier, attempt - 1);
  delay = Math.min(delay, maxDelay);
  
  if (jitter) {
    // Adiciona jitter de ±25%
    const jitterAmount = delay * 0.25;
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.max(delay, 0);
}

/**
 * Executa função com retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  multiplier: number = 2
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt <= maxRetries) {
        const delay = calculateRetryDelay(attempt, baseDelay, multiplier);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// ============================================================================
// UTILITÁRIOS DE CACHE
// ============================================================================

/**
 * Cache simples em memória
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  
  set(key: string, value: T, ttlMs: number = 300000): void {
    const expires = Date.now() + ttlMs;
    this.cache.set(key, { value, expires });
  }
  
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export const NotificationUtils = {
  // Validação
  validateEmail,
  validatePhone,
  validateUrl,
  validateRecipient,
  validateRecipients,
  
  // Formatação
  formatPhoneNumber,
  formatEmail,
  formatUrl,
  
  // Sanitização
  stripHtml,
  sanitizeContent,
  truncateText,
  
  // Templates
  extractTemplateVariables,
  renderTemplate,
  validateTemplateVariables,
  
  // UI Helpers
  priorityToNumber,
  getPriorityColor,
  getPriorityIcon,
  getStatusColor,
  getStatusIcon,
  isFinalStatus,
  getChannelIcon,
  getChannelColor,
  getChannelDisplayName,
  getTypeDisplayName,
  getTypeColor,
  
  // Data
  formatDate,
  getRelativeTime,
  periodToDateRange,
  
  // Filtros
  cleanFilters,
  filtersToQueryString,
  
  // Performance
  debounce,
  throttle,
  measureTime,
  measureTimeAsync,
  
  // Erro
  extractErrorMessage,
  createError,
  
  // Retry
  calculateRetryDelay,
  withRetry,
  
  // Cache
  SimpleCache
};

export default NotificationUtils;
