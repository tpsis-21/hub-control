import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { getNatvBaseUrl } from '@/lib/integrations/natv-constants';
import { logger } from '@/lib/logger';

const ALLOWED_METHODS: Record<string, ReadonlySet<string>> = {
  '/user': new Set(['POST']),
  '/user/activation': new Set(['POST']),
  '/user/search': new Set(['POST']),
  '/test': new Set(['GET']),
};

function isAllowedRoute(endpoint: string, method: string): boolean {
  const path = endpoint.split('?')[0];
  if (ALLOWED_METHODS[path]?.has(method)) return true;
  if (method === 'GET' && /^\/user\/[^/]+$/.test(path)) return true;
  if (method === 'POST' && /^\/user\/[^/]+\/deactivate$/.test(path)) return true;
  return false;
}

async function getNatvToken(userId: string): Promise<string | null> {
  const supabase = createApiSupabaseClient(false);
  const { data, error } = await supabase
    .from('integration_configs')
    .select('auth_token')
    .eq('provider', 'natv')
    .eq('created_by', userId)
    .eq('is_active', true)
    .single();

  if (error || !data?.auth_token) return null;
  return data.auth_token;
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

    const payload = await request.json();
    const endpoint =
      typeof payload.endpoint === 'string' ? payload.endpoint.trim() : '';
    const method =
      payload.method === 'GET' || payload.method === 'POST'
        ? payload.method
        : 'POST';
    const body = payload.body;

    if (!endpoint.startsWith('/')) {
      return NextResponse.json(
        { error: 'Endpoint inválido' },
        { status: 400 }
      );
    }

    if (!isAllowedRoute(endpoint, method)) {
      return NextResponse.json(
        { error: 'Operação NATV não permitida' },
        { status: 403 }
      );
    }

    const token = await getNatvToken(user.id);
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Configuração NATV não encontrada. Informe o token do revendedor.',
          error: 'NATV_CONFIG_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const baseUrl = getNatvBaseUrl();
    const [pathOnly, query] = endpoint.split('?');
    const url = `${baseUrl}${pathOnly}${query ? `?${query}` : ''}`;

    const natvResponse = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Hub-Control/1.0',
      },
      body:
        method === 'POST' && body !== undefined && body !== null
          ? JSON.stringify(body)
          : undefined,
    });

    let responseData: unknown;
    const text = await natvResponse.text();
    try {
      responseData = text ? JSON.parse(text) : null;
    } catch {
      responseData = { detail: text };
    }

    if (!natvResponse.ok) {
      const detail =
        typeof responseData === 'object' &&
        responseData !== null &&
        'detail' in responseData
          ? String((responseData as { detail: unknown }).detail)
          : natvResponse.statusText;

      return NextResponse.json({
        success: false,
        message: detail || 'Erro na API NATV',
        error: `NATV_API_${natvResponse.status}`,
        data: responseData,
      });
    }

    await supabase
      .from('integration_configs')
      .update({ last_used_at: new Date().toISOString() })
      .eq('provider', 'natv')
      .eq('created_by', user.id)
      .eq('is_active', true);

    return NextResponse.json({
      success: true,
      message: 'Operação concluída',
      data: responseData,
    });
  } catch (error) {
    logger.error(
      'Erro no proxy NATV:',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno ao comunicar com a NATV',
        error: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
