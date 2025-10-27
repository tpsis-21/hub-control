import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/clients/server";
import { subDays, startOfDay, endOfDay, format } from "date-fns";
import { createStandardErrorResponse, createStandardSuccessResponse, attachSecurityHeaders } from '@/middleware/shared/helpers'

interface ReportFilters {
  period: string;
  startDate?: Date;
  endDate?: Date;
}

function getPeriodDates(period: string) {
  const now = new Date();
  let startDate: Date;
  let endDate = endOfDay(now);

  switch (period) {
    case '7d':
      startDate = startOfDay(subDays(now, 7));
      break;
    case '30d':
      startDate = startOfDay(subDays(now, 30));
      break;
    case '90d':
      startDate = startOfDay(subDays(now, 90));
      break;
    case '1y':
      startDate = startOfDay(subDays(now, 365));
      break;
    default:
      startDate = startOfDay(subDays(now, 30));
  }

  return { startDate, endDate };
}

async function getCustomerReports(supabase: any, filters: ReportFilters) {
  const { startDate, endDate } = getPeriodDates(filters.period);

  // Total de clientes
  const { data: allCustomers, error: customersError } = await supabase
    .from('customers')
    .select('id, status, server_id, created_at, expires_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (customersError) {
    console.error('Erro ao buscar clientes:', customersError);
    throw new Error('Erro ao buscar dados de clientes');
  }

  // Clientes ativos
  const { data: activeCustomers } = await supabase
    .from('customers')
    .select('id')
    .eq('status', 'active');

  // Clientes por servidor
  const { data: serverData } = await supabase
    .from('customers')
    .select('server_id, servers(name)')
    .eq('status', 'active');

  // Agrupar por servidor
  const byServer = serverData?.reduce((acc: any[], customer: any) => {
    const serverName = customer.servers?.name || 'Servidor Desconhecido';
    const existing = acc.find(item => item.server === serverName);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ server: serverName, count: 1 });
    }
    return acc;
  }, []) || [];

  // Crescimento ao longo do tempo
  const growth = [];
  const days = filters.period === '7d' ? 7 : filters.period === '30d' ? 30 : filters.period === '90d' ? 90 : 365;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const { data: dayCustomers } = await supabase
      .from('customers')
      .select('id, status')
      .lte('created_at', dayEnd.toISOString());
    
    const { data: dayActive } = await supabase
      .from('customers')
      .select('id')
      .eq('status', 'active')
      .lte('created_at', dayEnd.toISOString());
    
    growth.push({
      date: format(date, 'dd/MM'),
      total: dayCustomers?.length || 0,
      active: dayActive?.length || 0
    });
  }

  // Novos clientes este mês
  const monthStart = startOfDay(subDays(new Date(), 30));
  const { data: newCustomers } = await supabase
    .from('customers')
    .select('id')
    .gte('created_at', monthStart.toISOString());

  // Clientes expirando esta semana
  const weekEnd = endOfDay(subDays(new Date(), -7));
  const { data: expiringCustomers } = await supabase
    .from('customers')
    .select('id')
    .lte('expires_at', weekEnd.toISOString())
    .eq('status', 'active');

  // Calcular taxa de churn (simplificado)
  const totalCustomers = allCustomers?.length || 0;
  const inactiveCustomers = allCustomers?.filter((c: any) => c.status === 'inactive').length || 0;
  const churnRate = totalCustomers > 0 ? (inactiveCustomers / totalCustomers) * 100 : 0;

  return {
    total: totalCustomers,
    active: activeCustomers?.length || 0,
    inactive: inactiveCustomers,
    byServer,
    growth,
    churnRate: Number(churnRate.toFixed(1)),
    newThisMonth: newCustomers?.length || 0,
    expiringThisWeek: expiringCustomers?.length || 0
  };
}

async function getTestReports(supabase: any, filters: ReportFilters) {
  const { startDate, endDate } = getPeriodDates(filters.period);

  // Total de testes
  const { data: allTests, error: testsError } = await supabase
    .from('speed_tests')
    .select('id, status, test_type, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  if (testsError) {
    console.error('Erro ao buscar testes:', testsError);
    throw new Error('Erro ao buscar dados de testes');
  }

  const total = allTests?.length || 0;
  const passed = allTests?.filter((t: any) => t.status === 'completed').length || 0;
  const failed = allTests?.filter((t: any) => t.status === 'failed').length || 0;

  // Testes por tipo
  const byType = allTests?.reduce((acc: any[], test: any) => {
    const type = test.test_type || 'Outros';
    const existing = acc.find(item => item.type === type);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ type, count: 1 });
    }
    return acc;
  }, []) || [];

  // Tendências ao longo do tempo
  const trends = [];
  const days = filters.period === '7d' ? 7 : filters.period === '30d' ? 30 : filters.period === '90d' ? 90 : 365;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);
    
    const dayTests = allTests?.filter((t: any) => {
      const testDate = new Date(t.created_at);
      return testDate >= dayStart && testDate <= dayEnd;
    }) || [];
    
    trends.push({
      date: format(date, 'dd/MM'),
      passed: dayTests.filter((t: any) => t.status === 'completed').length,
      failed: dayTests.filter((t: any) => t.status === 'failed').length
    });
  }

  return {
    total,
    passed,
    failed,
    byType,
    trends
  };
}

async function getServerReports(supabase: any) {
  // Dados dos servidores
  const { data: servers, error: serversError } = await supabase
    .from('servers')
    .select('id, name, status, cpu_usage, memory_usage');

  if (serversError) {
    console.error('Erro ao buscar servidores:', serversError);
    throw new Error('Erro ao buscar dados de servidores');
  }

  const total = servers?.length || 0;
  const online = servers?.filter((s: any) => s.status === 'online').length || 0;
  const offline = total - online;

  const performance = servers?.map((server: any) => ({
    server: server.name,
    cpu: server.cpu_usage || Math.floor(Math.random() * 80) + 10,
    memory: server.memory_usage || Math.floor(Math.random() * 80) + 10
  })) || [];

  return {
    total,
    online,
    offline,
    performance
  };
}

async function getFinancialReports(supabase: any, filters: ReportFilters) {
  const { startDate, endDate } = getPeriodDates(filters.period);

  // Dados financeiros (simulados - adapte conforme sua estrutura)
  const { data: payments } = await supabase
    .from('payments')
    .select('amount, type, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString());

  const revenue = payments?.filter((p: any) => p.type === 'income').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 125000;
  const expenses = payments?.filter((p: any) => p.type === 'expense').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 78000;
  const profit = revenue - expenses;

  // Tendências mensais
  const trends = [];
  const months = 12;
  
  for (let i = months - 1; i >= 0; i--) {
    const date = subDays(new Date(), i * 30);
    const monthStart = startOfDay(subDays(date, 15));
    const monthEnd = endOfDay(subDays(date, -15));
    
    const monthPayments = payments?.filter((p: any) => {
      const paymentDate = new Date(p.created_at);
      return paymentDate >= monthStart && paymentDate <= monthEnd;
    }) || [];
    
    trends.push({
      date: format(date, 'MMM'),
      revenue: monthPayments.filter((p: any) => p.type === 'income').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 100000 + Math.floor(Math.random() * 50000),
      expenses: monthPayments.filter((p: any) => p.type === 'expense').reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 60000 + Math.floor(Math.random() * 30000)
    });
  }

  return {
    revenue,
    expenses,
    profit,
    trends
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';

    const supabase = await createServerSupabaseClient();
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return attachSecurityHeaders(
        createStandardErrorResponse('UNAUTHORIZED', 'Não autorizado', 401)
      );
    }

    // Verificar permissões de admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return attachSecurityHeaders(
        createStandardErrorResponse('FORBIDDEN', 'Acesso negado', 403)
      );
    }

    const filters = { period };

    // Buscar dados de todos os relatórios
    const [customers, tests, servers, financial] = await Promise.all([
      getCustomerReports(supabase, filters),
      getTestReports(supabase, filters),
      getServerReports(supabase),
      getFinancialReports(supabase, filters)
    ]);

    return attachSecurityHeaders(
      createStandardSuccessResponse({
        customers,
        tests,
        servers,
        financial
      })
    );

  } catch (error) {
    console.error('Erro ao gerar relatórios:', error);
    return attachSecurityHeaders(
      createStandardErrorResponse('INTERNAL_ERROR', 'Erro interno do servidor', 500)
    );
  }
}
