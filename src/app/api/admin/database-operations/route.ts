import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route para operações de banco de dados que requerem service role
 * Substitui o uso direto da service role key no frontend
 */

export async function POST(request: NextRequest) {
  try {
    const { operation, table, data, filters } = await request.json();
    
    // Verificar autenticação do usuário
    const supabaseAnon = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário tem permissão para operações administrativas
    const { data: profile } = await supabaseAnon
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'manager'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Acesso negado - permissões insuficientes' },
        { status: 403 }
      );
    }

    // Cliente com service role para operações privilegiadas
    const supabaseAdmin = createApiSupabaseClient(true);

    switch (operation) {
      case 'select':
        return await handleSelect(supabaseAdmin, table, filters);
      
      case 'insert':
        return await handleInsert(supabaseAdmin, table, data);
      
      case 'update':
        return await handleUpdate(supabaseAdmin, table, data, filters);
      
      case 'delete':
        return await handleDelete(supabaseAdmin, table, filters);
      
      case 'upsert':
        return await handleUpsert(supabaseAdmin, table, data);
      
      case 'rpc':
        return await handleRpc(supabaseAdmin, data);
      
      default:
        return NextResponse.json(
          { error: 'Operação não suportada' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Erro na operação de banco:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function handleSelect(supabase: any, table: string, filters: any = {}) {
  try {
    let query = supabase.from(table).select(filters.select || '*');
    
    // Aplicar filtros
    if (filters.eq) {
      Object.entries(filters.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters.order) {
      query = query.order(filters.order.column, { ascending: filters.order.ascending });
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Erro no select:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha na consulta' },
      { status: 500 }
    );
  }
}

// Função para INSERT
async function handleInsert(supabase: any, table: string, data: any) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data)
      .select();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erro no insert:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha na inserção' },
      { status: 500 }
    );
  }
}

async function handleUpdate(supabase: any, table: string, data: any, filters: any) {
  try {
    let query = supabase.from(table).update(data);
    
    // Aplicar filtros para o update
    if (filters.eq) {
      Object.entries(filters.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { data: result, error } = await query.select();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erro no update:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha na atualização' },
      { status: 500 }
    );
  }
}

async function handleDelete(supabase: any, table: string, filters: any) {
  try {
    let query = supabase.from(table).delete();
    
    // Aplicar filtros para o delete
    if (filters.eq) {
      Object.entries(filters.eq).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }
    
    const { error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Registro(s) removido(s) com sucesso'
    });
  } catch (error) {
    logger.error('Erro no delete:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha na remoção' },
      { status: 500 }
    );
  }
}

async function handleUpsert(supabase: any, table: string, data: any) {
  try {
    const { data: result, error } = await supabase
      .from(table)
      .upsert(data)
      .select();
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erro no upsert:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha no upsert' },
      { status: 500 }
    );
  }
}

async function handleRpc(supabase: any, data: any) {
  try {
    const { function_name, params = {} } = data;
    
    const { data: result, error } = await supabase.rpc(function_name, params);
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erro no RPC:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha na execução da função' },
      { status: 500 }
    );
  }
}
