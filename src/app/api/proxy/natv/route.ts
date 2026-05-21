// src/app/api/proxy/natv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitCustom, parseWindowToMs, buildRateLimitHeaders } from '@/lib/security/rate-limit';
import { getExternalApiConfig } from '@/lib/security';
import { ErrorService, ErrorType } from '@/services/error.service';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { getNatvBaseUrl } from '@/lib/integrations/natv-constants';

// Função para verificar autenticação
async function isAuthenticated(request: NextRequest): Promise<{ authenticated: boolean; user?: any }> {
  try {
    // Usar cliente Supabase consolidado
    const supabase = createApiSupabaseClient(false);
    
    // Verificar se o token é válido
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { authenticated: false };
    }
    
    return { authenticated: true, user };
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return { authenticated: false };
  }
}

// Função para obter configuração NATV do usuário
async function getUserNATVConfig(userId: string): Promise<{
  success: boolean;
  config?: {
    baseUrl: string;
    token: string;
    username?: string;
    password?: string;
  };
  error?: string;
}> {
  try {
    const supabase = createApiSupabaseClient(false);

    const { data, error } = await supabase
      .from('integration_configs')
      .select('base_url, auth_token, config_data')
      .eq('provider', 'natv')
      .eq('created_by', userId)
      .eq('is_active', true)
      .single();

    if (error || !data || !data.auth_token) {
      return {
        success: false,
        error: 'Configuração NATV não encontrada para este usuário'
      };
    }

    const configData = data.config_data as any || {};

    return {
      success: true,
      config: {
        baseUrl: getNatvBaseUrl(),
        token: data.auth_token,
        username: configData.username,
        password: configData.password
      }
    };
  } catch (error) {
    console.error('Erro ao obter configuração NATV do usuário:', error);
    return {
      success: false,
      error: 'Erro interno ao obter configuração'
    };
  }
}

// POST - Proxy para API NATV
export async function POST(request: NextRequest) {
  try {
    // Rate limit para NATV
    const { requests, window } = getExternalApiConfig().natv.rateLimit;
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs(window),
      max: requests,
      namespace: 'proxy:natv'
    });
    if (!rl.success) {
      const rateLimitError = ErrorService.createError(
        ErrorType.VALIDATION,
        'Muitas requisições. Tente novamente em instantes.',
        'RATE_LIMIT_EXCEEDED'
      );
      return NextResponse.json(
        { 
          error: rateLimitError.message,
          code: rateLimitError.code,
          timestamp: rateLimitError.timestamp
        },
        { status: 429, headers: buildRateLimitHeaders(rl) }
      );
    }

    // Verificar autenticação
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      const authError = ErrorService.createAuthenticationError(
        'Você precisa estar autenticado para acessar esta API.'
      );
      return NextResponse.json(
        { 
          error: authError.message,
          code: authError.code,
          timestamp: authError.timestamp
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      const validationError = ErrorService.createValidationError(
        'Action é obrigatória'
      );
      return NextResponse.json(
        { 
          error: validationError.message,
          code: validationError.code,
          timestamp: validationError.timestamp
        },
        { status: 400 }
      );
    }

    // Validar actions permitidas
    const allowedActions = [
      'create_line',
      'get_line_status',
      'delete_line',
      'renew_line',
      'get_reseller_info',
      'check_credits',
      'get_packages'
    ];

    if (!allowedActions.includes(action)) {
      const authzError = ErrorService.createAuthorizationError(
        'Action não permitida'
      );
      return NextResponse.json(
        { 
          error: authzError.message,
          code: authzError.code,
          timestamp: authzError.timestamp
        },
        { status: 403 }
      );
    }

    // Obter dados do corpo da requisição
    const body = await request.json();

    // Validar dados básicos
    if (!body || typeof body !== 'object') {
      const validationError = ErrorService.createValidationError(
        'Dados inválidos'
      );
      return NextResponse.json(
        { 
          error: validationError.message,
          code: validationError.code,
          timestamp: validationError.timestamp
        },
        { status: 400 }
      );
    }

    // Verificar se o usuário está autenticado (já verificado anteriormente)
    if (!authResult.authenticated || !authResult.user) {
      const authError = ErrorService.createError(
        ErrorType.AUTHENTICATION,
        'Acesso não autorizado',
        'UNAUTHORIZED'
      );
      return NextResponse.json(
        { 
          error: authError.message,
          code: authError.code,
          timestamp: authError.timestamp
        },
        { status: 401 }
      );
    }

    // Obter configuração NATV do usuário
    const configResult = await getUserNATVConfig(authResult.user.id);
    if (!configResult.success || !configResult.config) {
      const configError = ErrorService.createError(
        ErrorType.VALIDATION,
        'Configuração NATV não encontrada. Configure sua chave API nas integrações.',
        'NATV_CONFIG_NOT_FOUND'
      );
      return NextResponse.json(
        { 
          error: configError.message,
          code: configError.code,
          timestamp: configError.timestamp
        },
        { status: 404 }
      );
    }

    const { baseUrl, token, username, password } = configResult.config;

    // Preparar dados para NATV API
    const natvData = {
      ...body,
      username: username,
      password: password,
      action: action
    };

    // Fazer requisição para API NATV
    const natvResponse = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Hub-Control/1.0'
      },
      body: JSON.stringify(natvData)
    });

    // Atualizar last_used_at da configuração
    try {
      const supabase = createApiSupabaseClient();

      await supabase
        .from('integration_configs')
        .update({ last_used_at: new Date().toISOString() })
        .eq('provider', 'natv')
        .eq('created_by', authResult.user.id)
        .eq('is_active', true);
    } catch (error) {
      // Log do erro mas não falha a requisição
      console.error('Erro ao atualizar last_used_at:', error);
    }

    if (!natvResponse.ok) {
      const errorText = await natvResponse.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      const appError = ErrorService.createError(
        natvResponse.status >= 500 ? ErrorType.NETWORK : ErrorType.VALIDATION,
        `Erro na API NATV: ${natvResponse.status} - ${natvResponse.statusText}`,
        `NATV_API_${natvResponse.status}`,
        { responseData: errorData, status: natvResponse.status }
      );
      
      ErrorService.logError(appError, 'NATV API Response');
      
      return NextResponse.json(
        { 
          error: natvResponse.status >= 500 ? 'Serviço temporariamente indisponível' : 'Erro ao processar solicitação',
          message: errorData.message || natvResponse.statusText,
          code: appError.code,
          timestamp: appError.timestamp
        },
        { status: natvResponse.status >= 500 ? 503 : 400 }
      );
    }

    const data = await natvResponse.json();

    // Filtrar dados sensíveis
    const filteredData = {
      ...data,
      // Remover campos sensíveis
      username: undefined,
      password: undefined,
      api_key: undefined,
      internal_credentials: undefined
    };

    return NextResponse.json(filteredData, {
      headers: {
        ...buildRateLimitHeaders(rl)
      }
    });

  } catch (error) {
    const appError = ErrorService.fromNativeError(error);
    ErrorService.logError(appError, 'NATV Proxy API');
    
    // Determinar status code baseado no tipo de erro
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (ErrorService.isErrorOfType(appError, ErrorType.NETWORK)) {
      statusCode = 503;
      errorMessage = 'Serviço temporariamente indisponível';
    } else if (ErrorService.isErrorOfType(appError, ErrorType.AUTHENTICATION)) {
      statusCode = 401;
      errorMessage = 'Erro de autenticação';
    } else if (ErrorService.isErrorOfType(appError, ErrorType.VALIDATION)) {
      statusCode = 400;
      errorMessage = 'Dados inválidos';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: appError.message,
        code: appError.code,
        timestamp: appError.timestamp
      },
      { status: statusCode }
    );
  }
}

// GET - Proxy para consultas da API NATV
export async function GET(request: NextRequest) {
  try {
    // Rate limit para NATV
    const { requests, window } = getExternalApiConfig().natv.rateLimit;
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs(window),
      max: requests,
      namespace: 'proxy:natv'
    });
    if (!rl.success) {
      const rateLimitError = ErrorService.createError(
        ErrorType.VALIDATION,
        'Muitas requisições. Tente novamente em instantes.',
        'RATE_LIMIT_EXCEEDED'
      );
      return NextResponse.json(
        { 
          error: rateLimitError.message,
          code: rateLimitError.code,
          timestamp: rateLimitError.timestamp
        },
        { status: 429, headers: buildRateLimitHeaders(rl) }
      );
    }

    // Verificar autenticação
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      const authError = ErrorService.createAuthenticationError(
        'Você precisa estar autenticado para acessar esta API.'
      );
      return NextResponse.json(
        { 
          error: authError.message,
          code: authError.code,
          timestamp: authError.timestamp
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (!action) {
      const validationError = ErrorService.createValidationError(
        'Action é obrigatória'
      );
      return NextResponse.json(
        { 
          error: validationError.message,
          code: validationError.code,
          timestamp: validationError.timestamp
        },
        { status: 400 }
      );
    }

    // Validar actions permitidas para GET
    const allowedGetActions = [
      'get_line_status',
      'get_reseller_info',
      'check_credits',
      'get_packages',
      'list_lines'
    ];

    if (!allowedGetActions.includes(action)) {
      const authzError = ErrorService.createAuthorizationError(
        'Action não permitida para GET'
      );
      return NextResponse.json(
        { 
          error: authzError.message,
          code: authzError.code,
          timestamp: authzError.timestamp
        },
        { status: 403 }
      );
    }

    // Obter configuração NATV do usuário
    const configResult = await getUserNATVConfig(authResult.user!.id);
    if (!configResult.success || !configResult.config) {
      const configError = ErrorService.createError(
        ErrorType.VALIDATION,
        'Configuração NATV não encontrada. Configure sua chave API nas integrações.',
        'NATV_CONFIG_NOT_FOUND'
      );
      return NextResponse.json(
        { 
          error: configError.message,
          code: configError.code,
          timestamp: configError.timestamp
        },
        { status: 404 }
      );
    }

    const { baseUrl, token, username, password } = configResult.config;

    // Preparar dados para NATV API
    const natvData = {
      username: username,
      password: password,
      action: action,
      // Adicionar parâmetros da query se necessário
      line_id: searchParams.get('line_id'),
      package_id: searchParams.get('package_id')
    };

    // Fazer requisição para API NATV
    const natvResponse = await fetch(baseUrl, {
      method: 'POST', // NATV API usa POST mesmo para consultas
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Hub-Control/1.0'
      },
      body: JSON.stringify(natvData)
    });

    // Atualizar last_used_at da configuração
    try {
      const supabase = createApiSupabaseClient();

      await supabase
        .from('integration_configs')
        .update({ last_used_at: new Date().toISOString() })
        .eq('provider', 'natv')
        .eq('created_by', authResult.user!.id)
        .eq('is_active', true);
    } catch (error) {
      // Log do erro mas não falha a requisição
      console.error('Erro ao atualizar last_used_at:', error);
    }

    if (!natvResponse.ok) {
      const errorText = await natvResponse.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      const appError = ErrorService.createError(
        natvResponse.status >= 500 ? ErrorType.NETWORK : ErrorType.VALIDATION,
        `Erro na API NATV: ${natvResponse.status} - ${natvResponse.statusText}`,
        `NATV_API_${natvResponse.status}`,
        { responseData: errorData, status: natvResponse.status }
      );
      
      ErrorService.logError(appError, 'NATV API Response');
      
      return NextResponse.json(
        { 
          error: natvResponse.status >= 500 ? 'Serviço temporariamente indisponível' : 'Erro ao consultar dados',
          message: errorData.message || natvResponse.statusText,
          code: appError.code,
          timestamp: appError.timestamp
        },
        { status: natvResponse.status >= 500 ? 503 : 400 }
      );
    }

    const data = await natvResponse.json();

    // Filtrar dados sensíveis
    const filteredData = {
      ...data,
      username: undefined,
      password: undefined,
      api_key: undefined,
      internal_credentials: undefined
    };

    return NextResponse.json(filteredData, {
      headers: {
        ...buildRateLimitHeaders(rl)
      }
    });

  } catch (error) {
    const appError = ErrorService.fromNativeError(error);
    ErrorService.logError(appError, 'NATV Proxy API');
    
    // Determinar status code baseado no tipo de erro
    let statusCode = 500;
    let errorMessage = 'Erro interno do servidor';
    
    if (ErrorService.isErrorOfType(appError, ErrorType.NETWORK)) {
      statusCode = 503;
      errorMessage = 'Serviço temporariamente indisponível';
    } else if (ErrorService.isErrorOfType(appError, ErrorType.AUTHENTICATION)) {
      statusCode = 401;
      errorMessage = 'Erro de autenticação';
    } else if (ErrorService.isErrorOfType(appError, ErrorType.VALIDATION)) {
      statusCode = 400;
      errorMessage = 'Dados inválidos';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        message: appError.message,
        code: appError.code,
        timestamp: appError.timestamp
      },
      { status: statusCode }
    );
  }
}
