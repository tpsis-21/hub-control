// Serviço para automação de marketing
export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: AutomationTrigger;
  actions: AutomationAction[];
  conditions?: AutomationCondition[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationTrigger {
  type: 'client_created' | 'client_expired' | 'payment_received' | 'test_started' | 'test_expired';
  delay?: number; // em minutos
}

export interface AutomationAction {
  type: 'send_email' | 'send_whatsapp' | 'update_status' | 'create_renewal';
  config: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: any;
}

export interface AutomationExecution {
  id: string;
  ruleId: string;
  clientId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  executedAt?: Date;
  error?: string;
  result?: any;
}

export class AutomationService {
  private rules: Map<string, AutomationRule> = new Map();
  private executions: Map<string, AutomationExecution> = new Map();

  // Gerenciamento de regras
  async createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<AutomationRule> {
    const newRule: AutomationRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.rules.set(newRule.id, newRule);
    return newRule;
  }

  async updateRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | null> {
    const rule = this.rules.get(id);
    if (!rule) return null;

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date()
    };

    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteRule(id: string): Promise<boolean> {
    return this.rules.delete(id);
  }

  async getRules(): Promise<AutomationRule[]> {
    return Array.from(this.rules.values());
  }

  async getRule(id: string): Promise<AutomationRule | null> {
    return this.rules.get(id) || null;
  }

  async getActiveRules(): Promise<AutomationRule[]> {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  // Execução de automações
  async triggerAutomation(triggerType: AutomationTrigger['type'], context: any): Promise<void> {
    const activeRules = await this.getActiveRules();
    const matchingRules = activeRules.filter(rule => rule.trigger.type === triggerType);

    for (const rule of matchingRules) {
      if (await this.evaluateConditions(rule.conditions || [], context)) {
        await this.executeRule(rule, context);
      }
    }
  }

  private async executeRule(rule: AutomationRule, context: any): Promise<void> {
    const execution: AutomationExecution = {
      id: this.generateId(),
      ruleId: rule.id,
      clientId: context.clientId || '',
      status: 'pending'
    };

    this.executions.set(execution.id, execution);

    try {
      execution.status = 'running';
      this.executions.set(execution.id, execution);

      // Aplicar delay se configurado
      if (rule.trigger.delay && rule.trigger.delay > 0) {
        await this.delay(rule.trigger.delay * 60 * 1000); // converter minutos para ms
      }

      // Executar ações
      const results = [];
      for (const action of rule.actions) {
        const result = await this.executeAction(action, context);
        results.push(result);
      }

      execution.status = 'completed';
      execution.executedAt = new Date();
      execution.result = results;
      this.executions.set(execution.id, execution);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Erro desconhecido';
      this.executions.set(execution.id, execution);
    }
  }

  private async executeAction(action: AutomationAction, context: any): Promise<any> {
    switch (action.type) {
      case 'send_email':
        return await this.sendEmail(action.config, context);
      case 'send_whatsapp':
        return await this.sendWhatsApp(action.config, context);
      case 'update_status':
        return await this.updateClientStatus(action.config, context);
      case 'create_renewal':
        return await this.createRenewal(action.config, context);
      default:
        throw new Error(`Tipo de ação não suportado: ${action.type}`);
    }
  }

  private async evaluateConditions(conditions: AutomationCondition[], context: any): Promise<boolean> {
    if (conditions.length === 0) return true;

    return conditions.every(condition => {
      const fieldValue = this.getFieldValue(condition.field, context);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  private evaluateCondition(fieldValue: any, operator: AutomationCondition['operator'], expectedValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === expectedValue;
      case 'not_equals':
        return fieldValue !== expectedValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(expectedValue);
      case 'less_than':
        return Number(fieldValue) < Number(expectedValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: any): any {
    const fields = field.split('.');
    let value = context;
    for (const f of fields) {
      value = value?.[f];
    }
    return value;
  }

  // Implementações das ações (mock)
  private async sendEmail(config: any, context: any): Promise<any> {
    console.log('Enviando email:', { config, context });
    return { success: true, message: 'Email enviado' };
  }

  private async sendWhatsApp(config: any, context: any): Promise<any> {
    console.log('Enviando WhatsApp:', { config, context });
    return { success: true, message: 'WhatsApp enviado' };
  }

  private async updateClientStatus(config: any, context: any): Promise<any> {
    console.log('Atualizando status do cliente:', { config, context });
    return { success: true, message: 'Status atualizado' };
  }

  private async createRenewal(config: any, context: any): Promise<any> {
    console.log('Criando renovação:', { config, context });
    return { success: true, message: 'Renovação criada' };
  }

  // Utilitários
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Estatísticas
  async getExecutions(ruleId?: string): Promise<AutomationExecution[]> {
    const executions = Array.from(this.executions.values());
    return ruleId ? executions.filter(e => e.ruleId === ruleId) : executions;
  }

  async getExecutionStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
  }> {
    const executions = Array.from(this.executions.values());
    return {
      total: executions.length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      pending: executions.filter(e => e.status === 'pending').length,
      running: executions.filter(e => e.status === 'running').length
    };
  }
}

// Instância singleton
let automationServiceInstance: AutomationService | null = null;

export const getAutomationService = (): AutomationService => {
  if (!automationServiceInstance) {
    automationServiceInstance = new AutomationService();
  }
  return automationServiceInstance;
};

// Exportação para compatibilidade
export const automationService = getAutomationService();

export default AutomationService;
