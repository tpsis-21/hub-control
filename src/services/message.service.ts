// src/services/message.service.ts
import nodemailer from 'nodemailer';
import { getSettings } from '@/app/(app)/configuracoes/actions';
import { LoggerService } from './logger.service';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface WhatsAppMessage {
  to: string;
  message: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Serviço centralizado para envio de mensagens
 * Suporta e-mail (SMTP) e WhatsApp (via BotConversa)
 */
export class MessageService {
  private static emailTransporter: nodemailer.Transporter | null = null;
  private static settings: any = null;
  private static settingsLastFetch = 0;
  private static readonly SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Obtém as configurações do sistema com cache
   */
  private static async getSystemSettings() {
    const now = Date.now();
    if (!this.settings || (now - this.settingsLastFetch) > this.SETTINGS_CACHE_TTL) {
      this.settings = await getSettings();
      this.settingsLastFetch = now;
    }
    return this.settings;
  }

  /**
   * Configura o transporter de e-mail
   */
  private static async getEmailTransporter(): Promise<nodemailer.Transporter | null> {
    try {
      const settings = await this.getSystemSettings();
      
      if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPass) {
        LoggerService.warn('Configurações SMTP não encontradas', 'MessageService');
        return null;
      }

      // Recria o transporter se as configurações mudaram
      if (!this.emailTransporter) {
        this.emailTransporter = nodemailer.createTransporter({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          secure: settings.smtpSecure || false,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPass,
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        // Verifica a conexão
        await this.emailTransporter.verify();
        LoggerService.info('Transporter SMTP configurado com sucesso', 'MessageService');
      }

      return this.emailTransporter;
    } catch (error) {
      LoggerService.error('Erro ao configurar transporter SMTP', 'MessageService', { error });
      this.emailTransporter = null;
      return null;
    }
  }

  /**
   * Envia um e-mail
   */
  static async sendEmail(message: EmailMessage): Promise<MessageResult> {
    try {
      const transporter = await this.getEmailTransporter();
      
      if (!transporter) {
        return {
          success: false,
          error: 'Configurações SMTP não disponíveis'
        };
      }

      const result = await transporter.sendMail({
        from: (await this.getSystemSettings()).smtpUser,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text || message.html.replace(/<[^>]*>/g, '') // Remove HTML tags para texto
      });

      LoggerService.info('E-mail enviado com sucesso', 'MessageService', {
        to: message.to,
        subject: message.subject,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      LoggerService.error('Erro ao enviar e-mail', 'MessageService', {
        to: message.to,
        subject: message.subject,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Envia uma mensagem via WhatsApp (BotConversa)
   */
  static async sendWhatsApp(message: WhatsAppMessage): Promise<MessageResult> {
    try {
      const settings = await this.getSystemSettings();
      
      if (!settings.whatsappApiEndpoint || !settings.whatsappApiKey) {
        return {
          success: false,
          error: 'Configurações do WhatsApp não disponíveis'
        };
      }

      const response = await fetch(settings.whatsappApiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.whatsappApiKey}`
        },
        body: JSON.stringify({
          to: message.to,
          message: message.message
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      LoggerService.info('Mensagem WhatsApp enviada com sucesso', 'MessageService', {
        to: message.to,
        messageId: result.messageId || result.id
      });

      return {
        success: true,
        messageId: result.messageId || result.id
      };
    } catch (error) {
      LoggerService.error('Erro ao enviar mensagem WhatsApp', 'MessageService', {
        to: message.to,
        error
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Processa tags dinâmicas em templates
   */
  static processTemplate(template: string, data: Record<string, any>): string {
    let processed = template;
    
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key.toUpperCase()}}}`, 'g');
      processed = processed.replace(regex, String(value || ''));
    });

    return processed;
  }

  /**
   * Envia mensagem de boas-vindas para um cliente
   */
  static async sendWelcomeMessage(customerData: {
    name: string;
    email?: string;
    whatsapp?: string;
    planName: string;
    expirationDate: string;
    iptvUsername: string;
    iptvPassword: string;
  }): Promise<{ email?: MessageResult; whatsapp?: MessageResult }> {
    const results: { email?: MessageResult; whatsapp?: MessageResult } = {};

    const templateData = {
      NOME: customerData.name,
      PLANO: customerData.planName,
      VENCIMENTO: customerData.expirationDate,
      USUARIO_IPTV: customerData.iptvUsername,
      SENHA_IPTV: customerData.iptvPassword,
      LINK_CLIENTE: `${process.env.NEXT_PUBLIC_APP_URL}/cliente/${customerData.iptvUsername}`
    };

    // Template padrão de boas-vindas
    const emailTemplate = `
      <h1>Bem-vindo(a), {{NOME}}!</h1>
      <p>Seu acesso ao plano <strong>{{PLANO}}</strong> foi criado com sucesso.</p>
      <h3>Dados de Acesso:</h3>
      <ul>
        <li><strong>Usuário:</strong> {{USUARIO_IPTV}}</li>
        <li><strong>Senha:</strong> {{SENHA_IPTV}}</li>
        <li><strong>Válido até:</strong> {{VENCIMENTO}}</li>
      </ul>
      <p><a href="{{LINK_CLIENTE}}">Acesse sua área do cliente</a></p>
      <p>Obrigado pela preferência!</p>
    `;

    const whatsappTemplate = `Olá {{NOME}}! 🎉\n\nSeu acesso ao plano *{{PLANO}}* foi criado com sucesso!\n\n📺 *Dados de Acesso:*\nUsuário: {{USUARIO_IPTV}}\nSenha: {{SENHA_IPTV}}\nVálido até: {{VENCIMENTO}}\n\n🔗 Acesse: {{LINK_CLIENTE}}\n\nObrigado pela preferência!`;

    // Enviar e-mail se disponível
    if (customerData.email) {
      results.email = await this.sendEmail({
        to: customerData.email,
        subject: `Bem-vindo(a) ao ${customerData.planName}!`,
        html: this.processTemplate(emailTemplate, templateData)
      });
    }

    // Enviar WhatsApp se disponível
    if (customerData.whatsapp) {
      results.whatsapp = await this.sendWhatsApp({
        to: customerData.whatsapp,
        message: this.processTemplate(whatsappTemplate, templateData)
      });
    }

    return results;
  }

  /**
   * Envia lembrete de vencimento
   */
  static async sendExpirationReminder(customerData: {
    name: string;
    email?: string;
    whatsapp?: string;
    planName: string;
    expirationDate: string;
    daysUntilExpiration: number;
  }): Promise<{ email?: MessageResult; whatsapp?: MessageResult }> {
    const results: { email?: MessageResult; whatsapp?: MessageResult } = {};

    const templateData = {
      NOME: customerData.name,
      PLANO: customerData.planName,
      VENCIMENTO: customerData.expirationDate,
      DIAS: customerData.daysUntilExpiration.toString(),
      LINK_CLIENTE: `${process.env.NEXT_PUBLIC_APP_URL}/cliente`
    };

    const emailTemplate = `
      <h1>Lembrete de Vencimento</h1>
      <p>Olá {{NOME}},</p>
      <p>Seu plano <strong>{{PLANO}}</strong> vence em {{DIAS}} dias ({{VENCIMENTO}}).</p>
      <p>Para evitar a interrupção do serviço, renove sua assinatura.</p>
      <p><a href="{{LINK_CLIENTE}}">Renovar agora</a></p>
    `;

    const whatsappTemplate = `⚠️ *Lembrete de Vencimento*\n\nOlá {{NOME}},\n\nSeu plano *{{PLANO}}* vence em *{{DIAS}} dias* ({{VENCIMENTO}}).\n\nPara evitar interrupção, renove sua assinatura:\n{{LINK_CLIENTE}}`;

    // Enviar e-mail se disponível
    if (customerData.email) {
      results.email = await this.sendEmail({
        to: customerData.email,
        subject: `Seu plano vence em ${customerData.daysUntilExpiration} dias`,
        html: this.processTemplate(emailTemplate, templateData)
      });
    }

    // Enviar WhatsApp se disponível
    if (customerData.whatsapp) {
      results.whatsapp = await this.sendWhatsApp({
        to: customerData.whatsapp,
        message: this.processTemplate(whatsappTemplate, templateData)
      });
    }

    return results;
  }

  /**
   * Testa a conectividade dos serviços
   */
  static async testConnections(): Promise<{
    email: { success: boolean; error?: string };
    whatsapp: { success: boolean; error?: string };
  }> {
    const results = {
      email: { success: false, error: undefined as string | undefined },
      whatsapp: { success: false, error: undefined as string | undefined }
    };

    // Testar e-mail
    try {
      const transporter = await this.getEmailTransporter();
      if (transporter) {
        await transporter.verify();
        results.email.success = true;
      } else {
        results.email.error = 'Configurações SMTP não disponíveis';
      }
    } catch (error) {
      results.email.error = error instanceof Error ? error.message : 'Erro desconhecido';
    }

    // Testar WhatsApp
    try {
      const settings = await this.getSystemSettings();
      if (settings.whatsappApiEndpoint && settings.whatsappApiKey) {
        const response = await fetch(settings.whatsappApiEndpoint + '/ping', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${settings.whatsappApiKey}`
          }
        });
        
        if (response.ok) {
          results.whatsapp.success = true;
        } else {
          results.whatsapp.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      } else {
        results.whatsapp.error = 'Configurações do WhatsApp não disponíveis';
      }
    } catch (error) {
      results.whatsapp.error = error instanceof Error ? error.message : 'Erro desconhecido';
    }

    return results;
  }

  /**
   * Limpa o cache de configurações (útil após atualizações)
   */
  static clearCache(): void {
    this.settings = null;
    this.emailTransporter = null;
    this.settingsLastFetch = 0;
  }
}

export default MessageService;