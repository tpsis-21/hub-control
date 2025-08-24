import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    
    console.log('📊 Calculando estatísticas para usuário:', userId);
    
    // Buscar estatísticas de renovações
    const { data: renewalStats, error: renewalError } = await supabase
      .from('thebest_renewals')
      .select('credits_added, processed_at, created_at, status')
      .eq('user_id', userId);
    
    if (renewalError) {
      throw new Error(`Erro ao buscar renovações: ${renewalError.message}`);
    }
    
    // Buscar total de pacotes ativos
    const { data: packagesData, error: packagesError } = await supabase
      .from('thebest_packages')
      .select('id')
      .eq('is_active', true);
    
    if (packagesError) {
      throw new Error(`Erro ao buscar pacotes: ${packagesError.message}`);
    }
    
    // Calcular estatísticas
    const totalRenewals = renewalStats?.length || 0;
    const totalCredits = renewalStats?.reduce((sum, renewal) => {
      return sum + (renewal.credits_added || 0);
    }, 0) || 0;
    
    // Última renovação (processada ou criada)
    const lastRenewal = renewalStats
      ?.filter(r => r.status === 'completed')
      ?.sort((a, b) => {
        const dateA = new Date(a.processed_at || a.created_at);
        const dateB = new Date(b.processed_at || b.created_at);
        return dateB.getTime() - dateA.getTime();
      })?.[0];
    
    const lastRenewalDate = lastRenewal 
      ? (lastRenewal.processed_at || lastRenewal.created_at)
      : null;
    
    const activePackages = packagesData?.length || 0;
    
    // Estatísticas por status
    const statusStats = renewalStats?.reduce((acc, renewal) => {
      const status = renewal.status || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};
    
    // Estatísticas por mês (últimos 6 meses)
    const monthlyStats = calculateMonthlyStats(renewalStats || []);
    
    const stats = {
      total_renewals: totalRenewals,
      total_credits: totalCredits,
      last_renewal: lastRenewalDate,
      active_packages: activePackages,
      status_breakdown: {
        completed: statusStats.completed || 0,
        pending: statusStats.pending || 0,
        failed: statusStats.failed || 0
      },
      monthly_stats: monthlyStats,
      success_rate: totalRenewals > 0 
        ? Math.round(((statusStats.completed || 0) / totalRenewals) * 100)
        : 0
    };
    
    console.log('✅ Estatísticas calculadas:', stats);
    
    return NextResponse.json({
      success: true,
      stats
    });
    
  } catch (error) {
    console.error('❌ Erro ao calcular estatísticas:', error);
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
    if (renewal.status === 'completed') {
      const date = new Date(renewal.processed_at || renewal.created_at);
      const key = date.toISOString().substring(0, 7);
      
      if (monthlyData[key]) {
        monthlyData[key].renewals += 1;
        monthlyData[key].credits += renewal.credits_added || 0;
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