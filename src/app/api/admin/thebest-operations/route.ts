import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route segura para operações TheBest que requerem service role
 * Substitui o uso direto da service role key no frontend
 */

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const operation = searchParams.get('operation');

    switch (operation) {
      case 'get_config':
        return await getUserTheBestConfig(user.id);
      
      case 'test_connection':
        return await testTheBestConnection(user.id);
        
      default:
        return NextResponse.json(
          { error: 'Operação não suportada' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Erro na API de operações TheBest:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

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
    const { operation, data } = body;

    switch (operation) {
      case 'save_config':
        return await saveTheBestConfig(user.id, data);
        
      case 'delete_config':
        return await deleteTheBestConfig(user.id);
        
      default:
        return NextResponse.json(
          { error: 'Operação não suportada' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Erro na API de operações TheBest:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function getUserTheBestConfig(userId: string) {
  try {
    const supabase = createApiSupabaseClient(false);
    
    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('provider', 'thebest')
      .eq('created_by', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Erro ao buscar configuração TheBest:', error);
      return NextResponse.json(
        { error: 'Erro ao buscar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || null
    });

  } catch (error) {
    logger.error('Erro ao obter configuração TheBest:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}

async function saveTheBestConfig(userId: string, configData: any) {
  try {
    const supabase = createApiSupabaseClient(true); // Usar service role para operações de escrita
    
    const { data, error } = await supabase
      .from('integration_configs')
      .upsert({
        provider: 'thebest',
        base_url: configData.apiUrl,
        auth_token: configData.apiKey,
        config_data: {
          username: configData.username,
          password: configData.password,
          timeout: configData.timeout || 30000
        },
        created_by: userId,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'provider,created_by'
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao salvar configuração TheBest:', error);
      return NextResponse.json(
        { error: 'Erro ao salvar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    logger.error('Erro ao salvar configuração TheBest:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}

async function deleteTheBestConfig(userId: string) {
  try {
    const supabase = createApiSupabaseClient(true); // Usar service role para operações de exclusão
    
    const { error } = await supabase
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'thebest')
      .eq('created_by', userId);

    if (error) {
      logger.error('Erro ao deletar configuração TheBest:', error);
      return NextResponse.json(
        { error: 'Erro ao deletar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração removida com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao deletar configuração TheBest:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno' },
      { status: 500 }
    );
  }
}

async function testTheBestConnection(userId: string) {
  try {
    // Buscar configuração do usuário
    const configResponse = await getUserTheBestConfig(userId);
    const configData = await configResponse.json();
    
    if (!configData.success || !configData.data) {
      return NextResponse.json({
        success: false,
        message: 'Configuração TheBest não encontrada'
      });
    }

    const config = configData.data;
    
    // Fazer teste de conexão via proxy
    const testResponse = await fetch('/api/proxy/thebest?action=test_connection', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const testResult = await testResponse.json();
    
    return NextResponse.json({
      success: testResult.success || testResponse.ok,
      message: testResult.message || (testResponse.ok ? 'Conexão estabelecida com sucesso!' : 'Erro na conexão'),
      data: testResult
    });

  } catch (error) {
    logger.error('Erro ao testar conexão TheBest:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      message: 'Erro ao testar conexão'
    });
  }
}