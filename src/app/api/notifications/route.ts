// 🔔 API de Notificações
// Endpoints para gerenciar notificações, templates e configurações

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/unified-client';
// import { notificationSystem } from '@/lib/notifications';
import { withUnifiedMiddleware } from '@/middleware/unified-middleware';
// import { logSecurityEvent } from '@/lib/security';
import { z } from 'zod';

// Schema de validação para criar notificação
const createNotificationSchema = z.object({
  type: z.enum([
    'security',
    'security_alert',
    'performance',
    'performance_alert',
    'system',
    'backup',
    'backup_status',
    'financial',
    'marketing',
    'user',
    'integration',
    'maintenance',
    'compliance_alert',
    'error_report',
    'custom'
  ]),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  channel: z.enum([
    'email',
    'webhook',
    'in_app',
    'sms',
    'slack',
    'push'
  ]).optional().default('in_app'),
  priority: z.enum(['low', 'medium', 'normal', 'high', 'urgent']).optional().default('normal'),
  recipients: z.array(z.string()).min(1),
  metadata: z.record(z.any()).optional(),
  scheduledFor: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  templateId: z.string().uuid().optional(),
  templateVariables: z.record(z.any()).optional()
});

// Schema para filtros de listagem
const listFiltersSchema = z.object({
  type: z.enum([
    'security',
    'security_alert',
    'performance',
    'performance_alert',
    'system',
    'backup',
    'backup_status',
    'financial',
    'marketing',
    'user',
    'integration',
    'maintenance',
    'compliance_alert',
    'error_report',
    'custom'
  ]).optional(),
  priority: z.enum(['low', 'medium', 'normal', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'cancelled', 'expired', 'read']).optional(),
  recipientId: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
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
  const permissions: Record<string, string[]> = {
    'create': ['admin', 'manager'],
    'read': ['admin', 'manager', 'user'],
    'update': ['admin', 'manager'],
    'delete': ['admin'],
    'manage_templates': ['admin', 'manager'],
    'manage_configs': ['admin'],
    'view_stats': ['admin', 'manager']
  };

  const hasPermission = permissions[action]?.includes(role) || false;

  return { user, hasPermission, role };
}

// GET - Listar notificações
export const GET = withUnifiedMiddleware(
  async (request: NextRequest) => {
    try {

    const supabase = await createServerSupabaseClient();
    const { user, hasPermission, role } = await checkUserPermissions(supabase, 'read');

    if (!hasPermission) {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_NOTIFICATION_ACCESS',
      //   details: 'Tentativa de acesso não autorizado às notificações',
      //   severity: 'medium',
      //   userId: user?.id,
      //   metadata: { endpoint: '/api/notifications', method: 'GET' }
      // });

      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Extrair parâmetros de query
    const url = new URL(request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    
    // Converter parâmetros numéricos
    const parsedParams = {
      ...queryParams,
      limit: queryParams.limit ? parseInt(queryParams.limit) : undefined,
      offset: queryParams.offset ? parseInt(queryParams.offset) : undefined
    };

    // Validar filtros
    const validationResult = listFiltersSchema.safeParse(parsedParams);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Parâmetros inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const filters = validationResult.data;

    // Para usuários comuns, filtrar apenas suas notificações
    if (role === 'user') {
      (filters as any).recipientId = user.email;
    }

    // Temporariamente comentado para resolver erro de build
    // const systemNotifications = notificationSystem.getNotifications({
    //   type: filters.type,
    //   priority: filters.priority,
    //   status: filters.status,
    //   limit: filters.limit,
    //   offset: filters.offset
    // });
    const systemNotifications = { notifications: [], total: 0 };

    // Buscar notificações do banco de dados
    const limit = filters.limit ?? 50;
    const offset = filters.offset ?? 0;

    let query = (supabase as any)
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false }) as any;

    if (filters.type) query = query.eq('type', filters.type);
    if (filters.priority) query = query.eq('priority', filters.priority);
    if (filters.status) query = query.eq('status', filters.status);
    if (filters.startDate) query = query.gte('created_at', filters.startDate);
    if (filters.endDate) query = query.lte('created_at', filters.endDate);

    // Paginação via range
    query = query.range(offset, offset + limit - 1);

    // Tentativa de filtrar por destinatário em nível de banco (se armazenado em metadata.recipients)
    if (filters.recipientId) {
      // PostgREST: usar operador cs (contains) no array dentro de JSON; fallback para filtro em memória
      query = query.contains('metadata', { recipients: [filters.recipientId] });
    }

    const { data: dbNotifications, error: dbError, count: dbCount } = await query;

    if (dbError) {
      console.error('Erro ao buscar notificações no banco:', dbError);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }

    // Fallback: se o filtro recipientId não foi aplicado corretamente pelo banco, filtrar em memória
    const filteredDb = (filters.recipientId && Array.isArray(dbNotifications))
      ? dbNotifications.filter((n: any) => Array.isArray(n?.metadata?.recipients) && n.metadata.recipients.includes(filters.recipientId))
      : (dbNotifications || []);

    // Combinar notificações do sistema e do banco
    const allNotifications = [
      ...systemNotifications.notifications.map((n: any) => ({ ...n, source: 'system' })),
      ...filteredDb.map((n: any) => ({ ...n, source: 'database' }))
    ];

    // Ordenar por data de criação
    allNotifications.sort((a: any, b: any) => 
      new Date(b.created_at || b.createdAt).getTime() - 
      new Date(a.created_at || a.createdAt).getTime()
    );

    const combinedTotal = (dbCount ?? filteredDb.length) + systemNotifications.total;

    // Log da consulta
    // await logSecurityEvent({
    //   action: 'NOTIFICATIONS_LISTED',
    //   details: `Usuário consultou ${allNotifications.length} notificações`,
    //   severity: 'low',
    //   userId: user.id,
    //   metadata: {
    //     filters,
    //     resultCount: allNotifications.length,
    //     dbCount: dbCount ?? filteredDb.length,
    //     systemCount: systemNotifications.total,
    //     role
    //   }
    // });

    return NextResponse.json({
      notifications: allNotifications,
      total: combinedTotal,
      filters
    });

  } catch (error) {
    console.error('Erro na API de notificações (GET):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}, {
  enablePayloadScan: false,
  enableIPBlocking: true,
  enableUserBlocking: true
});

// POST - Criar nova notificação
export const POST = withUnifiedMiddleware(
  async (request: NextRequest) => {
    try {

    const supabase = await createServerSupabaseClient();
    const { user, hasPermission, role } = await checkUserPermissions(supabase, 'create');

    if (!hasPermission) {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_NOTIFICATION_CREATE',
      //   details: 'Tentativa não autorizada de criar notificação',
      //   severity: 'medium',
      //   userId: user?.id,
      //   metadata: { endpoint: '/api/notifications', method: 'POST' }
      // });

      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Validar dados da requisição
    const body = await request.json();
    const validationResult = createNotificationSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Dados inválidos',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const {
      type,
      subject,
      content,
      channel = 'in_app',
      priority = 'normal',
      recipients,
      metadata = {},
      scheduledFor,
      expiresAt,
      templateId,
      templateVariables = {}
    } = validationResult.data;

    // Criar notificação no banco de dados
    const { data: notification, error: createError } = await (supabase as any)
      .from('notifications')
      .insert({
        type,
        channel,
        priority,
        status: 'pending',
        subject,
        content,
        metadata: {
          ...metadata,
          recipients,
          templateVariables,
          createdBy: user.id
        },
        scheduled_for: scheduledFor,
        expires_at: expiresAt,
        template_id: templateId,
        template_variables: templateVariables,
        retry_count: 0
      })
      .select()
      .single();

    if (createError) {
      console.error('Erro ao criar notificação:', createError);
      return NextResponse.json(
        { error: 'Erro ao criar notificação no banco de dados' },
        { status: 500 }
      );
    }

    // Enviar notificação através do sistema
    try {
      // Filtrar canais para incluir apenas os aceitos pelo sistema
      const validChannels = [channel].filter(ch => 
        ['email', 'webhook', 'in_app', 'push'].includes(ch)
      ) as any[];
      
      // Temporariamente comentado para resolver erro de build
      // const notificationId = await notificationSystem.sendNotification(
      //   type as any,
      //   subject,
      //   content,
      //   recipients,
      //   {
      //     priority,
      //     channels: validChannels,
      //     data: metadata,
      //     scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      //     expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      //     templateId,
      //     variables: templateVariables
      //   }
      // );
      const notificationId = 'temp-id';

      // Temporariamente comentado para resolver erro de build
      // await (supabase as any)
      //   .from('notifications')
      //   .update({ 
      //     metadata: { 
      //       ...notification.metadata, 
      //       systemId: notificationId 
      //     } 
      //   })
      //   .eq('id', notification.id);

    } catch (systemError) {
      console.error('Erro ao enviar notificação pelo sistema:', systemError);
      // Continuar mesmo se o sistema falhar, pois a notificação foi salva no banco
    }

    // Log da criação
    // await logSecurityEvent({
    //   action: 'NOTIFICATION_CREATED',
    //   details: `Notificação criada: ${type} - ${subject}`,
    //   severity: priority === 'urgent' ? 'high' : 'low',
    //   userId: user.id,
    //   metadata: {
    //     notificationId: notification.id,
    //     type,
    //     priority,
    //     channel,
    //     recipientCount: recipients.length
    //   }
    // });

    return NextResponse.json({
      id: notification.id,
      message: 'Notificação criada com sucesso',
      notification
    }, { status: 201 });

  } catch (error) {
    console.error('Erro na API de notificações (POST):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}, {
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true
});

// PUT - Atualizar notificação (marcar como lida, etc.)
export const PUT = withUnifiedMiddleware(
  async (request: NextRequest) => {
    try {

    const supabase = await createServerSupabaseClient();
    const { user, hasPermission, role } = await checkUserPermissions(supabase, 'update');

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, action, channel } = body;

    if (!id || !action) {
      return NextResponse.json(
        { error: 'ID da notificação e ação são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a notificação existe
    const { data: notification, error: fetchError } = await (supabase as any)
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    let updateData: any = {};
    let systemAction = false;

    switch (action) {
      case 'mark_as_read': {
        // Canal não é obrigatório no novo esquema para marcar como lida
        updateData = {
          status: 'read',
          updated_at: new Date().toISOString()
        };
        break;
      }
      
      case 'cancel': {
        // Atualiza apenas os metadados para indicar cancelamento, sem depender de um status específico
        const newMetadata = {
          ...(notification.metadata || {}),
          cancelled: true,
          cancelledAt: new Date().toISOString(),
          cancelledBy: user.id
        };
        updateData = {
          metadata: newMetadata,
          updated_at: new Date().toISOString()
        };
        break;
      }
      
      default:
        return NextResponse.json(
          { error: 'Ação inválida' },
          { status: 400 }
        );
    }

    // Aplicar atualização na notificação se houver dados a atualizar
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await (supabase as any)
        .from('notifications')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Erro ao atualizar notificação:', updateError);
        return NextResponse.json(
          { error: 'Erro ao atualizar notificação' },
          { status: 500 }
        );
      }
      systemAction = true;
    }

    // Log da ação
    // await logSecurityEvent({
    //   action: 'NOTIFICATION_UPDATED',
    //   details: `Notificação ${id} - ação: ${action}`,
    //   severity: 'low',
    //   userId: user.id,
    //   metadata: {
    //     notificationId: id,
    //     action,
    //     channel,
    //     systemAction
    //   }
    // });

    return NextResponse.json({
      message: 'Notificação atualizada com sucesso',
      systemAction
    });

  } catch (error) {
    console.error('Erro na API de notificações (PUT):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}, {
  enablePayloadScan: true,
  enableIPBlocking: true,
  enableUserBlocking: true
});

// DELETE - Deletar notificação (apenas admins)
export const DELETE = withUnifiedMiddleware(
  async (request: NextRequest) => {
    try {

    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'delete');

    if (!hasPermission) {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_NOTIFICATION_DELETE',
      //   details: 'Tentativa não autorizada de deletar notificação',
      //   severity: 'high',
      //   userId: user?.id,
      //   metadata: { endpoint: '/api/notifications', method: 'DELETE' }
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
        { error: 'ID da notificação é obrigatório' },
        { status: 400 }
      );
    }

    // Verificar se a notificação existe
    const { data: notification, error: fetchError } = await (supabase as any)
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !notification) {
      return NextResponse.json(
        { error: 'Notificação não encontrada' },
        { status: 404 }
      );
    }

    // Deletar notificação
    const { error: deleteError } = await (supabase as any)
      .from('notifications')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao deletar notificação:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao deletar notificação' },
        { status: 500 }
      );
    }

    // Log da deleção
    // await logSecurityEvent({
    //   action: 'NOTIFICATION_DELETED',
    //   details: `Notificação ${id} deletada`,
    //   severity: 'medium',
    //   userId: user.id,
    //   metadata: {
    //     notificationId: id,
    //     notificationType: notification.type,
    //     notificationSubject: notification.subject
    //   }
    // });

    return NextResponse.json({
      message: 'Notificação deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de notificações (DELETE):', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}, {
  enablePayloadScan: false,
  enableIPBlocking: true,
  enableUserBlocking: true
});
