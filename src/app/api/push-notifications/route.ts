import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from "../../../lib/supabase/clients/server";
import { notificationSystem } from '../../../lib/notification-system';
import { NotificationType, NotificationPriority } from '../../../types/notifications';

// Verificar se o usuário tem permissão para enviar notificações
async function verifyPermission(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  
  // Verificar autenticação
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { authorized: false, error: 'Não autenticado', user: null };
  }

  // Verificar se é admin ou tem permissão especial
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { authorized: false, error: 'Sem permissão para enviar notificações', user: null };
  }

  return { authorized: true, user, profile };
}

// POST /api/push-notifications - Enviar notificação push
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
    const { type, payload, targets } = body;

    // Validar payload
    if (!payload || !payload.title || !payload.body) {
      return NextResponse.json(
        { error: 'Payload inválido. Título e corpo são obrigatórios.' },
        { status: 400 }
      );
    }

    // Preparar dados da notificação
    const notificationData = {
      title: payload.title,
      message: payload.body,
      data: payload.data || {},
      icon: payload.icon,
      url: payload.url
    };

    let result;

    switch (type) {
      case 'user':
        if (!targets?.userId) {
          return NextResponse.json(
            { error: 'userId é obrigatório para notificações de usuário' },
            { status: 400 }
          );
        }
        result = await notificationSystem.sendNotification(
          'user' as NotificationType,
          payload.title,
          payload.body,
          [targets.userId],
          {
            priority: 'normal' as NotificationPriority,
            channels: ['push'],
            data: notificationData
          }
        );
        break;

      case 'users':
        if (!targets?.userIds || !Array.isArray(targets.userIds)) {
          return NextResponse.json(
            { error: 'userIds deve ser um array para notificações de múltiplos usuários' },
            { status: 400 }
          );
        }
        result = await notificationSystem.sendNotification(
          'user' as NotificationType,
          payload.title,
          payload.body,
          targets.userIds,
          {
            priority: 'normal' as NotificationPriority,
            channels: ['push'],
            data: notificationData
          }
        );
        break;

      case 'company':
        if (!targets?.empresaId) {
          return NextResponse.json(
            { error: 'empresaId é obrigatório para notificações de empresa' },
            { status: 400 }
          );
        }
        // Para empresa, precisamos buscar os usuários da empresa
        const supabase = await createServerSupabaseClient();
        const { data: companyUsers } = await supabase
          .from('profiles')
          .select('id, user_id')
          .eq('company', targets.empresaId);
        
        const userIds = companyUsers?.map(u => u.id) || [];
        result = await notificationSystem.sendNotification(
          'user' as NotificationType,
          payload.title,
          payload.body,
          userIds,
          {
            priority: 'normal' as NotificationPriority,
            channels: ['in_app'],
            data: notificationData
          }
        );
        break;

      case 'all':
        // Para todos os usuários, buscar todos os IDs
        const supabaseAll = await createServerSupabaseClient();
        const { data: allUsers } = await supabaseAll
          .from('profiles')
          .select('id, user_id');
        
        const allUserIds = allUsers?.map(u => u.id) || [];
        result = await notificationSystem.sendNotification(
          'system' as NotificationType,
          payload.title,
          payload.body,
          allUserIds,
          {
            priority: 'normal' as NotificationPriority,
            channels: ['in_app'],
            data: notificationData
          }
        );
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de notificação inválido. Use: user, users, company ou all' },
          { status: 400 }
        );
    }

    // Log da ação
    console.log(`Notificação enviada por ${user?.email}: tipo=${type}, resultado=`, result);

    return NextResponse.json({
      success: true,
      result,
      message: 'Notificação enviada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao enviar notificação push:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET /api/push-notifications/stats - Obter estatísticas
export async function GET(request: NextRequest) {
  try {
    const { authorized, error } = await verifyPermission(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error },
        { status: 401 }
      );
    }

    const stats = notificationSystem.getStatistics();

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/push-notifications/subscription - Remover subscription
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação (usuário pode remover sua própria subscription)
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint é obrigatório' },
        { status: 400 }
      );
    }

    // TODO: Implementar tabela push_subscriptions no banco
    // Remover subscription do usuário
    // const { error: deleteError } = await supabase
    //   .from('push_subscriptions')
    //   .delete()
    //   .eq('user_id', user!.id)
    //   .eq('endpoint', endpoint);

    // if (deleteError) {
    //   console.error('Erro ao remover subscription:', deleteError);
    //   return NextResponse.json(
    //     { error: 'Erro ao remover subscription' },
    //     { status: 500 }
    //   );
    // }

    return NextResponse.json({
      success: true,
      message: 'Subscription removida com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover subscription:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}