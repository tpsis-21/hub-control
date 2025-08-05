// src/lib/types/marketing.ts
export interface Campaign {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  segmentation: CampaignSegmentation;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  metrics: CampaignMetrics;
  settings: CampaignSettings;
}

export interface CampaignSegmentation {
  type: 'all' | 'active' | 'inactive' | 'expired' | 'expiring' | 'custom';
  filters: {
    status?: ('Ativo' | 'Inativo' | 'Bloqueado' | 'Em teste')[];
    planIds?: string[];
    serverIds?: string[];
    expirationDays?: number; // Para clientes vencendo em X dias
    customQuery?: string;
  };
}

export interface CampaignMetrics {
  totalRecipients: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface CampaignSettings {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  trackOpens: boolean;
  trackClicks: boolean;
  unsubscribeLink: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'marketing' | 'notification' | 'transactional';
  htmlContent: string;
  textContent?: string;
  variables: TemplateVariable[];
  isDefault: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  description: string;
  type: 'text' | 'number' | 'date' | 'currency';
  required: boolean;
  defaultValue?: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  created_at: string;
  updated_at: string;
  lastExecuted?: string;
  executionCount: number;
}

export interface AutomationTrigger {
  type: 'client_expiring' | 'client_expired' | 'payment_received' | 'test_created' | 'client_created' | 'manual';
  config: {
    daysBefore?: number; // Para triggers de vencimento
    timeOfDay?: string; // HH:mm para execução
    recurring?: boolean;
  };
}

export interface AutomationCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface AutomationAction {
  type: 'send_email' | 'send_whatsapp' | 'update_status' | 'add_tag' | 'webhook';
  config: {
    templateId?: string;
    message?: string;
    status?: string;
    tag?: string;
    webhookUrl?: string;
    delay?: number; // Delay em minutos antes da execução
  };
}

export interface EmailLog {
  id: string;
  campaign_id?: string;
  automation_id?: string;
  client_id: string;
  email: string;
  subject: string;
  status: 'queued' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  error_message?: string;
  metadata: {
    message_id?: string;
    user_agent?: string;
    ip_address?: string;
  };
}

export interface UnsubscribeRecord {
  id: string;
  email: string;
  client_id?: string;
  reason?: string;
  unsubscribed_at: string;
  campaign_id?: string;
}

export interface SMTPConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  isDefault: boolean;
  isActive: boolean;
  useForNotifications: boolean; // Para avisos de vencimento e notificações
  useForMarketing: boolean; // Para campanhas de marketing
  priority: number; // Prioridade para randomização (1-10)
  dailyLimit?: number; // Limite diário de emails
  currentDailyCount?: number; // Contador atual do dia
  lastTested?: string;
  testResult?: {
    success: boolean;
    error?: string;
    latency?: number;
  };
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SMTPSettings {
  enableRandomization: boolean; // Ativar randomização entre SMTPs
  defaultNotificationSMTP?: string; // SMTP padrão para notificações
  defaultMarketingSMTP?: string; // SMTP padrão para marketing
  rotationStrategy: 'random' | 'round_robin' | 'priority'; // Estratégia de rotação
}

export interface MarketingDashboard {
  totalCampaigns: number;
  activeCampaigns: number;
  totalEmailsSent: number;
  averageOpenRate: number;
  averageClickRate: number;
  activeClients: number;
  recentCampaigns: Campaign[];
  topPerformingCampaigns: Campaign[];
  automationStats: {
    totalRules: number;
    activeRules: number;
    executionsToday: number;
  };
}