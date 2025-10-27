import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route segura para operações de configuração BPIX que requerem service role
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

// GET /api/admin/bpix-config - Busca configurações BPIX (apenas admin)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Verificar se é admin
    if (!(await isUserAdmin(user.id))) {
      return NextResponse.json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar configurações BPIX.',
        error: 'ADMIN_ACCESS_REQUIRED'
      }, { status: 403 });
    }

    // Usar service role para operações administrativas
    const supabaseAdmin = createApiSupabaseClient(true);
    
    const { data: configs, error } = await supabaseAdmin
      .from('integration_configs')
      .select('*')
      .eq('provider', 'bpix')
      .eq('is_active', true);

    if (error) {
      logger.error('Erro ao buscar configurações BPIX:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json({
        success: false,
        message: 'Erro ao buscar configurações BPIX',
        error: 'DATABASE_ERROR'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: configs
    });

  } catch (error) {
    logger.error('Erro na API de configurações BPIX:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

// POST /api/admin/bpix-config - Salva configuração BPIX (apenas admin)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Verificar se é admin
    if (!(await isUserAdmin(user.id))) {
      return NextResponse.json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem configurar BPIX.',
        error: 'ADMIN_ACCESS_REQUIRED'
      }, { status: 403 });
    }

    const body = await request.json();

    // Validação dos dados obrigatórios
    if (!body.baseUrl || typeof body.baseUrl !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'URL base da API BPIX é obrigatória',
        error: 'MISSING_BASE_URL'
      }, { status: 400 });
    }

    if (!body.token || typeof body.token !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Token de autenticação BPIX é obrigatório',
        error: 'MISSING_TOKEN'
      }, { status: 400 });
    }

    // Usar service role para operações administrativas
    const supabaseAdmin = createApiSupabaseClient(true);

    // Desativar configurações anteriores
    await supabaseAdmin
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'bpix');

    // Inserir nova configuração
    const { data, error } = await supabaseAdmin
      .from('integration_configs')
      .insert({
        provider: 'bpix',
        config: {
          baseUrl: body.baseUrl,
          token: body.token,
          environment: body.environment || 'production'
        },
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      logger.error('Erro ao salvar configuração BPIX:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json({
        success: false,
        message: 'Erro ao salvar configuração BPIX',
        error: 'DATABASE_ERROR'
      }, { status: 500 });
    }

    logger.info('Configuração BPIX salva com sucesso', { userId: user.id, configId: data.id });

    return NextResponse.json({
      success: true,
      message: 'Configuração BPIX salva com sucesso',
      data
    });

  } catch (error) {
    logger.error('Erro na API de configuração BPIX:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}

// DELETE /api/admin/bpix-config - Remove configuração BPIX (apenas admin)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    
    // Verificar se é admin
    if (!(await isUserAdmin(user.id))) {
      return NextResponse.json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem remover configurações BPIX.',
        error: 'ADMIN_ACCESS_REQUIRED'
      }, { status: 403 });
    }

    // Usar service role para operações administrativas
    const supabaseAdmin = createApiSupabaseClient(true);

    const { error } = await supabaseAdmin
      .from('integration_configs')
      .update({ is_active: false })
      .eq('provider', 'bpix');

    if (error) {
      logger.error('Erro ao remover configuração BPIX:', error instanceof Error ? error : new Error(String(error)));
      return NextResponse.json({
        success: false,
        message: 'Erro ao remover configuração BPIX',
        error: 'DATABASE_ERROR'
      }, { status: 500 });
    }

    logger.info('Configuração BPIX removida com sucesso', { userId: user.id });

    return NextResponse.json({
      success: true,
      message: 'Configuração BPIX removida com sucesso'
    });

  } catch (error) {
    logger.error('Erro na API de remoção BPIX:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json({
      success: false,
      message: 'Erro interno do servidor',
      error: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}
