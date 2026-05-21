// @/app/api/notifications/mark-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  requireApiUser,
  createAuthenticatedApiClient,
} from '@/lib/api-auth';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: 'notificationId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = await createAuthenticatedApiClient();

    // Garante que a notificação pertence ao usuário autenticado (RLS + filtro explícito)
    const { data: existing, error: fetchError } = await supabase
      .from('in_app_notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', auth.user.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Erro ao verificar notificação:', fetchError);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }

    if (!existing) {
      return NextResponse.json(
        { error: 'Notificação não encontrada ou acesso negado' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('in_app_notifications')
      .update({
        read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', auth.user.id);

    if (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro na API de marcar notificação como lida:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
