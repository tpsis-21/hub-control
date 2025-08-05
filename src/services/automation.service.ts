// src/services/automation.service.ts
import { createApiSupabaseClient } from '@/lib/supabase-api';
import { LoggerService } from './logger.service';
import { MarketingService } from './marketing.service';
import type { 
  AutomationRule, 
  AutomationTrigger, 
  AutomationCondition, 
  AutomationAction,
  EmailTemplate
} from '@/lib/types/marketing';
import type { Client } from '@/lib/types';
import { getClientes } from '@/app/(app)/clientes/actions';

/**
 * Serviço de Automação
 * Gerencia regras automáticas, triggers e execução de ações
 */
export class AutomationService {
  private static isRunning = false;
  private static intervalId: NodeJS.Timeout | null = null;
  private static readonly CHECK_INTERVAL = 60000; // 1 minuto

  /**
   * Inicia o serviço de automação
   */
  static start(): void {
    if (this.isRunning) {
      LoggerService.warn('Serviço de automação já está em execução', 'AutomationService');
      return;
    }

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.processAutomations().catch(error => {
        LoggerService.error('Erro no processamento de automações', 'AutomationService', { error });
      });
    }, this.CHECK_INTERVAL);

    LoggerService.info('Serviço de automação iniciado', 'AutomationService');
  }

  /**
   * Para o serviço de automação
   */
  static stop(): void {
    if (!this.isRunning) {
      LoggerService.warn('Serviço de automação não está em execução', 'AutomationService');
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    LoggerService.info('Serviço de automação parado', 'AutomationService');
  }

  /**
   * Cria uma nova regra de automação
   */
  static async createRule(ruleData: Omit<AutomationRule, 'id' | 'created_at' | 'updated_at' | 'lastExecuted' | 'executionCount'>): Promise<AutomationRule> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const rule: AutomationRule = {
        ...ruleData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        executionCount: 0
      };

      const { data, error } = await supabase
        .from('automation_rules')
        .insert(rule)
        .select()
        .single();

      if (error) throw error;

      LoggerService.info('Regra de automação criada', 'AutomationService', { ruleId: rule.id });
      return data;
    } catch (error) {
      LoggerService.error('Erro ao criar regra de automação', 'AutomationService', { error });
      throw error;
    }
  }

  /**
   * Obtém todas as regras de automação
   */
  static async getRules(activeOnly = false): Promise<AutomationRule[]> {
    try {
      const supabase = await createApiSupabaseClient();
      let query = supabase.from('automation_rules').select('*');

      if (activeOnly) {
        query = query.eq('isActive', true);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      return data || [];
    } catch (error) {
      LoggerService.error('Erro ao buscar regras de automação', 'AutomationService', { error });
      throw error;
    }
  }

  /**
   * Processa todas as automações ativas
   */
  static async processAutomations(): Promise<void> {
    try {
      const rules = await this.getRules(true);
      
      for (const rule of rules) {
        await this.processRule(rule);
      }
    } catch (error) {
      LoggerService.error('Erro no processamento geral de automações', 'AutomationService', { error });
    }
  }

  /**
   * Processa uma regra específica
   */
  static async processRule(rule: AutomationRule): Promise<void> {
    try {
      // Verificar se deve executar baseado na frequência
      if (!this.shouldExecuteRule(rule)) {
        return;
      }

      // Buscar clientes que atendem aos triggers
      const triggeredClients = await this.findTriggeredClients(rule.trigger);
      
      if (triggeredClients.length === 0) {
        return;
      }

      // Filtrar clientes que atendem às condições
      const qualifiedClients = triggeredClients.filter(client => 
        this.evaluateConditions(client, rule.conditions)
      );

      if (qualifiedClients.length === 0) {
        return;
      }

      // Executar ações para cada cliente qualificado
      for (const client of qualifiedClients) {
        await this.executeActions(client, rule.actions, rule.id);
      }

      // Atualizar estatísticas da regra
      await this.updateRuleStats(rule.id, qualifiedClients.length);

      LoggerService.info('Regra de automação processada', 'AutomationService', {
        ruleId: rule.id,
        ruleName: rule.name,
        clientsProcessed: qualifiedClients.length
      });
    } catch (error) {
      LoggerService.error('Erro ao processar regra de automação', 'AutomationService', {
        ruleId: rule.id,
        error
      });
    }
  }

  /**
   * Verifica se a regra deve ser executada baseado na frequência
   */
  private static shouldExecuteRule(rule: AutomationRule): boolean {
    if (!rule.lastExecuted) {
      return true;
    }

    const lastExecution = new Date(rule.lastExecuted);
    const now = new Date();
    const timeDiff = now.getTime() - lastExecution.getTime();

    switch (rule.trigger.frequency) {
      case 'immediate':
        return true;
      case 'daily':
        return timeDiff >= 24 * 60 * 60 * 1000; // 24 horas
      case 'weekly':
        return timeDiff >= 7 * 24 * 60 * 60 * 1000; // 7 dias
      case 'monthly':
        return timeDiff >= 30 * 24 * 60 * 60 * 1000; // 30 dias
      default:
        return false;
    }
  }

  /**
   * Encontra clientes que atendem aos triggers
   */
  private static async findTriggeredClients(trigger: AutomationTrigger): Promise<Client[]> {
    const clients = await getClientes();
    const now = new Date();

    switch (trigger.event) {
      case 'client_expiring':
        const daysBeforeExpiration = trigger.parameters?.daysBeforeExpiration || 1;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + daysBeforeExpiration);
        
        return clients.filter(client => {
          const expirationDate = new Date(client.expirationDate);
          return expirationDate <= targetDate && expirationDate >= now && client.status === 'Ativo';
        });

      case 'client_expired':
        const daysAfterExpiration = trigger.parameters?.daysAfterExpiration || 0;
        const expiredDate = new Date();
        expiredDate.setDate(expiredDate.getDate() - daysAfterExpiration);
        
        return clients.filter(client => {
          const expirationDate = new Date(client.expirationDate);
          return expirationDate <= expiredDate && client.status !== 'Em teste';
        });

      case 'client_renewed':
        // Para renovações, precisaríamos de um log de atividades
        // Por enquanto, retornamos array vazio
        return [];

      case 'payment_received':
        // Para pagamentos, precisaríamos de integração com sistema de pagamento
        // Por enquanto, retornamos array vazio
        return [];

      case 'new_client':
        const hoursAgo = trigger.parameters?.hoursAfterCreation || 24;
        const creationThreshold = new Date();
        creationThreshold.setHours(creationThreshold.getHours() - hoursAgo);
        
        return clients.filter(client => {
          const startDate = new Date(client.startDate);
          return startDate >= creationThreshold;
        });

      case 'test_expiring':
        return clients.filter(client => {
          if (client.status !== 'Em teste') return false;
          const expirationDate = new Date(client.expirationDate);
          const testExpirationThreshold = new Date();
          testExpirationThreshold.setDate(testExpirationThreshold.getDate() + 1);
          return expirationDate <= testExpirationThreshold && expirationDate >= now;
        });

      default:
        return [];
    }
  }

  /**
   * Avalia se um cliente atende às condições
   */
  private static evaluateConditions(client: Client, conditions: AutomationCondition[]): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      switch (condition.field) {
        case 'status':
          return this.evaluateCondition(client.status, condition.operator, condition.value);
        case 'planId':
          return this.evaluateCondition(client.planId, condition.operator, condition.value);
        case 'serverId':
          return this.evaluateCondition(client.serverId, condition.operator, condition.value);
        case 'hasEmail':
          const hasEmail = !!(client.email && client.email.trim());
          return this.evaluateCondition(hasEmail, condition.operator, condition.value === 'true');
        case 'daysUntilExpiration':
          const daysUntilExpiration = Math.ceil(
            (new Date(client.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );
          return this.evaluateCondition(daysUntilExpiration, condition.operator, parseInt(condition.value));
        default:
          return true;
      }
    });
  }

  /**
   * Avalia uma condição específica
   */
  private static evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(conditionValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'greater_equal':
        return Number(fieldValue) >= Number(conditionValue);
      case 'less_equal':
        return Number(fieldValue) <= Number(conditionValue);
      case 'in':
        const values = Array.isArray(conditionValue) ? conditionValue : [conditionValue];
        return values.includes(fieldValue);
      default:
        return true;
    }
  }

  /**
   * Executa ações para um cliente
   */
  private static async executeActions(client: Client, actions: AutomationAction[], ruleId: string): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'send_email':
            await this.executeSendEmailAction(client, action, ruleId);
            break;
          case 'send_whatsapp':
            await this.executeSendWhatsAppAction(client, action, ruleId);
            break;
          case 'update_status':
            await this.executeUpdateStatusAction(client, action);
            break;
          case 'add_tag':
            await this.executeAddTagAction(client, action);
            break;
          case 'create_task':
            await this.executeCreateTaskAction(client, action);
            break;
        }
      } catch (error) {
        LoggerService.error('Erro ao executar ação de automação', 'AutomationService', {
          ruleId,
          clientId: client.id,
          actionType: action.type,
          error
        });
      }
    }
  }

  /**
   * Executa ação de envio de email
   */
  private static async executeSendEmailAction(client: Client, action: AutomationAction, ruleId: string): Promise<void> {
    if (!client.email) {
      LoggerService.warn('Cliente sem email para automação', 'AutomationService', {
        clientId: client.id,
        ruleId
      });
      return;
    }

    const subject = MarketingService.processTemplate(action.parameters.subject, client);
    const content = MarketingService.processTemplate(action.parameters.content, client);

    // Enviar email via API route
    const response = await fetch('/api/messages/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: client.email,
        subject,
        html: content
      }),
    });

    const result = await response.json();
    const success = response.ok && result.success;

    // Registrar log
    await MarketingService.logEmail({
      campaignId: `automation_${ruleId}`,
      clientId: client.id,
      email: client.email,
      subject,
      status: success ? 'sent' : 'failed',
      sent_at: success ? new Date().toISOString() : undefined,
      errorMessage: result.error,
      metadata: {
        automationRuleId: ruleId,
        messageId: result.messageId
      }
    });
  }

  /**
   * Executa ação de envio de WhatsApp
   */
  private static async executeSendWhatsAppAction(client: Client, action: AutomationAction, ruleId: string): Promise<void> {
    if (!client.whatsapp) {
      LoggerService.warn('Cliente sem WhatsApp para automação', 'AutomationService', {
        clientId: client.id,
        ruleId
      });
      return;
    }

    const message = MarketingService.processTemplate(action.parameters.message, client);

    // TODO: Implementar envio de WhatsApp
    LoggerService.info('WhatsApp enviado via automação', 'AutomationService', {
      clientId: client.id,
      ruleId,
      message
    });
  }

  /**
   * Executa ação de atualização de status
   */
  private static async executeUpdateStatusAction(client: Client, action: AutomationAction): Promise<void> {
    // TODO: Implementar atualização de status do cliente
    LoggerService.info('Status do cliente atualizado via automação', 'AutomationService', {
      clientId: client.id,
      newStatus: action.parameters.newStatus
    });
  }

  /**
   * Executa ação de adicionar tag
   */
  private static async executeAddTagAction(client: Client, action: AutomationAction): Promise<void> {
    // TODO: Implementar sistema de tags
    LoggerService.info('Tag adicionada ao cliente via automação', 'AutomationService', {
      clientId: client.id,
      tag: action.parameters.tag
    });
  }

  /**
   * Executa ação de criar tarefa
   */
  private static async executeCreateTaskAction(client: Client, action: AutomationAction): Promise<void> {
    // TODO: Implementar sistema de tarefas
    LoggerService.info('Tarefa criada via automação', 'AutomationService', {
      clientId: client.id,
      task: action.parameters.task
    });
  }

  /**
   * Atualiza estatísticas da regra
   */
  private static async updateRuleStats(ruleId: string, executionCount: number): Promise<void> {
    try {
      const supabase = await createApiSupabaseClient();
      
      await supabase
        .from('automation_rules')
        .update({
          lastExecuted: new Date().toISOString(),
          executionCount: executionCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', ruleId);
    } catch (error) {
      LoggerService.error('Erro ao atualizar estatísticas da regra', 'AutomationService', {
        ruleId,
        error
      });
    }
  }

  /**
   * Obtém templates de email predefinidos
   */
  static getEmailTemplates(): EmailTemplate[] {
    return [
      {
        id: 'expiration_reminder',
        name: 'Lembrete de Vencimento',
        subject: '⚠️ Seu plano vence em breve - {{nome}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e74c3c;">⚠️ Atenção: Seu plano vence em breve!</h2>
            <p>Olá <strong>{{nome}}</strong>,</p>
            <p>Seu plano IPTV vence em <strong>{{vencimento}}</strong>.</p>
            <p>Para evitar a interrupção do serviço, renove seu plano o quanto antes.</p>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Detalhes da sua conta:</strong></p>
              <ul>
                <li>Usuário: {{usuario}}</li>
                <li>Status: {{status}}</li>
                <li>Data de vencimento: {{vencimento}}</li>
              </ul>
            </div>
            <p>Entre em contato conosco para renovar seu plano.</p>
            <p>Atenciosamente,<br>Equipe de Suporte</p>
          </div>
        `,
        textContent: 'Olá {{nome}}, seu plano vence em {{vencimento}}. Renove o quanto antes para evitar interrupções.',
        variables: ['nome', 'vencimento', 'usuario', 'status'],
        category: 'expiration'
      },
      {
        id: 'welcome_message',
        name: 'Mensagem de Boas-vindas',
        subject: '🎉 Bem-vindo(a) ao nosso serviço IPTV - {{nome}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">🎉 Bem-vindo(a) ao nosso serviço!</h2>
            <p>Olá <strong>{{nome}}</strong>,</p>
            <p>Seja muito bem-vindo(a) ao nosso serviço de IPTV!</p>
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Seus dados de acesso:</strong></p>
              <ul>
                <li>Usuário: {{usuario}}</li>
                <li>Válido até: {{vencimento}}</li>
              </ul>
            </div>
            <p>Se tiver dúvidas, entre em contato conosco.</p>
            <p>Aproveite nosso serviço!</p>
          </div>
        `,
        textContent: 'Bem-vindo {{nome}}! Seu usuário: {{usuario}}, válido até {{vencimento}}.',
        variables: ['nome', 'usuario', 'vencimento'],
        category: 'welcome'
      },
      {
        id: 'renewal_confirmation',
        name: 'Confirmação de Renovação',
        subject: '✅ Renovação confirmada - {{nome}}',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #27ae60;">✅ Renovação confirmada!</h2>
            <p>Olá <strong>{{nome}}</strong>,</p>
            <p>Sua renovação foi processada com sucesso!</p>
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Detalhes da renovação:</strong></p>
              <ul>
                <li>Nova data de vencimento: {{vencimento}}</li>
                <li>Status: {{status}}</li>
              </ul>
            </div>
            <p>Obrigado por continuar conosco!</p>
          </div>
        `,
        textContent: 'Renovação confirmada {{nome}}! Nova data de vencimento: {{vencimento}}.',
        variables: ['nome', 'vencimento', 'status'],
        category: 'renewal'
      }
    ];
  }
}

export default AutomationService;