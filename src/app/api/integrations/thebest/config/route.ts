import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route para gerenciar configurações TheBest de forma segura
 * Substitui o acesso direto ao banco de dados no frontend
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

    // Buscar configuração TheBest do usuário
    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('provider', 'thebest')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Erro ao buscar configuração TheBest:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { error: 'Erro ao buscar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || null,
      error: null
    });

  } catch (error) {
    logger.error('Erro na API de configuração TheBest:', error instanceof Error ? error : new Error(String(error)));
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
    const { config } = body;

    if (!config) {
      return NextResponse.json(
        { error: 'Configuração é obrigatória' },
        { status: 400 }
      );
    }

    // Verificar se já existe configuração
    const { data: existingConfig } = await supabase
      .from('integration_configs')
      .select('id')
      .eq('provider', 'thebest')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .single();

    const configData = {
      provider: 'thebest',
      name: 'The Best API',
      base_url: config.apiUrl,
      auth_token: config.apiKey,
      auth_type: 'bearer',
      config_data: {
        username: config.username,
        password: config.password,
        timeout: config.timeout
      },
      is_active: true,
      updated_at: new Date().toISOString(),
      created_by: user.id,
      updated_by: user.id
    };

    let result;
    if (existingConfig) {
      // Atualizar configuração existente
      result = await supabase
        .from('integration_configs')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single();
    } else {
      // Criar nova configuração
      result = await supabase
        .from('integration_configs')
        .insert({
          ...configData,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
    }

    if (result.error) {
      logger.error('Erro ao salvar configuração TheBest:', result.error);
      return NextResponse.json(
        { error: 'Erro ao salvar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      error: null
    });

  } catch (error) {
    logger.error('Erro na API de configuração TheBest:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Desativar configuração (soft delete)
    const { error } = await supabase
      .from('integration_configs')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('provider', 'thebest')
      .eq('created_by', user.id);

    if (error) {
      logger.error('Erro ao remover configuração TheBest:', error);
      return NextResponse.json(
        { error: 'Erro ao remover configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração removida com sucesso'
    });

  } catch (error) {
    logger.error('Erro na API de configuração TheBest:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}