import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { requireApiAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const supabaseAdmin = createApiSupabaseClient(true);

    const { data: configs, error } = await supabaseAdmin
      .from('integration_configs')
      .select('*')
      .eq('provider', 'gates2b')
      .eq('is_active', true);

    if (error) {
      logger.error('Erro ao buscar configurações Gates2b:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar configurações Gates2b', error: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    logger.error('Erro na API de configurações Gates2b:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();

    if (!body.baseUrl || typeof body.baseUrl !== 'string') {
      return NextResponse.json(
        { success: false, message: 'URL base da API Gates2b é obrigatória', error: 'MISSING_BASE_URL' },
        { status: 400 }
      );
    }

    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação Gates2b é obrigatório', error: 'MISSING_TOKEN' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createApiSupabaseClient(true);

    await supabaseAdmin
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'gates2b');

    const { data, error } = await supabaseAdmin
      .from('integration_configs')
      .insert({
        provider: 'gates2b',
        config: {
          baseUrl: body.baseUrl,
          token: body.token,
          environment: body.environment || 'production',
        },
        is_active: true,
        created_by: auth.user.id,
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao salvar configuração Gates2b:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { success: false, message: 'Erro ao salvar configuração Gates2b', error: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração Gates2b salva com sucesso',
      data,
    });
  } catch (error) {
    logger.error('Erro na API de configuração Gates2b:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const supabaseAdmin = createApiSupabaseClient(true);

    const { error } = await supabaseAdmin
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'gates2b');

    if (error) {
      logger.error('Erro ao remover configuração Gates2b:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { success: false, message: 'Erro ao remover configuração Gates2b', error: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Configuração Gates2b removida com sucesso' });
  } catch (error) {
    logger.error('Erro na API de remoção Gates2b:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
