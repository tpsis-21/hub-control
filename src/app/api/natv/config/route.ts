import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route para gerenciar configurações NATV de forma segura
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

    // Buscar configuração NATV do usuário
    const { data, error } = await supabase
      .from('integration_configs')
      .select('*')
      .eq('provider', 'natv')
      .eq('created_by', user.id)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Erro ao buscar configuração NATV:', error instanceof Error ? error : new Error(String(error)));
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
    logger.error('Erro na API de configuração NATV:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const configData = await request.json();
    
    // Verificar autenticação do usuário
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // SEGURANÇA: Redirecionar para API administrativa segura
    // Esta operação agora deve ser feita através da API /api/admin/natv-config
    return NextResponse.json({
      success: false,
      message: 'Esta operação foi movida para /api/admin/natv-config por motivos de segurança',
      error: 'OPERATION_MOVED',
      redirect: '/api/admin/natv-config'
    }, { status: 301 });

    // CÓDIGO REMOVIDO POR SEGURANÇA - não usar service role no frontend
    // const adminSupabase = createApiSupabaseClient(true);

    // CÓDIGO REMOVIDO - operação movida para API administrativa segura

  } catch (error) {
    logger.error('Erro na criação de configuração NATV:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const configData = await request.json();
    
    // Verificar autenticação do usuário
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Atualizar configuração existente
    const { data, error } = await supabase
      .from('integration_configs')
      .update(configData)
      .eq('provider', 'natv')
      .eq('created_by', user.id)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao atualizar configuração NATV:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json(
        { error: 'Erro ao atualizar configuração' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    logger.error('Erro na atualização de configuração NATV:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    
    // Verificar autenticação do usuário
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Deletar configuração
    const { error } = await supabase
      .from('integration_configs')
      .delete()
      .eq('id', id)
      .eq('created_by', user.id);

    if (error) {
      logger.error('Erro ao deletar configuração NATV:', error instanceof Error ? error : new Error(String(error)));
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
    logger.error('Erro na remoção de configuração NATV:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
