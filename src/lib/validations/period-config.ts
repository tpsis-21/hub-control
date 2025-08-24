import { z } from 'zod';

// Schema para validação de configuração de servidor
export const serverConfigSchema = z.object({
  // Configurações básicas
  server_name: z.string()
    .min(1, 'Nome do servidor é obrigatório')
    .max(100, 'Nome do servidor deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Nome do servidor contém caracteres inválidos'),
  
  server_type: z.enum(['vps', 'dedicated', 'cloud', 'hybrid'], {
    errorMap: () => ({ message: 'Tipo de servidor inválido' })
  }),
  
  location: z.string()
    .min(1, 'Localização é obrigatória')
    .max(50, 'Localização deve ter no máximo 50 caracteres'),
  
  status: z.enum(['active', 'inactive', 'maintenance'], {
    errorMap: () => ({ message: 'Status inválido' })
  }),
  
  // Configurações de período
  period_calculation_type: z.enum(['fixed', 'usage_based', 'hybrid'], {
    errorMap: () => ({ message: 'Tipo de cálculo de período inválido' })
  }),
  
  period_duration_days: z.number()
    .int('Duração deve ser um número inteiro')
    .min(1, 'Duração mínima é 1 dia')
    .max(365, 'Duração máxima é 365 dias'),
  
  grace_period_days: z.number()
    .int('Período de carência deve ser um número inteiro')
    .min(0, 'Período de carência não pode ser negativo')
    .max(30, 'Período de carência máximo é 30 dias'),
  
  auto_renewal: z.boolean(),
  
  // Configurações de recursos
  cpu_cores: z.number()
    .int('Número de cores deve ser um número inteiro')
    .min(1, 'Mínimo 1 core')
    .max(128, 'Máximo 128 cores'),
  
  ram_gb: z.number()
    .min(0.5, 'RAM mínima é 0.5GB')
    .max(1024, 'RAM máxima é 1024GB'),
  
  storage_gb: z.number()
    .min(1, 'Armazenamento mínimo é 1GB')
    .max(10240, 'Armazenamento máximo é 10TB'),
  
  bandwidth_mbps: z.number()
    .min(1, 'Largura de banda mínima é 1Mbps')
    .max(10000, 'Largura de banda máxima é 10Gbps'),
  
  // Configurações de preço
  base_price: z.number()
    .min(0, 'Preço base não pode ser negativo')
    .max(10000, 'Preço base máximo é R$ 10.000'),
  
  currency: z.enum(['BRL', 'USD', 'EUR'], {
    errorMap: () => ({ message: 'Moeda inválida' })
  }),
  
  // Configurações de notificação
  notification_settings: z.object({
    email_notifications: z.boolean(),
    webhook_notifications: z.boolean(),
    sms_notifications: z.boolean(),
    notification_threshold_days: z.number()
      .int('Limite de notificação deve ser um número inteiro')
      .min(1, 'Limite mínimo é 1 dia')
      .max(30, 'Limite máximo é 30 dias')
  }),
  
  // Configurações avançadas
  advanced_settings: z.object({
    backup_enabled: z.boolean(),
    monitoring_enabled: z.boolean(),
    ssl_enabled: z.boolean(),
    firewall_enabled: z.boolean(),
    custom_config: z.string().max(1000, 'Configuração customizada deve ter no máximo 1000 caracteres').optional()
  })
});

// Schema para validação de configuração de plano
export const planConfigSchema = z.object({
  // Configurações básicas
  plan_name: z.string()
    .min(1, 'Nome do plano é obrigatório')
    .max(100, 'Nome do plano deve ter no máximo 100 caracteres')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Nome do plano contém caracteres inválidos'),
  
  plan_type: z.enum(['basic', 'standard', 'premium', 'enterprise'], {
    errorMap: () => ({ message: 'Tipo de plano inválido' })
  }),
  
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  
  status: z.enum(['active', 'inactive', 'deprecated'], {
    errorMap: () => ({ message: 'Status inválido' })
  }),
  
  // Configurações de período
  period_calculation_config: z.object({
    calculation_type: z.enum(['fixed', 'usage_based', 'hybrid'], {
      errorMap: () => ({ message: 'Tipo de cálculo inválido' })
    }),
    billing_cycle: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual'], {
      errorMap: () => ({ message: 'Ciclo de cobrança inválido' })
    }),
    trial_period_days: z.number()
      .int('Período de teste deve ser um número inteiro')
      .min(0, 'Período de teste não pode ser negativo')
      .max(90, 'Período de teste máximo é 90 dias'),
    grace_period_days: z.number()
      .int('Período de carência deve ser um número inteiro')
      .min(0, 'Período de carência não pode ser negativo')
      .max(30, 'Período de carência máximo é 30 dias')
  }),
  
  // Configurações de preço
  pricing: z.object({
    base_price: z.number()
      .min(0, 'Preço base não pode ser negativo')
      .max(50000, 'Preço base máximo é R$ 50.000'),
    setup_fee: z.number()
      .min(0, 'Taxa de configuração não pode ser negativa')
      .max(5000, 'Taxa de configuração máxima é R$ 5.000'),
    currency: z.enum(['BRL', 'USD', 'EUR'], {
      errorMap: () => ({ message: 'Moeda inválida' })
    }),
    discount_percentage: z.number()
      .min(0, 'Desconto não pode ser negativo')
      .max(100, 'Desconto máximo é 100%'),
    promotional_price: z.number()
      .min(0, 'Preço promocional não pode ser negativo')
      .optional()
  }),
  
  // Recursos incluídos
  features: z.object({
    max_servers: z.number()
      .int('Número máximo de servidores deve ser um número inteiro')
      .min(1, 'Mínimo 1 servidor')
      .max(1000, 'Máximo 1000 servidores'),
    max_users: z.number()
      .int('Número máximo de usuários deve ser um número inteiro')
      .min(1, 'Mínimo 1 usuário')
      .max(10000, 'Máximo 10000 usuários'),
    storage_gb: z.number()
      .min(1, 'Armazenamento mínimo é 1GB')
      .max(100000, 'Armazenamento máximo é 100TB'),
    bandwidth_gb: z.number()
      .min(1, 'Largura de banda mínima é 1GB')
      .max(100000, 'Largura de banda máxima é 100TB'),
    backup_retention_days: z.number()
      .int('Retenção de backup deve ser um número inteiro')
      .min(1, 'Retenção mínima é 1 dia')
      .max(365, 'Retenção máxima é 365 dias'),
    support_level: z.enum(['basic', 'standard', 'premium', '24x7'], {
      errorMap: () => ({ message: 'Nível de suporte inválido' })
    }),
    api_calls_per_month: z.number()
      .int('Chamadas de API deve ser um número inteiro')
      .min(100, 'Mínimo 100 chamadas por mês')
      .max(10000000, 'Máximo 10 milhões de chamadas por mês')
  }),
  
  // Limites e restrições
  limits: z.object({
    max_concurrent_connections: z.number()
      .int('Conexões simultâneas deve ser um número inteiro')
      .min(1, 'Mínimo 1 conexão')
      .max(10000, 'Máximo 10000 conexões'),
    max_file_size_mb: z.number()
      .min(1, 'Tamanho máximo de arquivo mínimo é 1MB')
      .max(5000, 'Tamanho máximo de arquivo é 5GB'),
    rate_limit_per_minute: z.number()
      .int('Limite de taxa deve ser um número inteiro')
      .min(1, 'Mínimo 1 requisição por minuto')
      .max(10000, 'Máximo 10000 requisições por minuto'),
    custom_domain_allowed: z.boolean(),
    ssl_certificate_included: z.boolean(),
    priority_support: z.boolean()
  }),
  
  // Configurações de notificação
  notification_settings: z.object({
    billing_notifications: z.boolean(),
    usage_notifications: z.boolean(),
    maintenance_notifications: z.boolean(),
    security_notifications: z.boolean(),
    notification_email: z.string().email('Email inválido').optional(),
    webhook_url: z.string().url('URL de webhook inválida').optional()
  })
});

// Schema para validação de configuração de monitoramento
export const monitoringConfigSchema = z.object({
  auto_refresh: z.boolean(),
  refresh_interval: z.number()
    .int('Intervalo deve ser um número inteiro')
    .min(60, 'Intervalo mínimo é 60 segundos para evitar requisições excessivas')
    .max(3600, 'Intervalo máximo é 3600 segundos (1 hora)'),
  alert_thresholds: z.object({
    low_credits: z.number()
      .min(0, 'Limite não pode ser negativo')
      .max(100, 'Limite máximo é 100%'),
    high_usage: z.number()
      .min(0, 'Limite não pode ser negativo')
      .max(100, 'Limite máximo é 100%'),
    critical_usage: z.number()
      .min(0, 'Limite não pode ser negativo')
      .max(100, 'Limite máximo é 100%')
  }),
  notification_settings: z.object({
    email_alerts: z.boolean(),
    webhook_alerts: z.boolean(),
    dashboard_alerts: z.boolean()
  })
});

// Tipos TypeScript derivados dos schemas
export type ServerConfig = z.infer<typeof serverConfigSchema>;
export type PlanConfig = z.infer<typeof planConfigSchema>;
export type MonitoringConfig = z.infer<typeof monitoringConfigSchema>;

// Função para validar configuração de servidor
export function validateServerConfig(data: unknown): { success: true; data: ServerConfig } | { success: false; errors: string[] } {
  try {
    const validData = serverConfigSchema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
}

// Função para validar configuração de plano
export function validatePlanConfig(data: unknown): { success: true; data: PlanConfig } | { success: false; errors: string[] } {
  try {
    const validData = planConfigSchema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
}

// Função para validar configuração de monitoramento
export function validateMonitoringConfig(data: unknown): { success: true; data: MonitoringConfig } | { success: false; errors: string[] } {
  try {
    const validData = monitoringConfigSchema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
}

// Validações customizadas para regras de negócio
export const businessRules = {
  // Validar se o período de carência não é maior que a duração do período
  validateGracePeriod: (periodDays: number, graceDays: number): boolean => {
    return graceDays <= periodDays * 0.5; // Máximo 50% do período
  },
  
  // Validar se o preço promocional é menor que o preço base
  validatePromotionalPrice: (basePrice: number, promotionalPrice?: number): boolean => {
    if (!promotionalPrice) return true;
    return promotionalPrice < basePrice;
  },
  
  // Validar se os recursos do plano são consistentes
  validatePlanResources: (maxServers: number, maxUsers: number): boolean => {
    // Pelo menos 1 usuário por servidor
    return maxUsers >= maxServers;
  },
  
  // Validar se os limites de alerta são consistentes
  validateAlertThresholds: (low: number, high: number, critical: number): boolean => {
    return low < high && high < critical;
  },
  
  // Validar se a configuração de recursos é viável
  validateResourceConfiguration: (cpuCores: number, ramGb: number): boolean => {
    // Pelo menos 1GB de RAM por core
    return ramGb >= cpuCores;
  },
  
  // Validar se o ciclo de cobrança é compatível com o período de teste
  validateBillingCycle: (billingCycle: string, trialDays: number): boolean => {
    const cycleDays = {
      monthly: 30,
      quarterly: 90,
      semi_annual: 180,
      annual: 365
    };
    
    const cycleLength = cycleDays[billingCycle as keyof typeof cycleDays] || 30;
    return trialDays <= cycleLength * 0.3; // Máximo 30% do ciclo
  }
};

// Função para validar regras de negócio para servidor
export function validateServerBusinessRules(config: ServerConfig): string[] {
  const errors: string[] = [];
  
  if (!businessRules.validateGracePeriod(config.period_duration_days, config.grace_period_days)) {
    errors.push('Período de carência não pode ser maior que 50% da duração do período');
  }
  
  if (!businessRules.validateResourceConfiguration(config.cpu_cores, config.ram_gb)) {
    errors.push('Configuração de recursos inválida: pelo menos 1GB de RAM por core de CPU');
  }
  
  return errors;
}

// Função para validar regras de negócio para plano
export function validatePlanBusinessRules(config: PlanConfig): string[] {
  const errors: string[] = [];
  
  if (!businessRules.validatePromotionalPrice(config.pricing.base_price, config.pricing.promotional_price)) {
    errors.push('Preço promocional deve ser menor que o preço base');
  }
  
  if (!businessRules.validatePlanResources(config.features.max_servers, config.features.max_users)) {
    errors.push('Número de usuários deve ser pelo menos igual ao número de servidores');
  }
  
  if (!businessRules.validateBillingCycle(config.period_calculation_config.billing_cycle, config.period_calculation_config.trial_period_days)) {
    errors.push('Período de teste não pode ser maior que 30% do ciclo de cobrança');
  }
  
  return errors;
}

// Função para validar regras de negócio para monitoramento
export function validateMonitoringBusinessRules(config: MonitoringConfig): string[] {
  const errors: string[] = [];
  
  const { low_credits, high_usage, critical_usage } = config.alert_thresholds;
  
  if (!businessRules.validateAlertThresholds(low_credits, high_usage, critical_usage)) {
    errors.push('Limites de alerta devem estar em ordem crescente: baixo < alto < crítico');
  }
  
  // Validar configuração de auto-refresh para evitar requisições excessivas
  if (config.auto_refresh && config.refresh_interval < 60) {
    errors.push('Auto-refresh com intervalo menor que 60 segundos pode causar requisições excessivas');
  }
  
  // Alertar sobre impacto de intervalos muito baixos
  if (config.auto_refresh && config.refresh_interval < 300) {
    errors.push('Intervalos menores que 5 minutos podem impactar a performance do sistema');
  }
  
  return errors;
}

// Função utilitária para validação completa
export function validateCompleteConfig<T>(
  data: unknown,
  schema: z.ZodSchema<T>,
  businessRulesValidator?: (config: T) => string[]
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validData = schema.parse(data);
    
    // Aplicar regras de negócio se fornecidas
    if (businessRulesValidator) {
      const businessErrors = businessRulesValidator(validData);
      if (businessErrors.length > 0) {
        return { success: false, errors: businessErrors };
      }
    }
    
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => {
        const path = err.path.join('.');
        return path ? `${path}: ${err.message}` : err.message;
      });
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
}