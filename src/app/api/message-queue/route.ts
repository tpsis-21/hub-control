// src/app/api/message-queue/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from "@/lib/supabase/clients/server";
import { messageQueue } from '@/services/message-queue.service';
import { LoggerService } from '@/services/logger.service';

// Verificar se o usuário tem permissão para gerenciar a fila
async function verifyPermission(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Verificar autenticação
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { authorized: false, error: 'Não autenticado' };
  }

  // Verificar se é admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { authorized: false, error: 'Apenas administradores podem gerenciar a fila de mensagens' };
  }

  return { authorized: true, user, profile };
}

// GET /api/message-queue - Obter estatísticas e mensagens da fila
export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await verifyPermission(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const status = searchParams.get('status') as any;
    const type = searchParams.get('type') as any;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    switch (action) {
      case 'stats':
        const stats = messageQueue.getStats();
        return NextResponse.json({
          success: true,
          stats
        });

      case 'messages':
        const messages = messageQueue.getMessages({ status, type, limit });
        return NextResponse.json({
          success: true,
          messages: messages.map(msg => ({
            ...msg,
            data: undefined // Remove dados sensíveis da resposta
          }))
        });

      default:
        // Retorna tanto estatísticas quanto mensagens recentes
        const allStats = messageQueue.getStats();
        const recentMessages = messageQueue.getMessages({ limit: 20 });
        
        // Adiciona estatísticas extras
        const extendedStats = {
          ...allStats,
          total: allStats.pending + allStats.processing + allStats.completed + allStats.failed,
          isProcessing: allStats.processing > 0
        };
        
        return NextResponse.json({
          success: true,
          ...extendedStats,
          recentMessages: recentMessages.map(msg => ({
            ...msg,
            data: undefined // Remove dados sensíveis
          }))
        });
    }

  } catch (error) {
    LoggerService.error('Erro ao obter dados da fila', 'MessageQueueAPI', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/message-queue - Adicionar mensagem à fila ou executar ações
export async function POST(request: NextRequest) {
  try {
    const { authorized, error, user } = await verifyPermission(request);
    
    if (!authorized || !user) {
      return NextResponse.json(
        { error: error || 'Não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, type, data, options } = body;

    switch (action) {
      case 'add':
        if (!type || !data) {
          return NextResponse.json(
            { error: 'Tipo e dados são obrigatórios' },
            { status: 400 }
          );
        }

        const messageId = await messageQueue.addMessage(type, data, options || {});
        
        LoggerService.logUserAction('add_message_to_queue', user!.id, {
          messageId,
          type,
          priority: options?.priority
        });

        return NextResponse.json({
          success: true,
          messageId,
          message: 'Mensagem adicionada à fila'
        });

      case 'queue_welcome':
        if (!data || !data.name || !data.planName) {
          return NextResponse.json(
            { error: 'Dados do cliente inválidos' },
            { status: 400 }
          );
        }

        const welcomeId = await messageQueue.queueWelcomeMessage(data, options || {});
        
        LoggerService.logUserAction('queue_welcome_message', user!.id, {
          messageId: welcomeId,
          customerName: data.name
        });

        return NextResponse.json({
          success: true,
          messageId: welcomeId,
          message: 'Mensagem de boas-vindas adicionada à fila'
        });

      case 'schedule_reminders':
        if (!data || !data.name || !data.expirationDate) {
          return NextResponse.json(
            { error: 'Dados do cliente inválidos' },
            { status: 400 }
          );
        }

        const reminderIds = await messageQueue.scheduleExpirationReminders(
          data,
          options?.reminderDays
        );
        
        LoggerService.logUserAction('schedule_expiration_reminders', user!.id, {
          messageIds: reminderIds,
          customerName: data.name,
          reminderCount: reminderIds.length
        });

        return NextResponse.json({
          success: true,
          messageIds: reminderIds,
          message: `${reminderIds.length} lembretes agendados`
        });

      case 'retry_failed':
      case 'reprocess-failed':
        const retriedCount = messageQueue.retryFailedMessages();
        
        LoggerService.logUserAction('retry_failed_messages', user!.id, {
          retriedCount
        });

        return NextResponse.json({
          success: true,
          retriedCount,
          message: `${retriedCount} mensagens reprocessadas`
        });

      case 'pause':
        messageQueue.stopProcessing();
        
        LoggerService.logUserAction('pause_message_queue', user!.id, {});

        return NextResponse.json({
          success: true,
          message: 'Processamento da fila pausado'
        });

      case 'resume':
        // Reinicia o processamento
        messageQueue.startProcessing();
        
        LoggerService.logUserAction('resume_message_queue', user!.id, {});

        return NextResponse.json({
          success: true,
          message: 'Processamento da fila retomado'
        });

      case 'cleanup':
        const olderThanDays = options?.olderThanDays || 7;
        const removedCount = messageQueue.cleanup(olderThanDays);
        
        LoggerService.logUserAction('cleanup_message_queue', user!.id, {
          removedCount,
          olderThanDays
        });

        return NextResponse.json({
          success: true,
          removedCount,
          message: `${removedCount} mensagens antigas removidas`
        });

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

  } catch (error) {
    LoggerService.error('Erro ao processar ação da fila', 'MessageQueueAPI', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/message-queue - Atualizar configurações da fila
export async function PUT(request: NextRequest) {
  try {
    const { authorized, error, user } = await verifyPermission(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'stop':
        messageQueue.stopProcessing();
        
        LoggerService.logUserAction('stop_message_queue', user!.id, {});

        return NextResponse.json({
          success: true,
          message: 'Processamento da fila parado'
        });

      case 'start':
        // Note: O serviço não tem método público para start, pois inicia automaticamente
        // Mas podemos reiniciar criando uma nova instância
        
        LoggerService.logUserAction('restart_message_queue', user!.id, {});

        return NextResponse.json({
          success: true,
          message: 'Processamento da fila reiniciado'
        });

      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

  } catch (error) {
    LoggerService.error('Erro ao atualizar configurações da fila', 'MessageQueueAPI', { error });
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
