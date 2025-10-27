// src/services/marketing.service.ts
import { createApiSupabaseClient } from "@/lib/supabase/clients/api";
import { LoggerService } from './logger.service';
import type { 
  Campaign, 
  CampaignSegmentation, 
  EmailTemplate, 
  AutomationRule, 
  EmailLog, 
  SMTPConfig,
  MarketingDashboard
} from '@/lib/types/marketing';
import type { Client } from '@/lib/types';
import { getClientes } from '@/app/(app)/clientes/actions';
import { getPlans } from '@/app/(app)/planos/actions';

/**
 * Serviço de Marketing e Campanhas de Email
 * Gerencia campanhas, automações, templates e métricas
 */
export class MarketingService {
  private static readonly BATCH_SIZE = 50; // Emails por lote
  private static readonly DELAY_BETWEEN_BATCHES = 1000; // 1 segundo entre lotes

  /**
   * Cria uma nova campanha
   */
  static async createCampaign(campaignData: Omit<Campaign, 'id' | 'created_at' | 'updated_at' | 'metrics'>): Promise<Campaign> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const campaign: Campaign = {
        ...campaignData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metrics: {
          totalRecipients: 0,
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          bounced: 0,
          unsubscribed: 0,
          openRate: 0,
          clickRate: 0,
          bounceRate: 0
        }
      };

      // Mapear campos para o formato da tabela
      const dbCampaign = {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        html_content: campaign.htmlContent,
        text_content: campaign.textContent,
        status: campaign.status,
        segmentation: campaign.segmentation as any,
        metrics: campaign.metrics as any,
        scheduled_at: campaign.scheduled_at,
        sent_at: campaign.sent_at,
        created_at: campaign.created_at,
        updated_at: campaign.updated_at,
        created_by: undefined // Campo não existe no tipo Campaign
      };

      const { data, error } = await supabase
        .from('marketing_campaigns')
        .insert(dbCampaign)
        .select()
        .single();

      if (error) throw error;

      // Mapear dados de volta para o tipo Campaign
      const mappedCampaign: Campaign = {
        id: data.id,
        name: data.name,
        subject: data.subject,
        htmlContent: data.html_content,
        textContent: data.text_content || undefined,
        status: data.status,
        segmentation: data.segmentation as unknown as Campaign['segmentation'],
        metrics: data.metrics as unknown as Campaign['metrics'],
        scheduled_at: data.scheduled_at || undefined,
        sent_at: data.sent_at || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
        settings: {
          fromName: '',
          fromEmail: '',
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: true
        }
      };

      LoggerService.info('Campanha criada com sucesso', 'MarketingService', { campaignId: campaign.id });
      return mappedCampaign;
    } catch (error) {
      LoggerService.error('Erro ao criar campanha', 'MarketingService', { error });
      throw error;
    }
  }

  /**
   * Obtém lista de campanhas com filtros
   */
  static async getCampaigns(filters?: {
    status?: Campaign['status'][];
    limit?: number;
    offset?: number;
  }): Promise<Campaign[]> {
    try {
      const supabase = await createApiSupabaseClient();
      let query = supabase.from('marketing_campaigns').select('*');

      if (filters?.status) {
        query = query.in('status', filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      if (!data) return [];

      // Mapear dados do Supabase para o tipo Campaign
      const mappedCampaigns: Campaign[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        htmlContent: item.html_content,
        textContent: item.text_content || undefined,
        status: item.status,
        segmentation: item.segmentation as unknown as Campaign['segmentation'],
        metrics: item.metrics as unknown as Campaign['metrics'],
        scheduled_at: item.scheduled_at || undefined,
        sent_at: item.sent_at || undefined,
        created_at: item.created_at,
        updated_at: item.updated_at,
        settings: {
          fromName: 'Hub Control',
          fromEmail: 'noreply@hubcontrol.com',
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: true
        }
      }));

      return mappedCampaigns;
    } catch (error) {
      LoggerService.error('Erro ao buscar campanhas', 'MarketingService', { error });
      throw error;
    }
  }

  /**
   * Segmenta clientes baseado nos critérios da campanha
   */
  static async segmentClients(segmentation: CampaignSegmentation): Promise<Client[]> {
    try {
      let clients: Client[] = [];

      switch (segmentation.type) {
        case 'all':
          clients = await getClientes();
          break;
        
        case 'active':
          clients = await getClientes({ status: 'Ativo' });
          break;
        
        case 'inactive':
          clients = await getClientes({ status: 'Inativo' });
          break;
        
        case 'expired':
          clients = await getClientes();
          clients = clients.filter(client => {
            const expirationDate = new Date(client.expirationDate);
            return expirationDate < new Date() && client.status !== 'Em teste';
          });
          break;
        
        case 'expiring':
          clients = await getClientes({ status: 'Ativo' });
          if (segmentation.filters.expirationDays) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + segmentation.filters.expirationDays);
            
            clients = clients.filter(client => {
              const expirationDate = new Date(client.expirationDate);
              return expirationDate <= targetDate && expirationDate >= new Date();
            });
          }
          break;
        
        case 'custom':
          clients = await getClientes();
          // Aplicar filtros customizados
          if (segmentation.filters.status) {
            clients = clients.filter(client => 
              segmentation.filters.status!.includes(client.status)
            );
          }
          if (segmentation.filters.planIds) {
            clients = clients.filter(client => 
              segmentation.filters.planIds!.includes(client.planId)
            );
          }
          break;
      }

      // Filtrar clientes sem email
      clients = clients.filter(client => client.email && client.email.trim() !== '');

      LoggerService.info('Segmentação de clientes concluída', 'MarketingService', {
        segmentationType: segmentation.type,
        totalClients: clients.length
      });

      return clients;
    } catch (error) {
      LoggerService.error('Erro na segmentação de clientes', 'MarketingService', { error });
      throw error;
    }
  }

  /**
   * Processa template com variáveis do cliente
   */
  static processTemplate(template: string, client: Client, extraData?: Record<string, any>): string {
    let processed = template;

    // Variáveis do cliente
    const variables = {
      '{{nome}}': client.name,
      '{{email}}': client.email || '',
      '{{usuario}}': client.iptvUsername,
      '{{vencimento}}': new Date(client.expirationDate).toLocaleDateString('pt-BR'),
      '{{status}}': client.status,
      '{{observacoes}}': client.notes || '',
      '{{data_inicio}}': new Date(client.startDate).toLocaleDateString('pt-BR'),
      '{{link_area_cliente}}': client.uniqueLink ? `/cliente/${client.uniqueLink}` : '',
      ...extraData
    };

    // Substituir variáveis
    Object.entries(variables).forEach(([key, value]) => {
      processed = processed.replace(new RegExp(key, 'g'), String(value));
    });

    return processed;
  }

  /**
   * Envia campanha para lista segmentada
   */
  static async sendCampaign(campaignId: string): Promise<{ success: boolean; sent: number; failed: number }> {
    try {
      const response = await fetch('/api/marketing/send-campaign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ campaignId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar campanha');
      }

      const result = await response.json();
      return {
        success: result.success,
        sent: result.sentCount,
        failed: result.failedCount,
      };
    } catch (error) {
      LoggerService.error('Erro ao enviar campanha', 'MarketingService', { campaignId, error });
      throw error;
    }
  }

  /**
   * Registra log de email enviado
   */
  static async logEmail(logData: Omit<EmailLog, 'id'>): Promise<void> {
    try {
      const supabase = await createApiSupabaseClient();
      
      const emailLog: EmailLog = {
        ...logData,
        id: crypto.randomUUID()
      };

      await supabase.from('email_logs').insert([emailLog]);
    } catch (error) {
      LoggerService.error('Erro ao registrar log de email', 'MarketingService', { error });
    }
  }

  /**
   * Obtém métricas do dashboard de marketing
   */
  static async getMarketingDashboard(): Promise<MarketingDashboard> {
    try {
      const supabase = await createApiSupabaseClient();
      
      // Buscar campanhas
      const { data: campaignsData } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });

      // Mapear dados do Supabase para o tipo Campaign
      const campaigns: Campaign[] = campaignsData?.map((item: any) => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        htmlContent: item.html_content,
        textContent: item.text_content || undefined,
        status: item.status,
        segmentation: item.segmentation as unknown as Campaign['segmentation'],
        metrics: item.metrics as unknown as Campaign['metrics'],
        scheduled_at: item.scheduled_at || undefined,
        sent_at: item.sent_at || undefined,
        created_at: item.created_at,
        updated_at: item.updated_at,
        settings: {
          fromName: 'Hub Control',
          fromEmail: 'noreply@hubcontrol.com',
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: true
        }
      })) || [];

      // Buscar automações
      const { data: automations } = await supabase
        .from('automation_rules')
        .select('*');

      // Buscar clientes ativos
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('status', 'Ativo');

      // Calcular métricas
      const totalCampaigns = campaigns?.length || 0;
      const activeCampaigns = campaigns?.filter(c => c.status === 'sending').length || 0;
      const totalEmailsSent = campaigns?.reduce((sum, c) => {
        const metrics = c.metrics as any;
        return sum + (metrics?.sent || 0);
      }, 0) || 0;
      const activeClients = clients?.length || 0;
      
      const campaignsWithMetrics = campaigns?.filter(c => {
        const metrics = c.metrics as any;
        return metrics?.sent > 0;
      }) || [];
      const averageOpenRate = campaignsWithMetrics.length > 0 
        ? campaignsWithMetrics.reduce((sum, c) => {
            const metrics = c.metrics as any;
            return sum + (metrics?.openRate || 0);
          }, 0) / campaignsWithMetrics.length
        : 0;
      const averageClickRate = campaignsWithMetrics.length > 0
        ? campaignsWithMetrics.reduce((sum, c) => {
            const metrics = c.metrics as any;
            return sum + (metrics?.clickRate || 0);
          }, 0) / campaignsWithMetrics.length
        : 0;

      return {
        totalCampaigns,
        activeCampaigns,
        totalEmailsSent,
        emailsSent: totalEmailsSent, // Mesmo valor que totalEmailsSent
        averageOpenRate,
        averageClickRate,
        openRate: averageOpenRate, // Mesmo valor que averageOpenRate
        clickRate: averageClickRate, // Mesmo valor que averageClickRate
        bounceRate: 0, // TODO: Calcular taxa de bounce real
        deliveryRate: 95, // TODO: Calcular taxa de entrega real
        spamRate: 0, // TODO: Calcular taxa de spam real
        deliverabilityScore: 85, // TODO: Calcular score de deliverabilidade real
        activeClients,
        recentCampaigns: campaigns?.slice(0, 5) || [],
        topPerformingCampaigns: campaigns
          ?.filter(c => (c.metrics as any)?.sent > 0)
          .sort((a, b) => ((b.metrics as any)?.openRate || 0) - ((a.metrics as any)?.openRate || 0))
          .slice(0, 5) || [],
        automationStats: {
          totalRules: automations?.length || 0,
          activeRules: automations?.filter((a: any) => a.is_active).length || 0,
          executionsToday: 0 // TODO: Implementar contagem de execuções
        }
      };
    } catch (error) {
      LoggerService.error('Erro ao buscar dashboard de marketing', 'MarketingService', { error });
      throw error;
    }
  }

  /**
   * Testa configuração SMTP
   */
  static async testSMTPConfig(config: Omit<SMTPConfig, 'id' | 'lastTested' | 'testResult'>): Promise<{
    success: boolean;
    error?: string;
    latency?: number;
  }> {
    try {
      const startTime = Date.now();
      
      // Usar API route para testar o envio
      const response = await fetch('/api/marketing/test-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          secure: config.secure,
          username: config.username,
          password: config.password,
          fromEmail: config.fromEmail,
          testEmail: config.fromEmail
        }),
      });

      const result = await response.json();
      const latency = Date.now() - startTime;

      return {
        success: result.success,
        error: result.error || result.message,
        latency
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }


}

export default MarketingService;
