import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { pushNotificationService, PushNotificationPayload } from '@/lib/push-notifications.service';

// Verificar se o usuário tem permissão para enviar notificações
async function verifyPermission(request: NextRequest) {
  const supabase = createClient();
  
  // Verificar autenticação
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { authorized: false, error: 'Não autenticado' };
  }

  // Verificar se é admin ou tem permissão especial
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, permissions')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'admin' && !profile.permissions?.includes('send_notifications'))) {
    return { authorized: false, error: 'Sem permissão para enviar notificações' };
  }

  return { authorized: true, user, profile };
}

// POST /api/push-notifications - Enviar notificação push
export async function POST(request: NextRequest) {
  try {
    const { authorized, error, user } = await verifyPermission(request);
    
    if (!authorized) {
      return NextResponse.json(
        { error },
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

    const notificationPayload: PushNotificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions,
      requireInteraction: payload.requireInteraction,
      silent: payload.silent,
      vibrate: payload.vibrate,
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
        result = await pushNotificationService.sendToUser(targets.userId, notificationPayload);
        break;

      case 'users':
        if (!targets?.userIds || !Array.isArray(targets.userIds)) {
          return NextResponse.json(
            { error: 'userIds deve ser um array para notificações de múltiplos usuários' },
            { status: 400 }
          );
        }
        result = await pushNotificationService.sendToUsers(targets.userIds, notificationPayload);
        break;

      case 'company':
        if (!targets?.empresaId) {
          return NextResponse.json(
            { error: 'empresaId é obrigatório para notificações de empresa' },
            { status: 400 }
          );
        }
        result = await pushNotificationService.sendToCompany(targets.empresaId, notificationPayload);
        break;

      case 'all':
        result = await pushNotificationService.sendToAll(notificationPayload);
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

    const stats = await pushNotificationService.getSubscriptionStats();

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
    const supabase = createClient();
    
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

    // Remover subscription do usuário
    const { error: deleteError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (deleteError) {
      console.error('Erro ao remover subscription:', deleteError);
      return NextResponse.json(
        { error: 'Erro ao remover subscription' },
        { status: 500 }
      );
    }

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