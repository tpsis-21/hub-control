// src/app/api/proxy/thebest/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitCustom, parseWindowToMs, buildRateLimitHeaders } from '@/lib/security/rate-limit';
import { getExternalApiConfig } from '@/lib/security';
import { ErrorService, ErrorType } from '@/services/error.service';
import { createClient } from '@supabase/supabase-js';

// Função para verificar autenticação
async function isAuthenticated(request: NextRequest): Promise<{ authenticated: boolean; user?: any }> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Criar cliente Supabase com token do usuário
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
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

// Função para obter configuração The Best do usuário
async function getUserTheBestConfig(userId: string): Promise<{
  success: boolean;
  config?: {
    baseUrl: string;
    apiKey: string;
    username?: string;
    password?: string;
  };
  error?: string;
}> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { data, error } = await supabase
      .from('thebest_configs')
      .select('api_url, api_key, username, password, config_data')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'Configuração The Best não encontrada para este usuário'
      };
    }

    const configData = data.config_data as any || {};

    return {
      success: true,
      config: {
        baseUrl: data.api_url,
        apiKey: data.api_key,
        username: data.username || configData.username,
        password: data.password || configData.password
      }
    };
  } catch (error) {
    console.error('Erro ao obter configuração The Best do usuário:', error);
    return {
      success: false,
      error: 'Erro interno ao obter configuração'
    };
  }
}

// Função para registrar log da API
async function logApiCall(userId: string, operation: string, success: boolean, responseData?: any, errorMessage?: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    await supabase
      .from('thebest_api_logs')
      .insert({
        user_id: userId,
        operation_type: operation,
        success,
        response_data: responseData,
        error_message: errorMessage,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Erro ao registrar log da API:', error);
  }
}

// POST - Proxy para API The Best
export async function POST(request: NextRequest) {
  try {
    // Rate limit para The Best
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs('1m'),
      max: 30, // 30 requisições por minuto
      namespace: 'proxy:thebest'
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
      'get_packages',
      'create_renewal',
      'get_renewal_status',
      'cancel_renewal',
      'get_user_renewals',
      'sync_packages',
      'test_connection'
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

    // Obter configuração The Best do usuário
    const configResult = await getUserTheBestConfig(authResult.user.id);
    if (!configResult.success || !configResult.config) {
      const configError = ErrorService.createError(
        ErrorType.CONFIGURATION,
        'Configuração The Best não encontrada. Configure sua chave API nas integrações.',
        'THEBEST_CONFIG_NOT_FOUND'
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

    const { baseUrl, apiKey, username, password } = configResult.config;

    // Preparar dados para The Best API
    const theBestData = {
      ...body,
      username: username,
      password: password,
      action: action
    };

    let theBestResponse;
    let responseData;
    let errorMessage;

    try {
      // Fazer requisição para API The Best
      theBestResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'User-Agent': 'Hub-Control/1.0'
        },
        body: JSON.stringify(theBestData),
        timeout: 30000 // 30 segundos de timeout
      });

      if (!theBestResponse.ok) {
        const errorText = await theBestResponse.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        errorMessage = `Erro na API The Best: ${theBestResponse.status} - ${theBestResponse.statusText}`;
        
        // Registrar log de erro
        await logApiCall(authResult.user.id, action, false, null, errorMessage);
        
        const appError = ErrorService.createError(
          theBestResponse.status >= 500 ? ErrorType.NETWORK : ErrorType.VALIDATION,
          errorMessage,
          `THEBEST_API_${theBestResponse.status}`,
          errorData
        );
        
        return NextResponse.json(
          { 
            error: appError.message,
            code: appError.code,
            timestamp: appError.timestamp,
            details: appError.details
          },
          { status: theBestResponse.status }
        );
      }

      responseData = await theBestResponse.json();
      
      // Registrar log de sucesso
      await logApiCall(authResult.user.id, action, true, responseData);
      
      // Atualizar last_used_at da configuração
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        );

        await supabase
          .from('thebest_configs')
          .update({ last_used_at: new Date().toISOString() })
          .eq('user_id', authResult.user.id)
          .eq('is_active', true);
      } catch (error) {
        // Log do erro mas não falha a requisição
        console.error('Erro ao atualizar last_used_at:', error);
      }

      return NextResponse.json(responseData);
      
    } catch (error) {
      errorMessage = `Erro de rede ao conectar com The Best API: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      
      // Registrar log de erro
      await logApiCall(authResult.user.id, action, false, null, errorMessage);
      
      const networkError = ErrorService.createError(
        ErrorType.NETWORK,
        'Erro de conexão com a API The Best. Verifique sua conexão e tente novamente.',
        'THEBEST_NETWORK_ERROR',
        { originalError: error instanceof Error ? error.message : 'Erro desconhecido' }
      );
      
      return NextResponse.json(
        { 
          error: networkError.message,
          code: networkError.code,
          timestamp: networkError.timestamp,
          details: networkError.details
        },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('Erro no proxy The Best:', error);
    
    const internalError = ErrorService.createError(
      ErrorType.INTERNAL,
      'Erro interno do servidor',
      'INTERNAL_SERVER_ERROR'
    );
    
    return NextResponse.json(
      { 
        error: internalError.message,
        code: internalError.code,
        timestamp: internalError.timestamp
      },
      { status: 500 }
    );
  }
}

// GET - Obter informações e status
export async function GET(request: NextRequest) {
  try {
    // Rate limit para GET
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs('1m'),
      max: 60, // 60 requisições por minuto para GET
      namespace: 'proxy:thebest:get'
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

    // Actions permitidas para GET
    const allowedGetActions = [
      'get_config_status',
      'get_packages',
      'get_user_renewals',
      'get_renewal_status',
      'test_connection'
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

    // Obter configuração The Best do usuário
    const configResult = await getUserTheBestConfig(authResult.user.id);
    
    if (action === 'get_config_status') {
      return NextResponse.json({
        configured: configResult.success,
        hasConfig: !!configResult.config,
        error: configResult.error
      });
    }

    if (!configResult.success || !configResult.config) {
      const configError = ErrorService.createError(
        ErrorType.CONFIGURATION,
        'Configuração The Best não encontrada. Configure sua chave API nas integrações.',
        'THEBEST_CONFIG_NOT_FOUND'
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

    const { baseUrl, apiKey } = configResult.config;

    // Para test_connection, fazer uma requisição simples
    if (action === 'test_connection') {
      try {
        const testResponse = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
            'User-Agent': 'Hub-Control/1.0'
          },
          timeout: 10000 // 10 segundos
        });

        const success = testResponse.ok;
        await logApiCall(authResult.user.id, 'test_connection', success);

        return NextResponse.json({
          success,
          status: testResponse.status,
          message: success ? 'Conexão estabelecida com sucesso' : 'Falha na conexão'
        });
      } catch (error) {
        await logApiCall(authResult.user.id, 'test_connection', false, null, error instanceof Error ? error.message : 'Erro desconhecido');
        
        return NextResponse.json({
          success: false,
          message: 'Erro de conexão com a API The Best'
        });
      }
    }

    // Para outras actions GET, fazer requisição normal
    try {
      const response = await fetch(`${baseUrl}?action=${action}`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'User-Agent': 'Hub-Control/1.0'
        },
        timeout: 30000
      });

      if (!response.ok) {
        const errorText = await response.text();
        await logApiCall(authResult.user.id, action, false, null, `HTTP ${response.status}: ${errorText}`);
        
        const appError = ErrorService.createError(
          response.status >= 500 ? ErrorType.NETWORK : ErrorType.VALIDATION,
          `Erro na API The Best: ${response.status} - ${response.statusText}`,
          `THEBEST_API_${response.status}`
        );
        
        return NextResponse.json(
          { 
            error: appError.message,
            code: appError.code,
            timestamp: appError.timestamp
          },
          { status: response.status }
        );
      }

      const responseData = await response.json();
      await logApiCall(authResult.user.id, action, true, responseData);
      
      return NextResponse.json(responseData);
      
    } catch (error) {
      await logApiCall(authResult.user.id, action, false, null, error instanceof Error ? error.message : 'Erro desconhecido');
      
      const networkError = ErrorService.createError(
        ErrorType.NETWORK,
        'Erro de conexão com a API The Best',
        'THEBEST_NETWORK_ERROR'
      );
      
      return NextResponse.json(
        { 
          error: networkError.message,
          code: networkError.code,
          timestamp: networkError.timestamp
        },
        { status: 503 }
      );
    }
    
  } catch (error) {
    console.error('Erro no proxy The Best (GET):', error);
    
    const internalError = ErrorService.createError(
      ErrorType.INTERNAL,
      'Erro interno do servidor',
      'INTERNAL_SERVER_ERROR'
    );
    
    return NextResponse.json(
      { 
        error: internalError.message,
        code: internalError.code,
        timestamp: internalError.timestamp
      },
      { status: 500 }
    );
  }
}