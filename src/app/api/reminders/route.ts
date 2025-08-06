// @/app/api/reminders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ReminderService } from "@/services/reminder.service";
import { LoggerService } from "@/services/logger.service";
import { createApiSupabaseClient } from "@/lib/supabase-api";
import { getUserPermissions } from "@/lib/auth-utils";

/**
 * GET /api/reminders
 * Retorna o status do serviço de lembretes
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar permissões do usuário
    const permissions = await getUserPermissions();
    if (!permissions.canManageSystem) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão de administrador necessária." },
        { status: 403 }
      );
    }

    const status = ReminderService.getStatus();
    
    // Buscar estatísticas de clientes próximos ao vencimento
    const supabase = await createApiSupabaseClient();
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    
    const { data: expiringClients, error } = await supabase
      .from('clients')
      .select('id, name, expiration_date')
      .eq('status', 'Ativo')
      .lte('expiration_date', threeDaysFromNow.toISOString())
      .gte('expiration_date', now.toISOString())
      .order('expiration_date', { ascending: true });

    const { data: expiredClients, error: expiredError } = await supabase
      .from('clients')
      .select('id, name, expiration_date')
      .eq('status', 'Ativo')
      .lt('expiration_date', now.toISOString());

    return NextResponse.json({
      service: status,
      statistics: {
        expiringClients: expiringClients?.length || 0,
        expiredClients: expiredClients?.length || 0,
        expiringClientsList: expiringClients || [],
        expiredClientsList: expiredClients || []
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao obter status dos lembretes:', error);
    LoggerService.error('Erro ao obter status dos lembretes', 'RemindersAPI', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reminders
 * Controla o serviço de lembretes (start, stop, check)
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar permissões do usuário
    const permissions = await getUserPermissions();
    if (!permissions.canManageSystem) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão de administrador necessária." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'start':
        ReminderService.startReminderService();
        LoggerService.info('Serviço de lembretes iniciado manualmente', 'RemindersAPI', {
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          success: true,
          message: 'Serviço de lembretes iniciado',
          status: ReminderService.getStatus()
        });

      case 'stop':
        ReminderService.stopReminderService();
        LoggerService.info('Serviço de lembretes parado manualmente', 'RemindersAPI', {
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          success: true,
          message: 'Serviço de lembretes parado',
          status: ReminderService.getStatus()
        });

      case 'check':
        await ReminderService.runManualCheck();
        LoggerService.info('Verificação manual de lembretes executada', 'RemindersAPI', {
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          success: true,
          message: 'Verificação manual executada com sucesso'
        });

      case 'check-expired':
        await ReminderService.checkExpiredClients();
        LoggerService.info('Verificação manual de clientes vencidos executada', 'RemindersAPI', {
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          success: true,
          message: 'Verificação de clientes vencidos executada com sucesso'
        });

      default:
        return NextResponse.json(
          { error: "Ação inválida. Use: start, stop, check ou check-expired" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Erro ao controlar serviço de lembretes:', error);
    LoggerService.error('Erro ao controlar serviço de lembretes', 'RemindersAPI', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/reminders
 * Envia lembrete manual para um cliente específico
 */
export async function PUT(request: NextRequest) {
  try {
    // Verificar permissões do usuário
    const permissions = await getUserPermissions();
    if (!permissions.canSendNotifications) {
      return NextResponse.json(
        { error: "Acesso negado. Permissão para enviar notificações necessária." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clientId, type = 'normal' } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "ID do cliente é obrigatório" },
        { status: 400 }
      );
    }

    // Buscar dados do cliente
    const supabase = await createApiSupabaseClient();
    const { data: clientData, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error || !clientData) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    if (!clientData.email && !clientData.whatsapp) {
      return NextResponse.json(
        { error: "Cliente não possui email ou WhatsApp cadastrado" },
        { status: 400 }
      );
    }

    // Calcular dias até o vencimento
    const now = new Date();
    const expirationDate = new Date(clientData.expiration_date);
    const daysUntilExpiration = Math.ceil((expirationDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    // Importar MessageQueueService dinamicamente para evitar problemas de importação circular
    const { MessageQueueService } = await import('@/services/message-queue.service');
    
    await MessageQueueService.addExpirationReminder({
      clientId: clientData.id,
      clientName: clientData.name,
      email: clientData.email,
      whatsapp: clientData.whatsapp,
      expirationDate: clientData.expiration_date,
      daysUntilExpiration,
      isUrgent: type === 'urgent' || daysUntilExpiration <= 1
    });

    LoggerService.info('Lembrete manual enviado', 'RemindersAPI', {
      clientId: clientData.id,
      clientName: clientData.name,
      type,
      daysUntilExpiration,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Lembrete ${type} enviado para ${clientData.name}`,
      details: {
        clientName: clientData.name,
        daysUntilExpiration,
        expirationDate: clientData.expiration_date
      }
    });

  } catch (error) {
    console.error('Erro ao enviar lembrete manual:', error);
    LoggerService.error('Erro ao enviar lembrete manual', 'RemindersAPI', {
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
    
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}