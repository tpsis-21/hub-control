// src/app/api/natv/test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/clients/server';
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers';
import { ErrorService, ErrorType } from '@/services/error.service';
import { logger } from '@/utils/production-logger';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return attachSecurityHeaders(
        createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401)
      );
    }

    // Buscar configuração NATV do usuário
    const { data: config, error: configError } = await supabase
      .from('integration_configs')
      .select('base_url, auth_token, config_data')
      .eq('provider', 'natv')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .single();

    if (configError || !config) {
      return attachSecurityHeaders(
        createStandardErrorResponse(
          'NATV_CONFIG_NOT_FOUND',
          'Configuração NATV não encontrada. Configure sua API key nas integrações.',
          404
        )
      );
    }

    // Testar conexão com NATV
    try {
      const testResponse = await fetch(`${config.base_url}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.auth_token}`
        },
        body: JSON.stringify({
          action: 'test_connection'
        })
      });

      const result = await testResponse.json();

      if (!testResponse.ok) {
        logger.error('NATV API Test Failed', {
          status: testResponse.status,
          response: result,
          userId: user.id
        });

        return attachSecurityHeaders(
          createStandardErrorResponse(
            'NATV_API_ERROR',
            result.message || 'Erro ao testar conexão com NATV',
            testResponse.status >= 500 ? 503 : 400
          )
        );
      }

      // Atualizar última utilização
      await supabase
        .from('integration_configs')
        .update({ last_used: new Date().toISOString() })
        .eq('provider', 'natv')
        .eq('created_by', user.id);

      logger.info('NATV Connection Test Success', {
        userId: user.id,
        baseUrl: config.base_url
      });

      return attachSecurityHeaders(
        createStandardSuccessResponse({
          success: true,
          message: 'Conexão com NATV estabelecida com sucesso',
          data: result
        })
      );

    } catch (error) {
      const appError = ErrorService.fromNativeError(error);
      ErrorService.logError(appError, 'NATV API Test Connection');

      return attachSecurityHeaders(
        createStandardErrorResponse(
          'NATV_CONNECTION_ERROR',
          'Erro ao conectar com a API NATV. Verifique sua configuração.',
          503
        )
      );
    }

  } catch (error) {
    const appError = ErrorService.fromNativeError(error);
    ErrorService.logError(appError, 'NATV Test API');

    return attachSecurityHeaders(
      createStandardErrorResponse(
        'INTERNAL_ERROR',
        'Erro interno do servidor',
        500
      )
    );
  }
}
