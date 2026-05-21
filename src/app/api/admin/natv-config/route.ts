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
      .eq('provider', 'natv')
      .eq('is_active', true);

    if (error) {
      logger.error('Erro ao buscar configurações natv:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { success: false, message: 'Erro ao buscar configurações natv', error: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: configs });
  } catch (error) {
    logger.error('Erro na API de configurações natv:', error instanceof Error ? error : new Error(String(error)));
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
        { success: false, message: 'URL base da API natv é obrigatória', error: 'MISSING_BASE_URL' },
        { status: 400 }
      );
    }

    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Token de autenticação natv é obrigatório', error: 'MISSING_TOKEN' },
        { status: 400 }
      );
    }

    const supabaseAdmin = createApiSupabaseClient(true);

    await supabaseAdmin
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'natv');

    const { data, error } = await supabaseAdmin
      .from('integration_configs')
      .insert({
        provider: 'natv',
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
      logger.error('Erro ao salvar configuração natv:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { success: false, message: 'Erro ao salvar configuração natv', error: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração natv salva com sucesso',
      data,
    });
  } catch (error) {
    logger.error('Erro na API de configuração natv:', error instanceof Error ? error : new Error(String(error)));
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
      .eq('provider', 'natv');

    if (error) {
      logger.error('Erro ao remover configuração natv:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { success: false, message: 'Erro ao remover configuração natv', error: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Configuração natv removida com sucesso' });
  } catch (error) {
    logger.error('Erro na API de remoção natv:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}
