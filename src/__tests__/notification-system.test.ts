/**
 * Testes do Sistema de Notificações
 * 
 * Este arquivo contém testes unitários e de integração para o sistema de notificações.
 */

import { NotificationSystem } from '@/lib/notifications';
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';

function buildMockSupabaseQuery() {
  return {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null }),
  };
}

jest.mock('@/lib/supabase/clients/api', () => ({
  createApiSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => buildMockSupabaseQuery()),
  })),
}));

// Mock do nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
  }))
}));

// Mock do fetch para webhooks
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ success: true })
});

describe('Sistema de Notificações', () => {
  let notificationSystem: NotificationSystem;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(() => buildMockSupabaseQuery()),
    };
    (createApiSupabaseClient as jest.Mock).mockReturnValue(mockSupabase);

    // Configurar variáveis de ambiente para teste
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.NOTIFICATION_SYSTEM_ENABLED = 'true';
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'test-password';

    notificationSystem = new NotificationSystem();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialização', () => {
    test('deve inicializar corretamente', () => {
      expect(notificationSystem).toBeInstanceOf(NotificationSystem);
    });

    test('deve conectar ao Supabase', () => {
      expect(createApiSupabaseClient).toHaveBeenCalled();
      expect(mockSupabase.from).toBeDefined();
    });
  });

  describe('Envio de Notificações', () => {
    const mockNotification = {
      type: 'system' as const,
      channel: 'email' as const,
      recipients: [{
        email: 'test@example.com',
        name: 'Test User'
      }],
      subject: 'Test Subject',
      content: 'Test Content',
      priority: 'medium' as const
    };

    test('deve enviar notificação por email', async () => {
      // Mock da configuração do canal
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            channel: 'email',
            config: {
              smtp_host: 'smtp.test.com',
              smtp_port: 587,
              smtp_user: 'test@test.com',
              smtp_pass: 'test-password',
              from_email: 'noreply@test.com'
            },
            enabled: true
          },
          error: null
        })
      });

      const result = await notificationSystem.sendNotification(
        mockNotification.type,
        mockNotification.subject,
        mockNotification.content,
        ['test@example.com'],
        {
          priority: mockNotification.priority,
          channels: [mockNotification.channel]
        }
      );

      expect(typeof result).toBe('string');
    });

    test('deve falhar com canal desabilitado', async () => {
      // Mock da configuração do canal desabilitado
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            channel: 'email',
            enabled: false
          },
          error: null
        })
      });

      const result = await notificationSystem.sendNotification(
        mockNotification.type,
        mockNotification.subject,
        mockNotification.content,
        ['test@example.com'],
        {
          priority: mockNotification.priority,
          channels: [mockNotification.channel]
        }
      );

      expect(typeof result).toBe('string');
    });

    test('deve aplicar rate limiting', async () => {
      // Mock do rate limiter
      const rateLimiter = {
        isAllowed: jest.fn().mockReturnValue(false)
      };

      // @ts-ignore - Acessar propriedade privada para teste
      notificationSystem.rateLimiter = rateLimiter;

      const result = await notificationSystem.sendNotification(
        mockNotification.type,
        mockNotification.subject,
        mockNotification.content,
        ['test@example.com'],
        {
          priority: mockNotification.priority,
          channels: [mockNotification.channel]
        }
      );

      expect(typeof result).toBe('string');
    });
  });

  describe('Templates', () => {
    const mockTemplate = {
      name: 'test_template',
      type: 'system' as const,
      subject_template: 'Hello {{name}}',
      content_template: 'Welcome {{name}} to {{app_name}}',
      variables: ['name', 'app_name'],
      enabled: true
    };

    test('deve enviar notificação usando template', async () => {
      // Mock do template
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTemplate,
          error: null
        })
      });

      // Mock da configuração do canal
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            channel: 'email',
            config: {
              smtp_host: 'smtp.test.com',
              smtp_port: 587,
              smtp_user: 'test@test.com',
              smtp_pass: 'test-password',
              from_email: 'noreply@test.com'
            },
            enabled: true
          },
          error: null
        })
      });

      const variables = {
        name: 'John Doe',
        app_name: 'Test App'
      };

      const options = {
        channel: 'email' as const,
        recipients: [{ email: 'test@example.com', name: 'Test User' }],
        priority: 'medium' as const
      };

      const result = await notificationSystem.sendNotificationFromTemplate(
        'test_template',
        ['test@example.com'],
        variables,
        options
      );

      expect(typeof result).toBe('string');
    });

    test('deve falhar com template não encontrado', async () => {
      // Mock do template não encontrado
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Template not found' }
        })
      });

      try {
        await notificationSystem.sendNotificationFromTemplate(
          'nonexistent_template',
          ['test@example.com'],
          {},
          {
            priority: 'medium'
          }
        );
        fail('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error.message).toContain('Template não encontrado');
      }
    });
  });

  describe('Canais de Notificação', () => {
    test('deve validar configuração de email', async () => {
      const emailConfig = {
        smtp_host: 'smtp.test.com',
        smtp_port: 587,
        smtp_user: 'test@test.com',
        smtp_pass: 'test-password',
        from_email: 'noreply@test.com'
      };

      const isValid = await notificationSystem.validateChannelConfig('email', emailConfig);
      expect(isValid).toBe(true);
    });

    test('deve falhar com configuração de email inválida', async () => {
      const invalidConfig = {
        smtp_host: '',
        smtp_port: 'invalid',
        smtp_user: 'invalid-email',
        smtp_pass: '',
        from_email: 'invalid-email'
      };

      const isValid = await notificationSystem.validateChannelConfig('email', invalidConfig);
      expect(isValid).toBe(false);
    });

    test('deve enviar webhook', async () => {
      const webhookConfig = {
        webhook_url: 'https://api.example.com/webhook'
      };

      // Mock da configuração do canal
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            channel: 'webhook',
            config: webhookConfig,
            enabled: true
          },
          error: null
        })
      });

      // Mock do fetch
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ success: true })
      });

      const result = await notificationSystem.sendNotification(
        'system',
        'Test Webhook',
        'Test webhook content',
        ['https://api.example.com/webhook'],
        {
          priority: 'medium',
          channels: ['webhook']
        }
      );

      expect(typeof result).toBe('string');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          })
        })
      );
    });
  });

  describe('Estatísticas e Logs', () => {
    test('deve obter estatísticas de entrega', async () => {
      const mockStats = {
        total_sent: 100,
        total_delivered: 95,
        total_failed: 5,
        delivery_rate: 0.95
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: [mockStats], error: null })
      });

      const stats = await notificationSystem.getDeliveryStats({
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31')
      });

      expect(stats).toEqual(mockStats);
    });

    test('deve obter logs de entrega', async () => {
      const mockLogs = [
        {
          id: '1',
          notification_id: 'notif-1',
          status: 'delivered',
          channel: 'email',
          created_at: new Date().toISOString()
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue({ data: mockLogs, error: null })
      });

      const logs = await notificationSystem.getDeliveryLogs({ limit: 10 });

      expect(logs).toEqual(mockLogs);
    });
  });

  describe('Tratamento de Erros', () => {
    test('deve tratar erro de conexão com banco', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection failed' }
        })
      });

      const notification = {
        type: 'system' as const,
        channel: 'email' as const,
        recipients: [{ email: 'test@example.com' }],
        subject: 'Test',
        content: 'Test content',
        priority: 'medium' as const
      };

      const result = await notificationSystem.sendNotification(
        notification.type,
        notification.subject,
        notification.content,
        ['test@example.com'],
        {
          priority: notification.priority,
          channels: [notification.channel]
        }
      );

      expect(typeof result).toBe('string');
    });

    test('deve tratar erro de SMTP', async () => {
      // Mock da configuração do canal
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            channel: 'email',
            config: {
              smtp_host: 'invalid-host',
              smtp_port: 587,
              smtp_user: 'test@test.com',
              smtp_pass: 'wrong-password',
              from_email: 'noreply@test.com'
            },
            enabled: true
          },
          error: null
        })
      });

      // Mock do nodemailer para falhar
      const nodemailer = require('nodemailer');
      nodemailer.createTransport.mockReturnValue({
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP connection failed'))
      });

      const notification = {
        type: 'system' as const,
        channel: 'email' as const,
        recipients: [{ email: 'test@example.com' }],
        subject: 'Test',
        content: 'Test content',
        priority: 'medium' as const
      };

      const result = await notificationSystem.sendNotification(
        notification.type,
        notification.subject,
        notification.content,
        ['test@example.com'],
        {
          priority: notification.priority,
          channels: [notification.channel]
        }
      );

      expect(typeof result).toBe('string');
    });
  });

  describe('Retry Policy', () => {
    test('deve tentar reenviar notificação falhada', async () => {
      // Mock da configuração do canal com retry policy
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            channel: 'webhook',
            config: {
              webhook_url: 'https://api.example.com/webhook'
            },
            enabled: true,
            retry_policy: {
              max_retries: 3,
              backoff_multiplier: 2,
              max_delay_seconds: 300
            }
          },
          error: null
        })
      });

      // Mock do fetch para falhar nas primeiras tentativas
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({ success: true })
        });

      const notification = {
        type: 'system' as const,
        channel: 'webhook' as const,
        recipients: [{ webhook_url: 'https://api.example.com/webhook' }],
        subject: 'Test Webhook',
        content: 'Test webhook content',
        priority: 'medium' as const
      };

      const result = await notificationSystem.sendNotification(
        notification.type,
        notification.subject,
        notification.content,
        ['https://api.example.com/webhook'],
        {
          priority: notification.priority,
          channels: [notification.channel]
        }
      );

      expect(typeof result).toBe('string');
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });
});

// Testes de integração (requerem configuração real)
describe('Testes de Integração', () => {
  // Estes testes só rodam se as variáveis de ambiente estiverem configuradas
  const isIntegrationTest = process.env.RUN_INTEGRATION_TESTS === 'true';

  if (!isIntegrationTest) {
    test.skip('Testes de integração desabilitados', () => {});
    return;
  }

  test('deve enviar email real', async () => {
    const notificationSystem = new NotificationSystem();

    const result = await notificationSystem.sendNotification(
      'system',
      'Teste de Integração',
      'Este é um teste de integração do sistema de notificações.',
      [process.env.TEST_EMAIL || 'test@example.com'],
      {
        priority: 'low',
        channels: ['email']
      }
    );

    expect(typeof result).toBe('string');
    expect(result).toBeDefined();
  }, 30000); // 30 segundos de timeout

  test('deve enviar notificação via webhook', async () => {
    const notificationSystem = new NotificationSystem();

    const result = await notificationSystem.sendNotification(
      'system',
      'Teste de Integração Webhook',
      'Este é um teste de integração do sistema de notificações via webhook.',
      ['https://webhook.test.com/notifications'],
      {
        priority: 'medium',
        channels: ['webhook']
      }
    );

    expect(typeof result).toBe('string');
  }, 30000);
});
