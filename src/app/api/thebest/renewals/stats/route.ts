import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
import { logger } from '@/utils/production-logger';

// Cliente Supabase consolidado para API routes
const supabase = createApiSupabaseClient();

/**
 * GET /api/thebest/renewals/stats
 * Busca estatísticas de renovações do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id é obrigatório' },
        { status: 400 }
      );
    }
    
    logger.debug('Fetching renewal stats', {
      userId
    }, 'API');
    
    // Buscar estatísticas de renovações através da config do usuário
    const { data: renewalStats, error: renewalError } = await supabase
      .from('thebest_renewals')
      .select(`
        id,
        amount,
        currency,
        status,
        renewal_date,
        processed_at,
        created_at,
        package_creditos,
        config_id,
        thebest_configs!inner(
          user_id
        )
      `)
      .eq('thebest_configs.user_id', userId);
    
    if (renewalError) {
      throw new Error(`Erro ao buscar renovações: ${renewalError.message}`);
    }
    
    // Buscar total de pacotes ativos do usuário
    const { data: packagesData, error: packagesError } = await supabase
      .from('thebest_packages')
      .select(`
        id,
        name,
        price,
        currency,
        is_active,
        creditos,
        created_at,
        config_id,
        thebest_configs!inner(
          user_id
        )
      `)
      .eq('is_active', true)
      .eq('thebest_configs.user_id', userId);
    
    if (packagesError) {
      throw new Error(`Erro ao buscar pacotes: ${packagesError.message}`);
    }
    
    // Verificar se os dados são válidos e fazer type assertion
    if (!Array.isArray(renewalStats)) {
      throw new Error('Dados de renovações inválidos');
    }

    if (!Array.isArray(packagesData)) {
      throw new Error('Dados de pacotes inválidos');
    }

    // Type assertion para garantir que temos os dados corretos
    const validRenewalStats = renewalStats as unknown as Array<{
      id: string;
      amount: number;
      currency: string;
      status: string;
      renewal_date: string;
      processed_at: string | null;
      created_at: string;
      package_creditos: number;
      config_id: string;
    }>;

    const validPackagesData = packagesData as unknown as Array<{
      id: string;
      name: string;
      price: number;
      currency: string;
      is_active: boolean;
      creditos: number;
      created_at: string;
      config_id: string;
    }>;
    
    // Calcular estatísticas
    const totalRenewals = validRenewalStats.length;
    const totalCredits = validRenewalStats.reduce((sum, renewal) => {
      return sum + (renewal.package_creditos || 0);
    }, 0);
    
    // Última renovação (processada ou criada)
    const lastRenewal = validRenewalStats
      .filter(r => r.status === 'COMPLETED')
      .sort((a, b) => {
        const dateA = new Date(a.processed_at || a.created_at);
        const dateB = new Date(b.processed_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      })[0];
    
    const lastRenewalDate = lastRenewal 
      ? (lastRenewal.processed_at || lastRenewal.created_at)
      : null;
    
    const activePackages = validPackagesData.length;
    
    // Estatísticas por status
    const statusStats = validRenewalStats.reduce((acc, renewal) => {
      const status = renewal.status || 'PENDING';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Estatísticas por mês (últimos 6 meses)
    const monthlyStats = calculateMonthlyStats(validRenewalStats);
    
    const stats = {
      total_renewals: totalRenewals,
      total_credits: totalCredits,
      last_renewal: lastRenewalDate,
      active_packages: activePackages,
      status_breakdown: {
        completed: statusStats.COMPLETED || 0,
        pending: statusStats.PENDING || 0,
        failed: statusStats.FAILED || 0
      },
      monthly_stats: monthlyStats,
      success_rate: totalRenewals > 0 
        ? Math.round(((statusStats.COMPLETED || 0) / totalRenewals) * 100)
        : 0
    };
    
    logger.debug('Renewal stats query completed', {
      total_renewals: stats.total_renewals,
      has_data: stats.total_renewals > 0
    }, 'API');
    
    return NextResponse.json({
      success: true,
      stats
    });
    
  } catch (error) {
    logger.error('Failed to fetch renewal stats', error, 'API');
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * Calcula estatísticas mensais dos últimos 6 meses
 */
function calculateMonthlyStats(renewals: any[]) {
  const now = new Date();
  const monthlyData: Record<string, { renewals: number; credits: number }> = {};
  
  // Inicializar últimos 6 meses
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = date.toISOString().substring(0, 7); // YYYY-MM
    monthlyData[key] = { renewals: 0, credits: 0 };
  }
  
  // Agrupar renovações por mês
  renewals.forEach(renewal => {
    if (renewal.status === 'COMPLETED') {
      const date = new Date(renewal.processed_at || renewal.created_at);
      const key = date.toISOString().substring(0, 7);
      
      if (monthlyData[key]) {
        monthlyData[key].renewals += 1;
        monthlyData[key].credits += renewal.package_creditos || 0;
      }
    }
  });
  
  // Converter para array ordenado
  return Object.entries(monthlyData)
    .map(([month, data]) => ({
      month,
      renewals: data.renewals,
      credits: data.credits
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
