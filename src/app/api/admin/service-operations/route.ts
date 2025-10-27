import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/unified-client';
import { logger } from '@/lib/logger';

/**
 * API Route para operações administrativas que requerem service role
 * Esta rota centraliza operações que antes eram feitas diretamente no frontend
 */

export async function POST(request: NextRequest) {
  try {
    const { operation, data } = await request.json();
    
    // Verificar autenticação do usuário
    const supabaseAnon = createApiSupabaseClient(false);
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Verificar se o usuário é admin
    const { data: profile } = await supabaseAnon
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Acesso negado - apenas administradores' },
        { status: 403 }
      );
    }

    // Cliente com service role para operações administrativas
    const supabaseAdmin = createApiSupabaseClient(true);

    switch (operation) {
      case 'backup_database':
        return await handleBackupDatabase(supabaseAdmin);
      
      case 'optimize_database':
        return await handleOptimizeDatabase(supabaseAdmin);
      
      case 'cleanup_logs':
        return await handleCleanupLogs(supabaseAdmin, data);
      
      case 'system_maintenance':
        return await handleSystemMaintenance(supabaseAdmin, data);
      
      default:
        return NextResponse.json(
          { error: 'Operação não suportada' },
          { status: 400 }
        );
    }

  } catch (error) {
    logger.error('Erro na operação administrativa:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

async function handleBackupDatabase(supabase: any) {
  try {
    // Implementar lógica de backup
    const { data, error } = await supabase.rpc('create_backup');
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Backup criado com sucesso',
      data
    });
  } catch (error) {
    logger.error('Erro no backup:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha ao criar backup' },
      { status: 500 }
    );
  }
}

async function handleOptimizeDatabase(supabase: any) {
  try {
    // Implementar otimização do banco
    const { data, error } = await supabase.rpc('optimize_database');
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: 'Otimização concluída',
      data
    });
  } catch (error) {
    logger.error('Erro na otimização:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha na otimização' },
      { status: 500 }
    );
  }
}

async function handleCleanupLogs(supabase: any, data: any) {
  try {
    const { days = 30 } = data;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { error } = await supabase
      .from('system_logs')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
    
    if (error) throw error;
    
    return NextResponse.json({
      success: true,
      message: `Logs anteriores a ${days} dias foram removidos`
    });
  } catch (error) {
    logger.error('Erro na limpeza de logs:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha na limpeza de logs' },
      { status: 500 }
    );
  }
}

async function handleSystemMaintenance(supabase: any, data: any) {
  try {
    const { tasks = [] } = data;
    const results = [];
    
    for (const task of tasks) {
      switch (task.type) {
        case 'vacuum':
          await supabase.rpc('vacuum_tables');
          results.push({ task: 'vacuum', status: 'completed' });
          break;
        case 'reindex':
          await supabase.rpc('reindex_tables');
          results.push({ task: 'reindex', status: 'completed' });
          break;
        default:
          results.push({ task: task.type, status: 'skipped' });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Manutenção concluída',
      results
    });
  } catch (error) {
    logger.error('Erro na manutenção:', error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: 'Falha na manutenção' },
      { status: 500 }
    );
  }
}
