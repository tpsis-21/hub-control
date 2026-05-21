import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';
import { getTheBestBaseUrl, THEBEST_DEFAULT_TIMEOUT_MS } from '@/lib/integrations/thebest-constants';
import {
  getActiveTheBestConfig,
  migrateLegacyIntegrationConfig,
} from '@/lib/integrations/thebest-config-store';
import { testTheBestPanelConnection } from '@/lib/integrations/thebest-panel-client';

/**
 * Testa conexão com o painel TheBest usando credenciais salvas ou enviadas no body.
 */
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

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const config = (body.config as Record<string, unknown> | undefined) ?? {};

    let apiKey =
      typeof config.apiKey === 'string'
        ? config.apiKey.trim()
        : typeof config.api_key === 'string'
          ? config.api_key.trim()
          : '';

    let apiSecret =
      typeof config.apiSecret === 'string'
        ? config.apiSecret
        : typeof config.api_secret === 'string'
          ? config.api_secret
          : undefined;

    if (!apiKey) {
      let stored = await getActiveTheBestConfig(supabase, user.id);
      if (!stored) {
        stored = await migrateLegacyIntegrationConfig(supabase, user.id);
      }
      if (stored) {
        apiKey = stored.api_key;
        apiSecret = stored.api_secret ?? undefined;
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: 'Informe a chave da API ou salve a configuração antes.', error: 'MISSING_API_KEY' },
        { status: 400 }
      );
    }

    const timeoutMs =
      typeof config.timeout === 'number' ? config.timeout : THEBEST_DEFAULT_TIMEOUT_MS;

    const result = await testTheBestPanelConnection({
      apiKey,
      apiSecret,
      baseUrl: getTheBestBaseUrl(),
      timeoutMs,
    });

    if (!result.success) {
      return NextResponse.json({
        success: false,
        message: result.message,
        error: 'CONNECTION_FAILED',
        status: result.status,
        latency_ms: result.latencyMs,
      });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      status: result.status,
      latency_ms: result.latencyMs,
      panel_base_url: getTheBestBaseUrl(),
    });
  } catch (error) {
    logger.error(
      'Erro no teste de conexão TheBest:',
      error instanceof Error ? error : new Error(String(error))
    );

    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        message: 'Timeout na conexão com o painel',
        error: 'TIMEOUT',
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Erro interno no teste de conexão',
      error: 'INTERNAL_ERROR',
    });
  }
}
