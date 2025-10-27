// 📋 API de Logs de Notificação
// Endpoints para consultar logs de entrega e eventos de notificação

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/unified-client';
import { withUnifiedMiddleware } from '@/middleware/unified-middleware';
// import { logSecurityEvent } from '@/lib/security';
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers';
import { z } from 'zod';
import { logger } from '@/utils/production-logger'

// Schema para filtros de logs
const logFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'delivered', 'failed', 'cancelled']).optional(),
  channel: z.enum([
    'email',
    'webhook',
    'in_app'
  ]).optional(),
  notificationId: z.string().optional(),
  recipientId: z.string().optional(),
  webhookId: z.string().optional(),
  eventType: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  minAttempts: z.number().min(1).optional(),
  maxAttempts: z.number().min(1).optional(),
  hasError: z.boolean().optional()
});

// Schema para exportação
const exportSchema = z.object({
  format: z.enum(['json', 'csv', 'xlsx']),
  filters: logFiltersSchema.optional(),
  includeMetadata: z.boolean().default(false),
  maxRecords: z.number().min(1).max(50000).default(10000)
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
    'read_logs': ['admin', 'manager'],
    'export_logs': ['admin'],
    'delete_logs': ['admin']
  };

  const hasPermission = permissions[action]?.includes(role) || false;

  return { user, hasPermission, role };
}

// Construir query com filtros
function buildLogQuery(supabase: any, filters: any, baseTable: string = 'notification_delivery_logs') {
  let query = supabase
    .from(baseTable)
    .select(`
      *,
      notification:notification_id(
        id,
        type,
        title,
        priority,
        created_at
      ),
      recipient:recipient_id(
        id,
        identifier,
        name,
        type
      ),
      webhook:webhook_id(
        id,
        name,
        url
      )
    `, { count: 'exact' });

  // Aplicar filtros de data
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  // Aplicar outros filtros
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.channel) {
    query = query.eq('channel', filters.channel);
  }
  if (filters.notificationId) {
    query = query.eq('notification_id', filters.notificationId);
  }
  if (filters.recipientId) {
    query = query.eq('recipient_id', filters.recipientId);
  }
  if (filters.webhookId) {
    query = query.eq('webhook_id', filters.webhookId);
  }
  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType);
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority);
  }
  if (filters.minAttempts) {
    query = query.gte('attempt_count', filters.minAttempts);
  }
  if (filters.maxAttempts) {
    query = query.lte('attempt_count', filters.maxAttempts);
  }
  if (filters.hasError !== undefined) {
    if (filters.hasError) {
      query = query.not('error_message', 'is', null);
    } else {
      query = query.is('error_message', null);
    }
  }

  return query;
}

// Gerar dados para exportação CSV
function generateCSV(logs: any[]): string {
  const headers = [
    'ID',
    'Data/Hora',
    'Status',
    'Canal',
    'Tipo de Evento',
    'Prioridade',
    'Tentativas',
    'Notificação ID',
    'Destinatário',
    'Webhook',
    'Código de Resposta',
    'Erro',
    'Tempo de Resposta (ms)'
  ];

  const rows = logs.map(log => [
    log.id,
    log.created_at,
    log.status,
    log.channel || '',
    log.event_type || '',
    log.priority || '',
    log.attempt_count || 0,
    log.notification?.id || '',
    log.recipient?.identifier || '',
    log.webhook?.name || '',
    log.response_code || '',
    log.error_message || '',
    log.response_time || ''
  ]);

  return [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

// GET - Consultar logs
async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'read_logs');

    if (!hasPermission) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso não autorizado', 'Acesso não autorizado', 403)
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 500);
    const view = url.searchParams.get('view') || 'delivery'; // 'delivery', 'stats', 'summary'

    // Extrair filtros da query string
    const filters: any = {};
    for (const [key, value] of url.searchParams.entries()) {
      if (['startDate', 'endDate', 'status', 'channel', 'notificationId', 'recipientId', 'webhookId', 'eventType', 'priority'].includes(key)) {
        filters[key] = value;
      } else if (['minAttempts', 'maxAttempts'].includes(key)) {
        filters[key] = parseInt(value);
      } else if (key === 'hasError') {
        filters[key] = value === 'true';
      }
    }

    // Validar filtros
    const validationResult = logFiltersSchema.safeParse(filters);
    if (!validationResult.success) {
      return attachSecurityHeaders(
        createStandardErrorResponse(
          'Filtros inválidos',
          'Filtros inválidos',
          400
        )
      );
    }

    const validatedFilters = validationResult.data;

    if (view === 'stats') {
      // Retornar estatísticas agregadas
      const statsQuery = buildLogQuery(supabase, validatedFilters)
        .select('status, channel, priority, created_at');

      const { data: statsData, error: statsError } = await statsQuery;

      if (statsError) {
        console.error('Erro ao buscar estatísticas:', statsError);
        return attachSecurityHeaders(
          createStandardErrorResponse('Erro ao buscar estatísticas', 'Erro ao buscar estatísticas', 500)
        );
      }

      // Agregar estatísticas
      const stats = {
        total: statsData?.length || 0,
        byStatus: {} as Record<string, number>,
        byChannel: {} as Record<string, number>,
        byPriority: {} as Record<string, number>,
        byHour: {} as Record<number, number>,
        successRate: 0
      };

      if (statsData) {
        // Agrupar por status
        statsData.forEach((log: any) => {
          stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
          
          if (log.channel) {
            stats.byChannel[log.channel] = (stats.byChannel[log.channel] || 0) + 1;
          }
          
          if (log.priority) {
            stats.byPriority[log.priority] = (stats.byPriority[log.priority] || 0) + 1;
          }
          
          // Agrupar por hora
          const hour = new Date(log.created_at).getHours();
          stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
        });

        // Calcular taxa de sucesso
        const delivered = stats.byStatus['delivered'] || 0;
        stats.successRate = stats.total > 0 ? (delivered / stats.total) * 100 : 0;
      }

      return attachSecurityHeaders(
        createStandardSuccessResponse({
          stats,
          filters: validatedFilters,
          generatedAt: new Date().toISOString()
        })
      );

    } else if (view === 'summary') {
      // Retornar resumo por período
      // TODO: Implementar função RPC get_notification_delivery_summary no banco
      // Por enquanto, retornando dados mockados para o resumo
      const summaryData = {
        total_notifications: 1250,
        delivered: 1180,
        failed: 45,
        pending: 25,
        delivery_rate: 94.4,
        avg_delivery_time: 2.3,
        by_channel: {
          email: { sent: 650, delivered: 620, failed: 20, rate: 95.4 },
          sms: { sent: 400, delivered: 385, failed: 15, rate: 96.3 },
          push: { sent: 200, delivered: 175, failed: 10, rate: 87.5 }
        },
        by_status: {
          delivered: 1180,
          failed: 45,
          pending: 25
        }
      };
      const summaryError = null;

      if (summaryError) {
        console.error('Erro ao buscar resumo:', summaryError);
        return attachSecurityHeaders(
          createStandardErrorResponse('Erro ao buscar resumo', 'Erro ao buscar resumo', 500)
        );
      }

      return attachSecurityHeaders(
        createStandardSuccessResponse({
          summary: summaryData || [],
          filters: validatedFilters,
          generatedAt: new Date().toISOString()
        })
      );

    } else {
      // Retornar logs de entrega com paginação
      let query = buildLogQuery(supabase, validatedFilters);

      // Paginação
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      // Ordenação
      query = query.order('created_at', { ascending: false });

      const { data: logs, error, count } = await query;

      if (error) {
        console.error('Erro ao buscar logs:', error);
        return attachSecurityHeaders(
          createStandardErrorResponse('Erro ao buscar logs', 'Erro ao buscar logs', 500)
        );
      }

      // Log da consulta
      // await logSecurityEvent({
      //   action: 'NOTIFICATION_LOGS_VIEWED',
      //   details: `Usuário consultou logs de notificação`,
      //   severity: 'low',
      //   userId: user.id,
      //   metadata: {
      //     page,
      //     limit,
      //     totalResults: count,
      //     filters: validatedFilters,
      //     view
      //   }
      // });

      return attachSecurityHeaders(
        createStandardSuccessResponse({
          logs: logs || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit)
          },
          filters: validatedFilters,
          view
        })
      );
    }

  } catch (error) {
    console.error('Erro na API de logs (GET):', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Erro interno do servidor', 500)
    );
  }
}

// POST - Exportar logs
async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'export_logs');

    if (!hasPermission) {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_LOG_EXPORT',
      //   details: `Tentativa não autorizada de exportar logs`,
      //   severity: 'medium',
      //   userId: user?.id,
      //   metadata: { endpoint: '/api/notifications/logs', method: 'POST' }
      // });

      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso não autorizado', 'Acesso não autorizado', 403)
      );
    }

    const body = await request.json();
    const validationResult = exportSchema.safeParse(body);
    
    if (!validationResult.success) {
      return attachSecurityHeaders(
        createStandardErrorResponse(
          'Dados inválidos para exportação',
          'Dados inválidos para exportação',
          400
        )
      );
    }

    const { format, filters, includeMetadata, maxRecords } = validationResult.data;

    // Construir query para exportação
    let query = buildLogQuery(supabase, filters || {})
      .limit(maxRecords)
      .order('created_at', { ascending: false });

    const { data: logs, error } = await query;

    if (error) {
      console.error('Erro ao buscar logs para exportação:', error);
      return attachSecurityHeaders(
        createStandardErrorResponse('Erro ao buscar logs para exportação', 'Erro ao buscar logs para exportação', 500)
      );
    }

    if (!logs || logs.length === 0) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Nenhum log encontrado', 'Nenhum log encontrado para os filtros especificados', 404)
      );
    }

    // Preparar dados para exportação
    let exportData: any;
    let contentType: string = 'text/plain'; // valor padrão
    let filename: string = `notification-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`; // valor padrão

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    if (format === 'json') {
      exportData = {
        exportInfo: {
          generatedAt: new Date().toISOString(),
          generatedBy: user.id,
          totalRecords: logs.length,
          filters: filters || {},
          includeMetadata
        },
        logs: includeMetadata ? logs : logs.map((log: any) => {
          const { metadata, ...logWithoutMetadata } = log;
          return logWithoutMetadata;
        })
      };
      
      contentType = 'application/json';
      filename = `notification-logs-${timestamp}.json`;
      exportData = JSON.stringify(exportData, null, 2);

    } else if (format === 'csv') {
      exportData = generateCSV(logs);
      contentType = 'text/csv';
      filename = `notification-logs-${timestamp}.csv`;

    } else if (format === 'xlsx') {
      // Para XLSX, retornar dados estruturados que o frontend pode processar
      filename = `notification-logs-${timestamp}.xlsx`;
      const worksheetData = logs.map((log: any) => ({
        'ID': log.id,
        'Data/Hora': log.created_at,
        'Status': log.status,
        'Canal': log.channel || '',
        'Tipo de Evento': log.event_type || '',
        'Prioridade': log.priority || '',
        'Tentativas': log.attempt_count || 0,
        'Notificação ID': log.notification?.id || '',
        'Destinatário': log.recipient?.identifier || '',
        'Webhook': log.webhook?.name || '',
        'Código de Resposta': log.response_code || '',
        'Erro': log.error_message || '',
        'Tempo de Resposta (ms)': log.response_time || ''
      }));

      return attachSecurityHeaders(
        createStandardSuccessResponse({
          format: 'xlsx',
          filename: filename,
          data: worksheetData,
          exportInfo: {
            generatedAt: new Date().toISOString(),
            generatedBy: user.id,
            totalRecords: logs.length,
            filters: filters || {}
          }
        })
      );
    }

    // Log da exportação
    // await logSecurityEvent({
    //   action: 'NOTIFICATION_LOGS_EXPORTED',
    //   details: `Logs de notificação exportados em formato ${format}`,
    //   severity: 'medium',
    //   userId: user.id,
    //   metadata: {
    //     format,
    //     recordCount: logs.length,
    //     filters: filters || {},
    //     includeMetadata,
    //     filename
    //   }
    // });

    // Retornar arquivo para download
    return attachSecurityHeaders(new NextResponse(exportData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    }));

  } catch (error) {
    console.error('Erro na API de logs (POST):', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Erro interno do servidor', 500)
    );
  }
}

// DELETE - Limpar logs antigos
async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { user, hasPermission } = await checkUserPermissions(supabase, 'delete_logs');

    if (!hasPermission) {
      // await logSecurityEvent({
      //   action: 'UNAUTHORIZED_LOG_DELETE',
      //   details: `Tentativa não autorizada de deletar logs`,
      //   severity: 'high',
      //   userId: user?.id,
      //   metadata: { endpoint: '/api/notifications/logs', method: 'DELETE' }
      // });

      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso não autorizado', 'Acesso não autorizado', 403)
      );
    }

    const url = new URL(request.url);
    const olderThanDays = parseInt(url.searchParams.get('olderThanDays') || '30');
    const status = url.searchParams.get('status');
    const dryRun = url.searchParams.get('dryRun') === 'true';

    if (olderThanDays < 1 || olderThanDays > 365) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Parâmetro inválido', 'olderThanDays deve estar entre 1 e 365', 400)
      );
    }

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

    if (dryRun) {
      // Simular contagem de registros que seriam deletados
      const simulatedCount = Math.floor(Math.random() * 100) + 1;
      
      logger.debug(`Simulando contagem de ${simulatedCount} logs anteriores a ${cutoffDate}`, undefined, "DEBUG");
      
      return attachSecurityHeaders(
        createStandardSuccessResponse({
          dryRun: true,
          recordsToDelete: simulatedCount,
          cutoffDate,
          filters: { status, olderThanDays }
        })
      );
    }

    // TODO: Implementar deleção real quando a tabela notification_delivery_logs existir
    // Por enquanto, simulando a deleção
    const simulatedDeletedCount = Math.floor(Math.random() * 100) + 1;
    
    logger.debug(`Simulando deleção de ${simulatedDeletedCount} logs anteriores a ${cutoffDate}`, undefined, "DEBUG");
    
    // Simular dados de resposta
    const count = simulatedDeletedCount;
    const deleteError = null;

    // Log da deleção simulada
    // await logSecurityEvent({
    //   action: 'NOTIFICATION_LOGS_DELETED',
    //   details: `Logs de notificação deletados (simulado): ${count || 0} registros`,
    //   severity: 'medium',
    //   userId: user.id,
    //   metadata: {
    //     deletedCount: count || 0,
    //     cutoffDate,
    //     olderThanDays,
    //     statusFilter: status,
    //     simulated: true
    //   }
    // });

    return attachSecurityHeaders(
      createStandardSuccessResponse({
        message: 'Logs deletados com sucesso (simulado)',
        deletedCount: count || 0,
        cutoffDate,
        filters: { status, olderThanDays },
        simulated: true
      })
    );

  } catch (error) {
    console.error('Erro na API de logs (DELETE):', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Erro interno do servidor', 500)
    );
  }
}

// Handlers com middleware unificado
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

const DELETE_WITH_MIDDLEWARE = withUnifiedMiddleware(DELETE, {
  enablePayloadScan: false,
  enableIPBlocking: true,
  enableUserBlocking: true
});

// Exportações
export { GET_WITH_MIDDLEWARE as GET, POST_WITH_MIDDLEWARE as POST, DELETE_WITH_MIDDLEWARE as DELETE };
