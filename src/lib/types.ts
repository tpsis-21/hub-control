export type Payment = {
  id: string;
  client_id: string;
  date: string;
  amount: number;
  status: 'Pago' | 'Pendente' | 'Atrasado' | 'Aguardando' | 'Confirmado' | 'Recusado' | 'Pendente de ativação manual' | 'Ativado';
  plan_id: string;
  transaction_id: string | null;
  payment_method: string | null;
  payment_type?: 'pix' | 'credit_card' | 'bank_transfer' | 'cash' | 'other';
  server_id?: string;
  notified?: boolean;
  created_at: string;
  updated_at: string;
  client?: {
    id: string;
    name: string;
    whatsapp: string | null;
  };
  plan?: {
    id: string;
    name: string;
    price: number;
  };
  server?: {
    id: string;
    name: string;
    renewal_automation?: boolean;
  };
};

export type InAppNotification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'payment_activated' | 'payment_pending' | 'payment_confirmed' | 'system';
  read: boolean;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  name: string;
  iptvUsername?: string;
  iptvUserId?: string;
  iptvPassword?: string;
  managerId?: string;
  whatsapp?: string;
  email?: string;
  startDate: string;
  expirationDate: string;
  status: 'Ativo' | 'Inativo' | 'Em teste' | 'Bloqueado';
  planId: string;
  serverId?: string;
  notes?: string;
  paymentHistory?: any[];
  uniqueLink?: string;
  created_at?: string;
  updated_at?: string;
  plan?: Plan;
  server?: Server;
  payments?: Payment[];
};

export type Plan = {
  id: string;
  name: string;
  price: number;
  price_before_discount?: number;
  validity: number;
  screens: number;
  panel_plan_id?: string;
  restrictions?: string;
  send_welcome_message?: boolean;
  is_public?: boolean;
  group_id?: string;
  cakto_url?: string | null;
  created_at: string;
  updated_at: string;
  group?: PlanGroup;
};

export type PlanGroup = {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plans?: Plan[];
};

export type ServerTestConfig = {
  type?: 'api' | 'chatbot' | 'none';
  createUserEndpoint?: string;
  createUserMethod?: 'POST' | 'GET' | 'PUT' | 'PATCH';
  createUserHeaders?: Record<string, string>;
  createUserBodyTemplate?: string;
  responseUserIdPath?: string;
  responseExpirationPath?: string;
  testDurationMinutes?: number;
  apiEndpoint?: string;
  apiHeaders?: string;
  apiBody?: string;
  responseUsernamePath?: string;
  responsePasswordPath?: string;
  chatbotLink?: string;
  chatbotMessage?: string;
};

export type Server = {
  id: string;
  name: string;
  url?: string;
  apiKey?: string;
  status: 'Online' | 'Offline' | 'Instável';
  integrationType: 'generic' | 'pixbot' | 'natv' | 'none';
  testAutomation: boolean;
  testConfig?: ServerTestConfig;
  renewalAutomation: boolean;
  paymentGateway: boolean;
  sendExpirationReminder: boolean;
  sendUsageInstructions: boolean;
  paymentNotifications?: boolean;
  credits?: number | null;
  lastCreditsSync?: string | null;
  panelServerId?: string; // ID numérico de 2 dígitos (10-99) para APIs e importações
};

export type KnowledgeBaseArticle = {
  id: string;
  title: string;
  content: string;
  category: 'FAQ' | 'Tutoriais' | 'Solução de Problemas';
  isPublic: boolean;
  serverIds?: string[];
  visibleToAllServers?: boolean;
  created_at: string;
  updated_at: string;
};

export type Settings = {
  id: string;
  bot_api_key?: string | null;
  company_name?: string | null;
  primary_color?: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialTransaction = {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  category: string;
  transaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FinancialSummary = {
  receitaMes: number;
  despesasMes: number;
  lucroLiquido: number;
  receitaAnual: number;
  margemLucro: number;
  crescimentoReceita: number;
  crescimentoDespesas: number;
};

