// src/app/api/proxy/thebest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitCustom, parseWindowToMs, buildRateLimitHeaders } from '@/lib/security/rate-limit';
import { ErrorService, ErrorType } from '@/services/error.service';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import {
  THEBEST_PROXY_ACTIONS,
  type TheBestProxyAction,
  THEBEST_DEFAULT_TIMEOUT_MS,
} from '@/lib/integrations/thebest-constants';
import {
  getActiveTheBestConfig,
  migrateLegacyIntegrationConfig,
} from '@/lib/integrations/thebest-config-store';
import {
  callTheBestPanel,
  testTheBestPanelConnection,
} from '@/lib/integrations/thebest-panel-client';

async function isAuthenticated(): Promise<{ authenticated: boolean; user?: { id: string } }> {
  try {
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { authenticated: false };
    return { authenticated: true, user: { id: user.id } };
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return { authenticated: false };
  }
}

async function getUserTheBestConfig(userId: string) {
  const supabase = createApiSupabaseClient(false);
  let data = await getActiveTheBestConfig(supabase, userId);
  if (!data) {
    data = await migrateLegacyIntegrationConfig(supabase, userId);
  }

  if (!data?.api_key) {
    return {
      success: false as const,
      error: 'Configuração TheBest não encontrada. Configure a chave API em Integrações.',
    };
  }

  return {
    success: true as const,
    config: {
      configId: data.id,
      baseUrl: data.api_url,
      apiKey: data.api_key,
      apiSecret: data.api_secret ?? undefined,
    },
  };
}

const ACTION_TO_OPERATION: Record<string, string> = {
  get_packages: 'GET_PACKAGES',
  sync_packages: 'SYNC_PACKAGES',
  create_renewal: 'CREATE_RENEWAL',
  renew_line: 'CREATE_RENEWAL',
  create_trial: 'CREATE_TRIAL',
  get_renew_cost: 'GET_RENEW_COST',
  list_lines: 'LIST_LINES',
  get_user_renewals: 'LIST_LINES',
  get_renewal_status: 'GET_RENEWAL',
  cancel_renewal: 'CANCEL_RENEWAL',
  test_connection: 'TEST_CONNECTION',
};

async function logApiCall(
  configId: string,
  userId: string,
  action: string,
  success: boolean,
  options?: {
    responseData?: unknown;
    errorMessage?: string;
    statusCode?: number;
    durationMs?: number;
  }
) {
  try {
    const supabase = createApiSupabaseClient(false);
    await supabase.from('thebest_api_logs').insert({
      config_id: configId,
      user_id: userId,
      operation_type: ACTION_TO_OPERATION[action] ?? 'TEST_CONNECTION',
      endpoint: action,
      http_method: 'POST',
      success,
      response_data: options?.responseData ?? null,
      error_message: options?.errorMessage ?? null,
      response_status: options?.statusCode ?? null,
      duration_ms: options?.durationMs ?? null,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao registrar log da API TheBest:', error);
  }
}

async function touchLastUsed(configId: string) {
  try {
    const supabase = createApiSupabaseClient(false);
    await supabase
      .from('thebest_configs')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', configId);
  } catch (error) {
    console.error('Erro ao atualizar last_used_at:', error);
  }
}

function isAllowedAction(action: string | null): action is TheBestProxyAction {
  return Boolean(action && THEBEST_PROXY_ACTIONS.includes(action as TheBestProxyAction));
}

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs('1m'),
      max: 30,
      namespace: 'proxy:thebest',
    });
    if (!rl.success) {
      return NextResponse.json(
        {
          error: 'Muitas requisições. Tente novamente em instantes.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429, headers: buildRateLimitHeaders(rl) }
      );
    }

    const authResult = await isAuthenticated();
    if (!authResult.authenticated || !authResult.user) {
      const authError = ErrorService.createAuthenticationError(
        'Você precisa estar autenticado para acessar esta API.'
      );
      return NextResponse.json(
        { error: authError.message, code: authError.code },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    if (!isAllowedAction(action)) {
      return NextResponse.json(
        { error: 'Action não permitida', code: 'ACTION_NOT_ALLOWED' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }

    const configResult = await getUserTheBestConfig(authResult.user.id);
    if (!configResult.success) {
      return NextResponse.json(
        { error: configResult.error, code: 'THEBEST_CONFIG_NOT_FOUND' },
        { status: 404 }
      );
    }

    const { configId, baseUrl, apiKey, apiSecret } = configResult.config;
    const started = Date.now();

    if (action === 'test_connection') {
      const test = await testTheBestPanelConnection({
        apiKey,
        apiSecret,
        baseUrl,
        timeoutMs: THEBEST_DEFAULT_TIMEOUT_MS,
      });
      await logApiCall(configId, authResult.user.id, action, test.success, {
        statusCode: test.status,
        durationMs: Date.now() - started,
        errorMessage: test.success ? undefined : test.message,
      });
      if (test.success) await touchLastUsed(configId);
      return NextResponse.json({
        success: test.success,
        message: test.message,
        status: test.status,
        latency_ms: test.latencyMs,
      });
    }

    const panelResult = await callTheBestPanel(
      { apiKey, apiSecret, baseUrl, timeoutMs: THEBEST_DEFAULT_TIMEOUT_MS },
      action,
      body as Record<string, unknown>,
      'POST'
    );

    await logApiCall(configId, authResult.user.id, action, panelResult.ok, {
      responseData: panelResult.data,
      statusCode: panelResult.status,
      durationMs: Date.now() - started,
      errorMessage: panelResult.ok ? undefined : String(panelResult.data),
    });

    if (!panelResult.ok) {
      const appError = ErrorService.createError(
        panelResult.status >= 500 ? ErrorType.NETWORK : ErrorType.VALIDATION,
        `Erro na API TheBest: ${panelResult.status}`,
        `THEBEST_API_${panelResult.status}`,
        panelResult.data
      );
      const status = panelResult.status >= 400 ? panelResult.status : 502;
      const { stripInternalDetailsForResponse } = await import('@/lib/api-error-response');
      return NextResponse.json(
        stripInternalDetailsForResponse(
          { error: appError.message, code: appError.code, details: appError.details },
          status
        ),
        { status }
      );
    }

    await touchLastUsed(configId);
    return NextResponse.json(panelResult.data ?? { success: true });
  } catch (error) {
    console.error('Erro no proxy TheBest:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor', code: 'INTERNAL_SERVER_ERROR' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs('1m'),
      max: 60,
      namespace: 'proxy:thebest:get',
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições.', code: 'RATE_LIMIT_EXCEEDED' },
        { status: 429, headers: buildRateLimitHeaders(rl) }
      );
    }

    const authResult = await isAuthenticated();
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'get_config_status') {
      const configResult = await getUserTheBestConfig(authResult.user.id);
      return NextResponse.json({
        configured: configResult.success,
        hasConfig: configResult.success,
        error: configResult.success ? undefined : configResult.error,
      });
    }

    if (!isAllowedAction(action)) {
      return NextResponse.json({ error: 'Action não permitida para GET' }, { status: 403 });
    }

    const configResult = await getUserTheBestConfig(authResult.user.id);
    if (!configResult.success) {
      return NextResponse.json(
        { error: configResult.error, code: 'THEBEST_CONFIG_NOT_FOUND' },
        { status: 404 }
      );
    }

    const { configId, baseUrl, apiKey, apiSecret } = configResult.config;
    const started = Date.now();

    if (action === 'test_connection') {
      const test = await testTheBestPanelConnection({
        apiKey,
        apiSecret,
        baseUrl,
        timeoutMs: THEBEST_DEFAULT_TIMEOUT_MS,
      });
      await logApiCall(configId, authResult.user.id, action, test.success, {
        durationMs: Date.now() - started,
        errorMessage: test.success ? undefined : test.message,
      });
      return NextResponse.json({
        success: test.success,
        message: test.message,
        status: test.status,
      });
    }

    const panelResult = await callTheBestPanel(
      { apiKey, apiSecret, baseUrl },
      action,
      {},
      'GET'
    );

    await logApiCall(configId, authResult.user.id, action, panelResult.ok, {
      responseData: panelResult.data,
      statusCode: panelResult.status,
      durationMs: Date.now() - started,
    });

    if (!panelResult.ok) {
      return NextResponse.json(
        { error: `Erro na API TheBest: ${panelResult.status}` },
        { status: panelResult.status >= 400 ? panelResult.status : 502 }
      );
    }

    await touchLastUsed(configId);
    return NextResponse.json(panelResult.data ?? { success: true });
  } catch (error) {
    console.error('Erro no proxy TheBest (GET):', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
