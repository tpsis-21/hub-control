// 📊 API de Monitoramento de Créditos
// Endpoints para gerenciar monitoramento e alertas de créditos baixos

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createStandardErrorResponse, createStandardSuccessResponse } from '@/middleware/shared/helpers';
import { z } from 'zod';

// Schema para configuração de alertas
const creditAlertSchema = z.object({
  serverId: z.string().uuid(),
  warningThreshold: z.number().min(0).max(100),
  criticalThreshold: z.number().min(0).max(100),
  notificationEnabled: z.boolean(),
  notificationChannels: z.array(z.enum(['email', 'webhook', 'in_app'])).optional()
});

// Schema para filtros de relatório
const reportFiltersSchema = z.object({
  serverId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  alertType: z.enum(['warning', 'critical']).optional(),
  status: z.enum(['active', 'resolved', 'ignored']).optional()
});

// Função para verificar se o usuário é admin
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Admin principal é sempre admin
    if (userId === '2f67bed8-9448-446f-8f38-9306f773620d') {
      return true;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    return profile?.role === 'admin';
  } catch (error) {
    console.error('Erro ao verificar admin:', error);
    return false;
  }
}

// GET - Buscar status de créditos e alertas
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action'); // 'status', 'alerts', 'history'
    const serverId = searchParams.get('serverId');

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createStandardErrorResponse('Não autorizado', 401);
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return createStandardErrorResponse('Acesso negado', 403);
    }

    if (action === 'status') {
      // Buscar status atual de créditos dos servidores
      let query = supabase
        .from('servers')
        .select(`
          id,
          name,
          credit_monitoring_enabled,
          credit_warning_threshold,
          credit_critical_threshold,
          credit_notification_enabled
        `)
        .eq('credit_monitoring_enabled', true);

      if (serverId) {
        query = query.eq('id', serverId);
      }

      const { data: servers, error } = await query;
      if (error) {
        return createStandardErrorResponse('Erro ao buscar status de créditos', 500);
      }

      // Para cada servidor, simular verificação de créditos
      // Em uma implementação real, isso consultaria a API do servidor
      const serversWithStatus = servers?.map(server => ({
        ...server,
        currentCredits: Math.floor(Math.random() * 100), // Simulado
        lastCheck: new Date().toISOString(),
        alertStatus: 'normal' // 'normal', 'warning', 'critical'
      })) || [];

      return createStandardSuccessResponse(serversWithStatus);
    }

    if (action === 'alerts') {
      // Buscar alertas ativos
      let query = supabase
        .from('server_credit_notifications')
        .select(`
          *,
          servers!inner(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (serverId) {
        query = query.eq('server_id', serverId);
      }

      const { data: alerts, error } = await query;
      if (error) {
        return createStandardErrorResponse('Erro ao buscar alertas', 500);
      }

      return createStandardSuccessResponse(alerts);
    }

    if (action === 'history') {
      // Buscar histórico de notificações
      const filters = reportFiltersSchema.parse(Object.fromEntries(searchParams));
      
      let query = supabase
        .from('server_credit_notifications')
        .select(`
          *,
          servers!inner(id, name)
        `)
        .order('created_at', { ascending: false });

      if (filters.serverId) {
        query = query.eq('server_id', filters.serverId);
      }

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }

      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }

      if (filters.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data: history, error } = await query.limit(100);
      if (error) {
        return createStandardErrorResponse('Erro ao buscar histórico', 500);
      }

      return createStandardSuccessResponse(history);
    }

    return createStandardErrorResponse('Ação inválida. Use "status", "alerts" ou "history"', 400);
  } catch (error) {
    console.error('Erro na API de monitoramento de créditos:', error);
    return createStandardErrorResponse('Erro interno do servidor', 500);
  }
}

// PUT - Atualizar configurações de alerta
export async function PUT(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createStandardErrorResponse('Não autorizado', 401);
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return createStandardErrorResponse('Acesso negado', 403);
    }

    // Validar dados
    const validatedData = creditAlertSchema.parse(body);
    
    // Validar que o threshold crítico é menor que o de warning
    if (validatedData.criticalThreshold >= validatedData.warningThreshold) {
      return createStandardErrorResponse(
        'O threshold crítico deve ser menor que o threshold de aviso',
        400
      );
    }

    const { data, error } = await supabase
      .from('servers')
      .update({
        credit_monitoring_enabled: true,
        credit_warning_threshold: validatedData.warningThreshold,
        credit_critical_threshold: validatedData.criticalThreshold,
        credit_notification_enabled: validatedData.notificationEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.serverId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar configurações de alerta:', error);
      return createStandardErrorResponse('Erro ao atualizar configurações de alerta', 500);
    }

    return createStandardSuccessResponse(data, 'Configurações de alerta atualizadas com sucesso');
  } catch (error) {
    if (error instanceof z.ZodError) {
      return createStandardErrorResponse(
        'Dados inválidos: ' + error.errors.map(e => e.message).join(', '),
        400
      );
    }
    console.error('Erro na API de monitoramento de créditos:', error);
    return createStandardErrorResponse('Erro interno do servidor', 500);
  }
}

// POST - Executar verificação manual de créditos
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const body = await request.json();
    const { serverId, forceCheck } = body;

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createStandardErrorResponse('Não autorizado', 401);
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return createStandardErrorResponse('Acesso negado', 403);
    }

    // Buscar configurações do servidor
    const { data: server, error: serverError } = await supabase
      .from('servers')
      .select(`
        id,
        name,
        credit_monitoring_enabled,
        credit_warning_threshold,
        credit_critical_threshold,
        credit_notification_enabled
      `)
      .eq('id', serverId)
      .single();

    if (serverError || !server) {
      return createStandardErrorResponse('Servidor não encontrado', 404);
    }

    if (!server.credit_monitoring_enabled) {
      return createStandardErrorResponse('Monitoramento de créditos não está habilitado para este servidor', 400);
    }

    // Simular verificação de créditos
    // Em uma implementação real, isso faria uma chamada para a API do servidor
    const currentCredits = Math.floor(Math.random() * 100);
    const checkResult = {
      serverId: server.id,
      serverName: server.name,
      currentCredits,
      warningThreshold: server.credit_warning_threshold,
      criticalThreshold: server.credit_critical_threshold,
      alertTriggered: false,
      alertType: null as string | null,
      checkTime: new Date().toISOString()
    };

    // Verificar se deve disparar alerta
    if (currentCredits <= server.credit_critical_threshold) {
      checkResult.alertTriggered = true;
      checkResult.alertType = 'critical';
    } else if (currentCredits <= server.credit_warning_threshold) {
      checkResult.alertTriggered = true;
      checkResult.alertType = 'warning';
    }

    // Se alerta foi disparado e notificações estão habilitadas, registrar
    if (checkResult.alertTriggered && server.credit_notification_enabled) {
      const { error: notificationError } = await supabase
        .from('server_credit_notifications')
        .insert({
          server_id: serverId,
          alert_type: checkResult.alertType,
          credit_level: currentCredits,
          threshold_value: checkResult.alertType === 'critical' 
            ? server.credit_critical_threshold 
            : server.credit_warning_threshold,
          message: `Créditos baixos detectados: ${currentCredits}% (threshold: ${checkResult.alertType === 'critical' 
            ? server.credit_critical_threshold 
            : server.credit_warning_threshold}%)`,
          status: 'active',
          notification_sent: false
        });

      if (notificationError) {
        console.error('Erro ao registrar notificação:', notificationError);
      }
    }

    return createStandardSuccessResponse(checkResult, 'Verificação de créditos executada com sucesso');
  } catch (error) {
    console.error('Erro na verificação de créditos:', error);
    return createStandardErrorResponse('Erro interno do servidor', 500);
  }
}

// DELETE - Marcar alerta como resolvido
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alertId');

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createStandardErrorResponse('Não autorizado', 401);
    }

    // Verificar se é admin
    const isAdmin = await isUserAdmin(user.id);
    if (!isAdmin) {
      return createStandardErrorResponse('Acesso negado', 403);
    }

    if (!alertId) {
      return createStandardErrorResponse('ID do alerta é obrigatório', 400);
    }

    const { data, error } = await supabase
      .from('server_credit_notifications')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao resolver alerta:', error);
      return createStandardErrorResponse('Erro ao resolver alerta', 500);
    }

    return createStandardSuccessResponse(data, 'Alerta marcado como resolvido');
  } catch (error) {
    console.error('Erro ao resolver alerta:', error);
    return createStandardErrorResponse('Erro interno do servidor', 500);
  }
}

// OPTIONS - CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}