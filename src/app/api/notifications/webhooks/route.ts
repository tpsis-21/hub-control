// 🔗 API de Webhooks de Notificação
// Endpoints para gerenciar webhooks de notificação

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/clients/server';
import { withUnifiedMiddleware } from '@/middleware/unified-middleware';
// import { logSecurityEvent } from '@/lib/security';
import { z } from 'zod';
import crypto from 'crypto';

// Schema para webhook
const webhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  timeout: z.number().min(1000).max(30000).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(5),
    retryDelay: z.number().min(100).max(10000),
    backoffMultiplier: z.number().min(1).max(3)
  }).optional(),
  filters: z.object({
    types: z.array(z.string()).optional(),
    priorities: z.array(z.string()).optional(),
    channels: z.array(z.string()).optional(),
    userRoles: z.array(z.string()).optional()
  }).optional(),
  enabled: z.boolean().default(true),
  metadata: z.record(z.any()).optional()
});

// Schema para testar webhook
const testWebhookSchema = z.object({
  webhookId: z.string(),
  testData: z.object({
    type: z.string(),
    message: z.string(),
    priority: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).optional()
});

// Verificar permissões de usuário
async function checkUserPermissions(supabase: any, action: string): Promise<{
  user: any;
  hasPermission: boolean;
  role: string;
}> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, hasPermission: false, role: 'anonymous' };
  }

  // Buscar role do usuário
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'user';
  
  // Definir permissões por ação
  const permissions: { [key: string]: string[] } = {
    'read_webhooks': ['admin', 'manager'],
    'create_webhooks': ['admin'],
    'update_webhooks': ['admin'],
    'delete_webhooks': ['admin'],
    'test_webhooks': ['admin', 'manager']
  };

  const hasPermission = permissions[action]?.includes(role) || false;

  return { user, hasPermission, role };
}

// Gerar assinatura para webhook
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

// Validar URL do webhook
async function validateWebhookUrl(url: string): Promise<boolean> {
  try {
    const urlObj = new URL(url);
    
    // Verificar se não é localhost ou IP privado (em produção)
    if (process.env.NODE_ENV === 'production') {
      const hostname = urlObj.hostname;
      
      // Bloquear localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return false;
      }
      
      // Bloquear IPs privados
      const privateRanges = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^192\.168\./
      ];
      
      if (privateRanges.some(range => range.test(hostname))) {
        return false;
      }
    }
    
    // Verificar se a URL responde
    const response = await fetch(url, {
      method: 'HEAD'
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}

// GET - Listar webhooks
async function GET(request: NextRequest) {
  try {

    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'read_webhooks');

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const enabled = url.searchParams.get('enabled');
    const event = url.searchParams.get('event');
    const search = url.searchParams.get('search');

    // let query = supabase
    //   .from('notification_webhooks')
    //   .select('*', { count: 'exact' });

    // // Aplicar filtros
    // if (enabled !== null) {
    //   query = query.eq('enabled', enabled === 'true');
    // }

    // if (event) {
    //   query = query.contains('events', [event]);
    // }

    // if (search) {
    //   query = query.or(`name.ilike.%${search}%,url.ilike.%${search}%;
    // }

    // // Paginação
    // const offset = (page - 1) * limit;
    // query = query.range(offset`, offset + limit - 1);

    // // Ordenação
    // query = query.order('created_at', { ascending: false });

    // const { data: webhooks, error, count } = await query;
    
    // Dados simulados
    const webhooks = [
      {
        id: '1',
        name: 'Webhook de Teste',
        url: 'https://example.com/webhook',
        enabled: true,
        events: ['notification_sent'],
        secret: 'webhook_secret_123',
        created_at: new Date().toISOString()
      }
    ];
    const error = null;
    const count = 1;

    if (error) {
      console.error('Erro ao buscar webhooks:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar webhooks' },
        { status: 500 }
      );
    }

    // Buscar estatísticas de entrega para cada webhook
    // const webhooksWithStats = await Promise.all(
    //   (webhooks || []).map(async (webhook) => {
    //     const { data: stats } = await supabase
    //       .from('notification_delivery_logs')
    //       .select('status', { count: 'exact' })
    //       .eq('webhook_id', webhook.id)
    //       .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    //     const deliveryStats = {
    //       total: stats?.length || 0,
    //       success: stats?.filter(s => s.status === 'delivered').length || 0,
    //       failed: stats?.filter(s => s.status === 'failed').length || 0,
    //       pending: stats?.filter(s => s.status === 'pending').length || 0
    //     };

    //     return {
    //       ...webhook,
    //       // Remover dados sensíveis
    //       secret: webhook.secret ? '***' : null,
    //       deliveryStats
    //     };
    
    // Dados simulados com estatísticas
    const webhooksWithStats = (webhooks || []).map((webhook) => {
      const deliveryStats = {
        total: 10,
        success: 8,
        failed: 1,
        pending: 1
      };

      return {
        ...webhook,
        // Remover dados sensíveis
        secret: webhook.secret ? '***' : null,
        deliveryStats
      };
    });

    // Log da consulta
    // await logSecurityEvent({
    //   action: 'WEBHOOKS_LISTED',
    //   details: `Usuário consultou lista de webhooks`,
    //   severity: 'low',
    //   userId: user.id,
    //   metadata: {
    //     page,
    //     limit,
    //     totalResults: count,
    //     filters: { enabled, event, search }
    //   }
    // });

    return NextResponse.json({
      webhooks: webhooksWithStats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      },
      filters: {
        enabled,
        event,
        search
      }
    });

  } catch (error) {
    console.error('Erro na API de webhooks (GET):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar webhook ou testar webhook
async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { action, ...data } = body;

    if (action === 'test') {
      // Testar webhook
      const { user, hasPermission } = await checkUserPermissions(supabase, 'test_webhooks');

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Acesso não autorizado' },
          { status: 403 }
        );
      }

      const validationResult = testWebhookSchema.safeParse(data);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Dados inválidos para teste de webhook',
            details: validationResult.error.errors
          },
          { status: 400 }
        );
      }

      const { webhookId, testData } = validationResult.data;

      // Buscar webhook (simulado)
      const webhook = {
        id: webhookId,
        name: 'Webhook de Teste',
        url: 'https://example.com/webhook',
        secret: 'webhook_secret_test',
        timeout: 10000,
        headers: {}
      };
      const fetchError = null;

      if (fetchError || !webhook) {
        return NextResponse.json(
          { error: 'Webhook não encontrado' },
          { status: 404 }
        );
      }

      // Preparar dados de teste
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        webhook: {
          id: webhook.id,
          name: webhook.name
        },
        data: testData || {
          type: 'test',
          message: 'Este é um teste de webhook',
          priority: 'low',
          metadata: {
            testId: crypto.randomUUID(),
            triggeredBy: user.id
          }
        }
      };

      const payloadString = JSON.stringify(testPayload);

      try {
        // Preparar headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'User-Agent': 'HubControl-Webhook/1.0',
          'X-Webhook-Event': 'webhook.test',
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Timestamp': testPayload.timestamp,
          ...webhook.headers
        };

        // Adicionar assinatura se houver secret
        if (webhook.secret) {
          const signature = generateWebhookSignature(payloadString, webhook.secret);
          headers['X-Webhook-Signature'] = `sha256=${signature}`;
        }

        // Enviar webhook
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: payloadString
        });

        const responseText = await response.text();
        const success = response.ok;

        // Registrar resultado do teste (simulado)
        // await supabase
        //   .from('notification_delivery_logs')
        //   .insert({
        //     webhook_id: webhook.id,
        //     event_type: 'webhook.test',
        //     status: success ? 'delivered' : 'failed',
        //     response_code: response.status,
        //     response_body: responseText.substring(0, 1000),
        //     attempt_count: 1,
        //     metadata: {
        //       testTriggeredBy: user.id,
        //       testPayload: testPayload
        //     }
        //   });

        // await logSecurityEvent({
        //   action: 'WEBHOOK_TESTED',
        //   details: `Webhook testado: ${webhook.name} - ${success ? 'Sucesso' : 'Falha'}`,
        //   severity: 'low',
        //   userId: user.id,
        //   metadata: {
        //     webhookId,
        //     webhookName: webhook.name,
        //     success,
        //     responseCode: response.status
        //   }
        // });

        return NextResponse.json({
          success,
          message: success ? 'Webhook testado com sucesso' : 'Falha no teste do webhook',
          response: {
            status: response.status,
            statusText: response.statusText,
            body: responseText.substring(0, 500) // Limitar para resposta
          },
          testPayload
        });

      } catch (testError) {
        console.error('Erro ao testar webhook:', testError);

        // Registrar falha (simulado)
        // await supabase
        //   .from('notification_delivery_logs')
        //   .insert({
        //     webhook_id: webhook.id,
        //     event_type: 'webhook.test',
        //     status: 'failed',
        //     error_message: testError.message,
        //     attempt_count: 1,
        //     metadata: {
        //       testTriggeredBy: user.id,
        //       testPayload: testPayload
        //     }
        //   });

        return NextResponse.json({
          success: false,
          message: 'Erro ao testar webhook',
          error: testError instanceof Error ? testError.message : 'Erro desconhecido'
        }, { status: 500 });
      }

    } else {
      // Criar webhook
      const { user, hasPermission } = await checkUserPermissions(supabase, 'create_webhooks');

      if (!hasPermission) {
        // await logSecurityEvent({
        //   action: 'UNAUTHORIZED_WEBHOOK_CREATE',
        //   details: `Tentativa não autorizada de criar webhook`,
        //   severity: 'medium',
        //   userId: user?.id,
        //   metadata: { endpoint: '/api/notifications/webhooks', method: 'POST' }
        // });

        return NextResponse.json(
          { error: 'Acesso não autorizado' },
          { status: 403 }
        );
      }

      const validationResult = webhookSchema.safeParse(data);
      if (!validationResult.success) {
        return NextResponse.json(
          {
            error: 'Dados inválidos para webhook',
            details: validationResult.error.errors
          },
          { status: 400 }
        );
      }

      const webhookData = validationResult.data;

      // Validar URL do webhook
      const isValidUrl = await validateWebhookUrl(webhookData.url);
      if (!isValidUrl) {
        return NextResponse.json(
          { error: 'URL do webhook inválida ou inacessível' },
          { status: 400 }
        );
      }

      // Verificar se já existe webhook com este nome (simulado)
      const existingWebhook = null; // Simulado: não existe

      if (existingWebhook) {
        return NextResponse.json(
          { error: 'Já existe um webhook com este nome' },
          { status: 409 }
        );
      }

      // Gerar secret se não fornecido
      const secret = webhookData.secret || crypto.randomBytes(32).toString('hex');

      // Criar webhook (simulado)
      const newWebhook = {
        id: crypto.randomUUID(),
        name: webhookData.name,
        url: webhookData.url,
        events: webhookData.events,
        secret,
        headers: webhookData.headers || {},
        timeout: webhookData.timeout || 10000,
        retry_policy: webhookData.retryPolicy || {
          maxRetries: 3,
          retryDelay: 1000,
          backoffMultiplier: 2
        },
        filters: webhookData.filters || {},
        enabled: webhookData.enabled,
        metadata: webhookData.metadata || {},
        created_by: user.id,
        created_at: new Date().toISOString()
      };
      const createError = null;

      if (createError) {
        console.error('Erro ao criar webhook:', createError);
        return NextResponse.json(
          { error: 'Erro ao criar webhook' },
          { status: 500 }
        );
      }

      // Log da criação
      // await logSecurityEvent({
      //   action: 'WEBHOOK_CREATED',
      //   details: `Webhook criado: ${webhookData.name}`,
      //   severity: 'low',
      //   userId: user.id,
      //   metadata: {
      //     webhookId: newWebhook.id,
      //     webhookName: webhookData.name,
      //     url: webhookData.url,
      //     events: webhookData.events
      //   }
      // });

      return NextResponse.json({
        id: newWebhook.id,
        message: 'Webhook criado com sucesso',
        webhook: {
          ...newWebhook,
          secret: '***' // Não retornar o secret completo
        }
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Erro na API de webhooks (POST):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar webhook
async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'update_webhooks');

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID do webhook é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o webhook existe (simulado)
    const existingWebhook = {
      id,
      name: 'Webhook Existente',
      url: 'https://example.com/webhook',
      secret: 'webhook_secret_existing',
      created_at: new Date().toISOString()
    };
    const fetchError = null;

    if (fetchError || !existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook não encontrado' },
        { status: 404 }
      );
    }

    // Validar dados de atualização
    const validationResult = webhookSchema.partial().safeParse(updateData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos para atualização',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Validar URL se foi alterada
    if (validatedData.url && validatedData.url !== existingWebhook.url) {
      const isValidUrl = await validateWebhookUrl(validatedData.url);
      if (!isValidUrl) {
        return NextResponse.json(
          { error: 'URL do webhook inválida ou inacessível' },
          { status: 400 }
        );
      }
    }

    // Verificar conflito de nome (simulado)
    if (validatedData.name && validatedData.name !== existingWebhook.name) {
      const nameConflict = null; // Simulado: não há conflito

      if (nameConflict) {
        return NextResponse.json(
          { error: 'Já existe um webhook com este nome' },
          { status: 409 }
        );
      }
    }

    // Atualizar webhook (simulado)
    const updatedWebhook = {
      ...existingWebhook,
      ...validatedData,
      updated_at: new Date().toISOString()
    };
    const updateError = null;

    if (updateError) {
      console.error('Erro ao atualizar webhook:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar webhook' },
        { status: 500 }
      );
    }

    // Log da atualização
    // await logSecurityEvent({
    //   action: 'WEBHOOK_UPDATED',
    //   details: `Webhook atualizado: ${updatedWebhook.name}`,
    //   severity: 'low',
    //   userId: user.id,
    //   metadata: {
    //     webhookId: id,
    //     webhookName: updatedWebhook.name,
    //     updatedFields: Object.keys(validatedData)
    //   }
    // });

    return NextResponse.json({
      message: 'Webhook atualizado com sucesso',
      webhook: {
        ...updatedWebhook,
        secret: updatedWebhook.secret ? '***' : null
      }
    });

  } catch (error) {
    console.error('Erro na API de webhooks (PUT):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Deletar webhook
async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'delete_webhooks');

    if (!hasPermission) {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_WEBHOOK_DELETE',
      //   details: `Tentativa não autorizada de deletar webhook`,
      //   severity: 'high',
      //   userId: user?.id,
      //   metadata: { endpoint: '/api/notifications/webhooks', method: 'DELETE' }
      // });

      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID do webhook é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se o webhook existe (simulado)
    const webhook = {
      id,
      name: 'Webhook para Deletar',
      url: 'https://example.com/webhook',
      secret: 'webhook_secret_delete',
      created_at: new Date().toISOString()
    };
    const fetchError = null;

    if (fetchError || !webhook) {
      return NextResponse.json(
        { error: 'Webhook não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se há logs de entrega recentes (simulado)
    const recentLogs = []; // Simulado: sem logs recentes
    const logsError = null;

    if (logsError) {
      console.error('Erro ao verificar logs do webhook:', logsError);
    }

    // Deletar webhook (simulado)
    const deleteError = null;

    if (deleteError) {
      console.error('Erro ao deletar webhook:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao deletar webhook' },
        { status: 500 }
      );
    }

    // Log da deleção
    // await logSecurityEvent({
    //   action: 'WEBHOOK_DELETED',
    //   details: `Webhook deletado: ${webhook.name}`,
    //   severity: 'medium',
    //   userId: user.id,
    //   metadata: {
    //     webhookId: id,
    //     webhookName: webhook.name,
    //     url: webhook.url,
    //     recentLogsCount: recentLogs?.length || 0
    //   }
    // });

    return NextResponse.json({
      message: 'Webhook deletado com sucesso',
      deletedWebhook: {
        id: webhook.id,
        name: webhook.name,
        recentLogsCount: recentLogs?.length || 0
      }
    });

  } catch (error) {
    console.error('Erro na API de webhooks (DELETE):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Exportar funções com middleware unificado
const GET_WITH_MIDDLEWARE = withUnifiedMiddleware(GET, {
  enablePayloadScan: false,
  enableIPBlocking: true,
  enableUserBlocking: true
});

const POST_WITH_MIDDLEWARE = withUnifiedMiddleware(POST, {
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true
});

const PUT_WITH_MIDDLEWARE = withUnifiedMiddleware(PUT, {
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true
});

const DELETE_WITH_MIDDLEWARE = withUnifiedMiddleware(DELETE, {
  enablePayloadScan: false,
  enableIPBlocking: true,
  enableUserBlocking: true
});

export { GET_WITH_MIDDLEWARE as GET, POST_WITH_MIDDLEWARE as POST, PUT_WITH_MIDDLEWARE as PUT, DELETE_WITH_MIDDLEWARE as DELETE };
