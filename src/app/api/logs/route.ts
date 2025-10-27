import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/clients/server";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { 
  createStandardErrorResponse, 
  createStandardSuccessResponse, 
  attachSecurityHeaders 
} from '@/middleware/shared/helpers';

interface LogFilters {
  level?: string;
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters: LogFilters = {
      level: searchParams.get('level') || undefined,
      type: searchParams.get('type') || undefined,
      search: searchParams.get('search') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userId: searchParams.get('userId') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    };

    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar permissões de admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Construir query base
    let query = supabase
      .from('audit_logs')
      .select(`
        id,
        created_at,
        action,
        user_id,
        user_email,
        ip_address,
        user_agent,
        table_name,
        record_id,
        old_values,
        new_values,
        severity,
        description,
        metadata
      `, { count: 'exact' });

    // Aplicar filtros
    if (filters.level && filters.level !== 'all') {
      query = query.eq('level', filters.level);
    }

    if (filters.type && filters.type !== 'all') {
      query = query.eq('type', filters.type);
    }

    if (filters.search) {
      query = query.or(`message.ilike.%${filters.search}%,user_email.ilike.%${filters.search}%,action.ilike.%${filters.search}%`);
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

    // Aplicar paginação e ordenação
    const offset = ((filters.page || 1) - 1) * (filters.limit || 50);
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + (filters.limit || 50) - 1);

    const { data: logs, error: logsError, count } = await query;

    if (logsError) {
      console.error('Erro ao buscar logs:', logsError);
      throw new Error('Erro ao buscar logs');
    }

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page: filters.page || 1,
      limit: filters.limit || 50,
      totalPages: Math.ceil((count || 0) / (filters.limit || 50))
    });

  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      level,
      type,
      message,
      action,
      resource,
      details,
      metadata
    } = body;

    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Obter informações do usuário
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    // Obter IP do request
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
    
    // Obter User-Agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Criar log
    const { data: log, error: logError } = await supabase
      .from('audit_logs')
      .insert({
        level: level || 'info',
        type: type || 'system',
        message,
        user_id: user.id,
        user_email: user.email,
        ip_address: ip,
        user_agent: userAgent,
        action,
        resource,
        details,
        metadata
      })
      .select()
      .single();

    if (logError) {
      console.error('Erro ao criar log:', logError);
      throw new Error('Erro ao criar log');
    }

    return NextResponse.json({ log });

  } catch (error) {
    console.error('Erro ao criar log:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
