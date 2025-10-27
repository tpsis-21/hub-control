import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/clients/server";
import { format } from "date-fns";
import { createStandardErrorResponse, attachSecurityHeaders } from "@/middleware/shared/helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      level: searchParams.get('level') || undefined,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userId: searchParams.get('userId') || undefined
    };

    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return attachSecurityHeaders(
        createStandardErrorResponse('Não autorizado', 'Faça login para continuar.', 401)
      )
    }

    // Verificar permissões de admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return attachSecurityHeaders(
        createStandardErrorResponse('Acesso negado', 'Você não tem permissão para exportar logs.', 403)
      )
    }

    // Construir query para exportação
    let query = supabase
      .from('audit_logs')
      .select(`
        created_at,
        action,
        table_name,
        record_id,
        user_id,
        ip_address,
        user_agent,
        old_values,
        new_values
      `);

    // Aplicar filtros
    if (filters.search) {
      query = query.or(`action.ilike.%${filters.search}%,table_name.ilike.%${filters.search}%,record_id.ilike.%${filters.search}%`);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    if (filters.userId) {
      query = query.eq('user_id', filters.userId);
    }

    // Ordenar por created_at
    query = query.order('created_at', { ascending: false });

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error('Erro ao buscar logs para exportação:', logsError);
      throw new Error('Erro ao buscar logs');
    }

    // Gerar CSV
    const csvHeaders = [
      'Data/Hora',
      'Ação',
      'Tabela',
      'ID do Registro',
      'Usuário ID',
      'IP',
      'User Agent',
      'Valores Antigos',
      'Valores Novos'
    ];

    const csvRows = logs?.map((log: any) => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      log.action || '',
      log.table_name || '',
      log.record_id || '',
      log.user_id || '',
      log.ip_address || '',
      `"${(log.user_agent || '').replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.old_values || {}).replace(/"/g, '""')}"`,
      `"${JSON.stringify(log.new_values || {}).replace(/"/g, '""')}"`
    ]) || [];

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any) => row.join(','))
    ].join('\n');

    return attachSecurityHeaders(
      new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="logs_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv"`
        }
      })
    );

  } catch (error) {
    console.error('Erro ao exportar logs:', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('Erro interno do servidor', 'Ocorreu um erro ao exportar os logs.', 500)
    )
  }
}
