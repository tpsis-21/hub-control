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
import { testTheBestPanelConnection } from '@/lib/integrations/thebest-panel-client';

/**
 * Operações TheBest — usa `thebest_configs` (canônico).
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiSupabaseClient(false);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    switch (operation) {
      case 'get_config':
        return getUserTheBestConfigResponse(supabase, user.id);
      case 'test_connection':
        return testConnectionForUser(supabase, user.id);
      default:
        return NextResponse.json({ error: 'Operação não suportada' }, { status: 400 });
    }
  } catch (error) {
    logger.error(
      'Erro na API de operações TheBest:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
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

    const body = await request.json();
    const { operation, data } = body;

    switch (operation) {
      case 'save_config': {
        const apiKey = data?.apiKey ?? data?.api_key ?? data?.auth_token;
        if (!apiKey || typeof apiKey !== 'string') {
          return NextResponse.json({ error: 'Chave da API obrigatória' }, { status: 400 });
        }
        const saved = await upsertTheBestConfig(supabase, user.id, {
          apiKey,
          apiSecret: data?.apiSecret ?? data?.api_secret,
        });
        return NextResponse.json({ success: true, data: saved });
      }
      case 'delete_config':
        await deactivateTheBestConfig(supabase, user.id);
        return NextResponse.json({ success: true, message: 'Configuração removida' });
      default:
        return NextResponse.json({ error: 'Operação não suportada' }, { status: 400 });
    }
  } catch (error) {
    logger.error(
      'Erro na API de operações TheBest:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

async function getUserTheBestConfigResponse(
  supabase: ReturnType<typeof createApiSupabaseClient>,
  userId: string
) {
  let data = await getActiveTheBestConfig(supabase, userId);
  if (!data) {
    data = await migrateLegacyIntegrationConfig(supabase, userId);
  }

  return NextResponse.json({
    success: true,
    data: data
      ? {
          id: data.id,
          base_url: data.api_url,
          auth_token: data.api_key,
          panel_base_url: getTheBestBaseUrl(),
          config_data: {},
          is_active: data.is_active,
        }
      : null,
  });
}

async function testConnectionForUser(
  supabase: ReturnType<typeof createApiSupabaseClient>,
  userId: string
) {
  let config = await getActiveTheBestConfig(supabase, userId);
  if (!config) {
    config = await migrateLegacyIntegrationConfig(supabase, userId);
  }

  if (!config?.api_key) {
    return NextResponse.json({
      success: false,
      message: 'Configuração TheBest não encontrada',
    });
  }

  const result = await testTheBestPanelConnection({
    apiKey: config.api_key,
    apiSecret: config.api_secret ?? undefined,
    baseUrl: config.api_url,
  });

  return NextResponse.json({
    success: result.success,
    message: result.message,
    data: result,
  });
}
