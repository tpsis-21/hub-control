import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route segura para operações de configuração NATV que requerem service role
 * Substitui o uso direto da service role key no frontend
 */

// Função auxiliar para verificar se o usuário é admin
async function isUserAdmin(userId: string) {
  try {
    const supabase = createApiSupabaseClient(false);
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    return profile?.role === 'admin';
  } catch (error) {
    logger.error('Erro ao verificar role de admin:', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

// Função auxiliar para obter o usuário autenticado
async function getAuthenticatedUser() {
  try {
    const supabase = createApiSupabaseClient(false);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Error('Usuário não autenticado');
    }

    return user;
  } catch (error) {
    throw new Error('Falha na autenticação');
  }
}

// GET /api/admin/natv-config - Busca configurações NATV (apenas admin)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Verificar se é admin
    if (!(await isUserAdmin(user.id))) {
      return NextResponse.json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar configurações NATV.',
        error: 'ADMIN_ACCESS_REQUIRED'
      }, { status: 403 });
    }

    // Usar service role para operações administrativas
    const supabaseAdmin = createApiSupabaseClient(true);
    
    const { data: configs, error } = await supabaseAdmin
      .from('integration_configs')
      .select('*')
      .eq('provider', 'natv')
      .eq('is_active', true);

    if (error) {
      logger.error('Erro ao buscar configurações NATV:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar configurações NATV',
        error: 'DATABASE_ERROR'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: configs
    });

  } catch (error) {
    logger.error('Erro na API de configurações NATV:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

// POST /api/admin/natv-config - Salva configuração NATV (apenas admin)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Verificar se é admin
    if (!(await isUserAdmin(user.id))) {
      return NextResponse.json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem configurar NATV.',
        error: 'ADMIN_ACCESS_REQUIRED'
      }, { status: 403 });
    }

    const body = await request.json();

    // Validação dos dados obrigatórios
    if (!body.baseUrl || typeof body.baseUrl !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'URL base da API NATV é obrigatória',
        error: 'MISSING_BASE_URL'
      }, { status: 400 });
    }

    if (!body.apiKey || typeof body.apiKey !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Chave da API NATV é obrigatória',
        error: 'MISSING_API_KEY'
      }, { status: 400 });
    }

    // Usar service role para operações administrativas
    const supabaseAdmin = createApiSupabaseClient(true);

    // Desativar configurações anteriores
    await supabaseAdmin
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'natv');

    // Inserir nova configuração
    const { data, error } = await supabaseAdmin
      .from('integration_configs')
      .insert({
        provider: 'natv',
        config: {
          baseUrl: body.baseUrl,
          apiKey: body.apiKey,
          environment: body.environment || 'production'
        },
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao salvar configuração NATV:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json({
        success: false,
        message: 'Erro ao salvar configuração NATV',
        error: 'DATABASE_ERROR'
      }, { status: 500 });
    }

    logger.info('Configuração NATV salva com sucesso', { userId: user.id, configId: data.id });

    return NextResponse.json({
      success: true,
      message: 'Configuração NATV salva com sucesso',
      data
    });

  } catch (error) {
    logger.error('Erro na API de configuração NATV:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

// DELETE /api/admin/natv-config - Remove configuração NATV (apenas admin)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Verificar se é admin
    if (!(await isUserAdmin(user.id))) {
      return NextResponse.json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem remover configurações NATV.',
        error: 'ADMIN_ACCESS_REQUIRED'
      }, { status: 403 });
    }

    // Usar service role para operações administrativas
    const supabaseAdmin = createApiSupabaseClient(true);

    const { error } = await supabaseAdmin
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'natv');

    if (error) {
      logger.error('Erro ao remover configuração NATV:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json({
        success: false,
        message: 'Erro ao remover configuração NATV',
        error: 'DATABASE_ERROR'
      }, { status: 500 });
    }

    logger.info('Configuração NATV removida com sucesso', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Configuração NATV removida com sucesso'
    });

  } catch (error) {
    logger.error('Erro na API de remoção NATV:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}
