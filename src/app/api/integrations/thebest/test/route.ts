import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route para testar conexão TheBest de forma segura
 */

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação do usuário
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { config } = body;

    if (!config || !config.apiUrl || !config.apiKey) {
      return NextResponse.json(
        { error: 'Configuração incompleta' },
        { status: 400 }
      );
    }

    // Testar conexão com a API TheBest
    const testUrl = `${config.apiUrl}/test`;
    const testResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(config.timeout || 30000),
    });

    if (!testResponse.ok) {
      return NextResponse.json({
        success: false,
        message: `Erro na conexão: ${testResponse.status} ${testResponse.statusText}`,
        error: 'CONNECTION_FAILED'
      });
    }

    const testData = await testResponse.text();

    return NextResponse.json({
      success: true,
      message: 'Conexão testada com sucesso!',
      data: testData
    });

  } catch (error) {
    logger.error('Erro no teste de conexão TheBest:', error instanceof Error ? error : new Error(String(error)));
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({
        success: false,
        message: 'Timeout na conexão com a API',
        error: 'TIMEOUT'
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Erro interno no teste de conexão',
      error: 'INTERNAL_ERROR'
    });
  }
}