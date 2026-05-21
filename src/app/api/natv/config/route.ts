import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';
import {
  getNatvBaseUrl,
  NATV_DEFAULT_TIMEOUT_MS,
  NATV_API_ENDPOINTS,
} from '@/lib/integrations/natv-constants';

/**
 * API Route para gerenciar configurações NATV do usuário autenticado.
 * Apenas o token do revendedor é configurável; a URL base é fixa no servidor.
 */

function sanitizeConfigForClient(
  row: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!row) return null
  const { auth_token: _token, base_url: _url, ...safe } = row
  return safe
}

function extractToken(body: Record<string, unknown>): string | null {
  const raw = body.auth_token ?? body.token;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('provider', 'natv')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error(
        'Erro ao buscar configuração NATV:',
        error instanceof Error ? error : new Error(String(error))
      );
      return NextResponse.json(
        { error: 'Erro ao buscar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sanitizeConfigForClient(data as Record<string, unknown> | null),
      error: null,
    });
  } catch (error) {
    logger.error(
      'Erro na API de configuração NATV:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const token = extractToken(body);

    if (!token) {
      return NextResponse.json(
        { error: 'Token da API NATV é obrigatório' },
        { status: 400 }
      );
    }

    const { data: existingConfig } = await supabase
      .from('integration_configs')
      .select('id')
      .eq('provider', 'natv')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const configData = {
      provider: 'natv',
      name: 'NATV API',
      base_url: getNatvBaseUrl(),
      auth_token: token,
      auth_type: 'bearer',
      config_data: {
        timeout: NATV_DEFAULT_TIMEOUT_MS,
        endpoints: NATV_API_ENDPOINTS,
      },
      is_active: true,
      is_default: false,
      rate_limit_per_minute: 60,
      updated_at: new Date().toISOString(),
      created_by: user.id,
      updated_by: user.id,
    };

    let result;
    if (existingConfig?.id) {
      result = await supabase
        .from('integration_configs')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('integration_configs')
        .insert({
          ...configData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) {
      logger.error(
        'Erro ao salvar configuração NATV:',
        result.error instanceof Error ? result.error : new Error(String(result.error))
      );
      return NextResponse.json(
        { error: 'Erro ao salvar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sanitizeConfigForClient(
        result.data as Record<string, unknown> | null
      ),
      error: null,
    });
  } catch (error) {
    logger.error(
      'Erro na criação de configuração NATV:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const token = extractToken(body);

    if (!token) {
      return NextResponse.json(
        { error: 'Token da API NATV é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('integration_configs')
      .update({
        base_url: getNatvBaseUrl(),
        auth_token: token,
        config_data: {
          timeout: NATV_DEFAULT_TIMEOUT_MS,
          endpoints: NATV_API_ENDPOINTS,
        },
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('provider', 'natv')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .select()
      .single();

    if (error) {
      logger.error(
        'Erro ao atualizar configuração NATV:',
        error instanceof Error ? error : new Error(String(error))
      );
      return NextResponse.json(
        { error: 'Erro ao atualizar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: sanitizeConfigForClient(data as Record<string, unknown>),
    });
  } catch (error) {
    logger.error(
      'Erro na atualização de configuração NATV:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { error } = await supabase
      .from('integration_configs')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (error) {
      logger.error(
        'Erro ao deletar configuração NATV:',
        error instanceof Error ? error : new Error(String(error))
      );
      return NextResponse.json(
        { error: 'Erro ao deletar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração removida com sucesso',
    });
  } catch (error) {
    logger.error(
      'Erro na remoção de configuração NATV:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
