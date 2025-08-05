import { useMemo } from 'react';
import { Client } from '@/lib/types';
import { isWithinInterval, startOfMonth, endOfMonth, subMonths, differenceInDays } from 'date-fns';

export interface ConversionRateData {
  rate: number;
  trend: 'up' | 'down' | 'stable';
  change: number;
  conversions: number;
  avgTestDuration: number;
  expiredTests: number;
}

export function useTestConversionRate(clients: Client[]): ConversionRateData {
  return useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Filtrar clientes que se tornaram ativos no mês atual (conversões)
    const currentMonthConversions = clients.filter(client => {
      const startDate = new Date(client.startDate);
      return (
        client.status === 'Ativo' &&
        isWithinInterval(startDate, { start: currentMonthStart, end: currentMonthEnd })
      );
    });

    // Filtrar clientes que se tornaram ativos no mês anterior (conversões)
    const previousMonthConversions = clients.filter(client => {
      const startDate = new Date(client.startDate);
      return (
        client.status === 'Ativo' &&
        isWithinInterval(startDate, { start: previousMonthStart, end: previousMonthEnd })
      );
    });

    // Contar total de testes criados no mês atual
    const currentMonthTests = clients.filter(client => {
      const startDate = new Date(client.startDate);
      return (
        (client.status === 'Em teste' || client.status === 'Ativo') &&
        isWithinInterval(startDate, { start: currentMonthStart, end: currentMonthEnd })
      );
    }).length;

    // Contar total de testes criados no mês anterior
    const previousMonthTests = clients.filter(client => {
      const startDate = new Date(client.startDate);
      return (
        (client.status === 'Em teste' || client.status === 'Ativo') &&
        isWithinInterval(startDate, { start: previousMonthStart, end: previousMonthEnd })
      );
    }).length;

    // Calcular taxa de conversão atual
    const currentRate = currentMonthTests > 0 ? (currentMonthConversions.length / currentMonthTests) * 100 : 0;
    
    // Calcular taxa de conversão anterior
    const previousRate = previousMonthTests > 0 ? (previousMonthConversions.length / previousMonthTests) * 100 : 0;

    // Calcular mudança percentual
    const change = previousRate > 0 ? ((currentRate - previousRate) / previousRate) * 100 : 0;
    
    // Determinar tendência
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (Math.abs(change) > 5) { // Considerar mudança significativa se > 5%
      trend = change > 0 ? 'up' : 'down';
    }

    // Calcular tempo médio de teste antes da conversão (estimativa baseada na validade do plano)
    const avgTestDuration = 7; // Assumindo 7 dias como duração padrão de teste

    // Contar testes expirados (clientes com status 'Inativo' que expiraram no mês atual)
    const expiredTests = clients.filter(client => {
      const expirationDate = new Date(client.expirationDate);
      return (
        client.status === 'Inativo' &&
        isWithinInterval(expirationDate, { start: currentMonthStart, end: currentMonthEnd }) &&
        expirationDate < now
      );
    }).length;

    return {
      rate: Math.round(currentRate * 10) / 10, // Arredondar para 1 casa decimal
      trend,
      change: Math.round(Math.abs(change) * 10) / 10,
      conversions: currentMonthConversions.length,
      avgTestDuration: Math.round(avgTestDuration),
      expiredTests
    };
  }, [clients]);
}