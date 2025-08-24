import { z } from "zod";

// Schema para validação de IDs opcionais.
const iptvIdSchema = z.string().regex(/^[0-9]*$/, { message: "O ID IPTV deve conter apenas números." }).optional().or(z.literal(''));
const managerIdSchema = z.string().regex(/^([A-Z][0-9]|[A-Z]{3}[0-9]{3})$/, { message: "ID do gestor deve ter formato A1 ou ABC123" }).optional().or(z.literal(''));

// Schema para validação de WhatsApp (nacional e internacional)
const whatsappSchema = z.string()
  .regex(/^\+?[1-9]\d{1,14}$/, { 
    message: "Formato inválido. Use apenas números com código do país (ex: +5511999999999 ou 11999999999)" 
  })
  .optional()
  .or(z.literal(''));

// Schema base para dados de um cliente. Reutilizado em diferentes formulários.
const baseCustomerSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  iptvUsername: z.string().min(3, { message: "O usuário deve ter pelo menos 3 caracteres." }),
  iptvPassword: z.string().optional(),
  iptvUserId: z.string().optional(),
  managerId: managerIdSchema,
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }).optional().or(z.literal('')),
  whatsapp: whatsappSchema,
  cpf: z.string().optional(),
  planId: z.string({ required_error: "Por favor, selecione um plano." }).min(1, { message: "Por favor, selecione um plano." }),
  serverId: z.string().optional(),
  notes: z.string().optional(),
  // Preferências de comunicação
  receiveWhatsapp: z.boolean().optional(),
  receiveEmail: z.boolean().optional(),
});

// Schema simplificado para adicionar cliente
export const addCustomerSchema = baseCustomerSchema.extend({
  expirationDate: z.date({
    required_error: "Data de vencimento é obrigatória",
  }),
});

// Schema para editar um cliente existente.
export const editCustomerSchema = addCustomerSchema.extend({
    id: z.string(),
    status: z.enum(['Ativo', 'Inativo', 'Bloqueado', 'Em teste'], { required_error: "Por favor, selecione um status." }),
    expirationDate: z.date({ required_error: "A data de vencimento é obrigatória." }),
});

// Schema específico para adicionar um novo teste.
export const addTestSchema = baseCustomerSchema.omit({ managerId: true, email: true }).extend({
    serverId: z.string({ required_error: "Por favor, selecione um servidor." }).min(1, { message: "Por favor, selecione um servidor." }),
});

// Schema para teste automático
export const addAutomaticTestSchema = z.object({
  testName: z.string().optional(),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }).optional().or(z.literal('')),
  phone: whatsappSchema,
  iptvUsername: z.string().optional(),
  serverId: z.string({ required_error: "Por favor, selecione um servidor." }).min(1, { message: "Por favor, selecione um servidor." }),
  testDurationHours: z.coerce.number().min(0.25).max(6).default(3), // 15 minutos a 6 horas
  sendMessage: z.boolean().default(true),
  messageChannel: z.enum(['email', 'whatsapp']).optional(),
});

// Schema para teste manual
export const addManualTestSchema = baseCustomerSchema.omit({ managerId: true }).extend({
    serverId: z.string().optional(),
    testDurationHours: z.coerce.number().min(0.25).max(24).default(3),
});

// Schema unificado para seleção de tipo de teste
export const testTypeSchema = z.object({
  testType: z.enum(['automatic', 'manual']),
});

// Schema para artigos da base de conhecimento
export const articleSchema = z.object({
  title: z.string().min(5, { message: "O título deve ter pelo menos 5 caracteres." }),
  content: z.string().min(20, { message: "O conteúdo deve ter pelo menos 20 caracteres." }),
  category: z.enum(['FAQ', 'Tutoriais', 'Solução de Problemas'], { required_error: "Por favor, selecione uma categoria." }),
  isPublic: z.boolean().default(true),
  serverIds: z.array(z.string()).optional(),
  visibleToAllServers: z.boolean().default(true),
});

export const editArticleSchema = articleSchema.extend({
    id: z.string(),
});

/**
 * Schema para importação de clientes via CSV/Excel
 * Campos são mais permissivos para facilitar a importação em massa
 * 
 * Requisitos importantes:
 * - planId: deve ser o ID numérico de 2 dígitos (10-99), não o UUID
 * - serverId: deve ser o ID numérico de 2 dígitos (10-99) ou "none" para nenhum servidor
 * - email e whatsapp são opcionais mas recomendados
 */
export const importCustomerSchema = z.object({
  name: z.string().min(2, { message: "O nome é obrigatório." }),
  iptvUsername: z.string().min(1, { message: "O usuário IPTV é obrigatório." }),
  iptvPassword: z.string().min(1, { message: "A senha IPTV é obrigatória." }),
  email: z.string().email({ message: "E-mail inválido." }).optional().or(z.literal('')),
  whatsapp: whatsappSchema.optional().or(z.literal('')),
  planId: z.string().min(1, { message: "O ID do plano é obrigatório." }), // ID numérico de 2 dígitos (10-99)
  serverId: z.string().min(1, { message: "O ID do servidor é obrigatório." }), // ID numérico de 2 dígitos (10-99) ou "none"
  notes: z.string().optional().or(z.literal('')), // Observações opcionais sobre o cliente
});

// Schema para planos
export const planSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  price: z.coerce.number().min(0, { message: "O preço deve ser um valor positivo." }),
  priceBeforeDiscount: z.coerce.number().optional(),
  validity: z.coerce.number().int().min(1, { message: "A validade deve ser de pelo menos 1 dia." }),
  countingType: z.enum(['month', 'days'], { required_error: "Por favor, selecione o tipo de contagem." }).default('month'),
  screens: z.coerce.number().int().min(1, { message: "Deve haver pelo menos 1 tela." }),
  panelPlanId: z.string().optional(),
  restrictions: z.string().optional(),
  sendWelcomeMessage: z.boolean().default(false),
  isPublic: z.boolean().default(false),
  groupId: z.string().optional(),
});

export const editPlanSchema = planSchema.extend({
    id: z.string(),
});

// Schema para grupos de planos
export const planGroupSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  description: z.string().optional(),
});

export const editPlanGroupSchema = planGroupSchema.extend({
    id: z.string(),
});

// Schema para a configuração de testes, incluindo mapeamento de resposta da API
const testConfigSchema = z.object({
    type: z.enum(['api', 'chatbot', 'none']),
    apiEndpoint: z.string().optional(),
    chatbotLink: z.string().optional(),
    chatbotMessage: z.string().optional(),
    apiHeaders: z.string().optional(),
    apiBody: z.string().optional(),
    testDurationMinutes: z.coerce.number().optional(),
    responseUsernamePath: z.string().optional(),
    responsePasswordPath: z.string().optional(),
    responseUserIdPath: z.string().optional(),
    responseExpirationPath: z.string().optional(),
});

// Schema base para o servidor, ANTES da validação refinada.
const serverBaseSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  integrationType: z.enum(['generic', 'pixbot', 'natv', 'none']),
  url: z.string().url({ message: "Por favor, insira uma URL válida." }).optional().or(z.literal('')),
  apiKey: z.string().optional(),
  status: z.enum(['Online', 'Offline', 'Instável']),
  testAutomation: z.boolean().default(false),
  renewalAutomation: z.boolean().default(false),
  paymentGateway: z.boolean().default(false),
  sendExpirationReminder: z.boolean().default(true),
  sendUsageInstructions: z.boolean().default(true),
  testConfig: testConfigSchema.optional(),
  panelServerId: z.string().optional(), // ID numérico de 2 dígitos (10-99) para APIs e importações
});

// Função de validação reutilizável
const serverRefinement = (data: z.infer<typeof serverBaseSchema>, ctx: z.RefinementCtx) => {
    // URL é obrigatória apenas para 'generic' e 'pixbot' que necessitam de um host.
    if ((data.integrationType === 'generic' || data.integrationType === 'pixbot') && !data.url) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A URL da API é obrigatória para este tipo de integração.",
            path: ["url"],
        });
    }
     // API Key é obrigatória para qualquer integração que não seja manual.
    if (data.integrationType !== 'none' && !data.apiKey) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A Chave de API é obrigatória para este tipo de integração.",
            path: ["apiKey"],
        });
    }
};

// Schema para o formulário de CRIAÇÃO de servidor
export const serverFormSchema = serverBaseSchema.superRefine(serverRefinement);

// Schema para o formulário de EDIÇÃO de servidor
export const editServerSchema = serverBaseSchema.extend({
    id: z.string(),
}).superRefine(serverRefinement);


// Schema para todas as configurações da aplicação


export const settingsSchema = z.object({
  id: z.string().optional(),
  bot_api_key: z.string().nullable().optional(),
  company_name: z.string().nullable().optional(),
  primary_color: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
