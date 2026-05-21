// @/app/api/notifications/in-app/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  requireApiUser,
  createAuthenticatedApiClient,
} from '@/lib/api-auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');

    // Impede IDOR: só permite consultar as próprias notificações
    if (requestedUserId && requestedUserId !== auth.user.id) {
      return NextResponse.json(
        { error: 'Acesso negado', message: 'Não é permitido consultar notificações de outro usuário.' },
        { status: 403 }
      );
    }

    const userId = auth.user.id;
    const supabase = await createAuthenticatedApiClient();

    const { data: notifications, error } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Erro ao buscar notificações:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      notifications: notifications || [],
      success: true,
    });
  } catch (error) {
    console.error('Erro na API de notificações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
