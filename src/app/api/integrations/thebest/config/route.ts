import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';
import { getTheBestBaseUrl } from '@/lib/integrations/thebest-constants';
import {
  deactivateTheBestConfig,
  getActiveTheBestConfig,
  migrateLegacyIntegrationConfig,
  upsertTheBestConfig,
} from '@/lib/integrations/thebest-config-store';

/**
 * Configuração TheBest — persiste em `thebest_configs` (tabela canônica).
 * URL da API é fixa no servidor (`https://api.painel.best` ou env).
 */

function extractApiKey(body: Record<string, unknown>): string | null {
  const raw =
    body.apiKey ?? body.api_key ?? body.auth_token ?? body.token;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    const supabase = createApiSupabaseClient(false);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let data = await getActiveTheBestConfig(supabase, user.id);
    if (!data) {
      data = await migrateLegacyIntegrationConfig(supabase, user.id);
    }

    return NextResponse.json({
      success: true,
      data: data
        ? {
            id: data.id,
            api_url: data.api_url,
            api_key: data.api_key,
            has_secret: Boolean(data.api_secret),
            name: data.name,
            is_active: data.is_active,
            last_used_at: data.last_used_at,
            panel_base_url: getTheBestBaseUrl(),
          }
        : null,
      error: null,
    });
  } catch (error) {
    logger.error(
      'Erro na API de configuração TheBest:',
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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const config = (body.config as Record<string, unknown> | undefined) ?? body;
    const apiKey = extractApiKey(config);

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave da API TheBest é obrigatória' },
        { status: 400 }
      );
    }

    const apiSecret =
      typeof config.apiSecret === 'string'
        ? config.apiSecret
        : typeof config.api_secret === 'string'
          ? config.api_secret
          : undefined;

    const timeoutMs =
      typeof config.timeout === 'number' ? config.timeout : undefined;

    const data = await upsertTheBestConfig(supabase, user.id, {
      apiKey,
      apiSecret,
      timeoutMs,
    });

    return NextResponse.json({
      success: true,
      message: 'Configuração salva com sucesso',
      data: {
        id: data.id,
        api_url: data.api_url,
        panel_base_url: getTheBestBaseUrl(),
      },
      error: null,
    });
  } catch (error) {
    logger.error(
      'Erro ao salvar configuração TheBest:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Erro ao salvar configuração' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const supabase = createApiSupabaseClient(false);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await deactivateTheBestConfig(supabase, user.id);

    await supabase
      .from('integration_configs')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('provider', 'thebest')
      .eq('created_by', user.id);

    return NextResponse.json({
      success: true,
      message: 'Configuração removida com sucesso',
    });
  } catch (error) {
    logger.error(
      'Erro ao remover configuração TheBest:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
