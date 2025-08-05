// src/services/dashboard.service.ts
import { isToday, isSameMonth, parseISO, isSameYear, subMonths, isYesterday, isTomorrow, addDays, isPast, getMonth, getYear } from "date-fns";
import type { Client, Plan } from "@/lib/types";

export type DashboardMetrics = {
  monthlyRevenue: number;
  previousMonthRevenue: number;
  revenueDifference: number;
  revenueStatus: 'positivo' | 'negativo';
  yearlyRevenue: number;
  newCustomersThisMonth: number;
  recentlyAddedClients: Client[];
  totalActiveClients: number;
  totalOverdueClients: number;
  expiringYesterday: number;
  expiringToday: Client[];
  expiringTomorrow: number;
  expiringIn3Days: number;
  activeTests: number;
  testsThisMonth: number;
  currentMonthName: string;
  previousMonthName: string;
  currentYear: number;
};

/**
 * Serviço responsável por calcular métricas do dashboard
 * Centraliza toda a lógica de negócio relacionada a estatísticas e métricas
 */
export class DashboardService {
  /**
   * Calcula a receita para um mês específico
   */
  private static getRevenueForMonth(clients: Client[], plans: Plan[], date: Date): number {
    return clients
      .filter(c => {
        const startDate = parseISO(c.startDate);
        return c.status === 'Ativo' && isSameMonth(startDate, date) && isSameYear(startDate, date);
      })
      .reduce((acc, client) => {
        const plan = plans.find(p => p.id === client.planId);
        return acc + (plan?.price || 0);
      }, 0);
  }

  /**
   * Calcula a receita anual
   */
  private static getYearlyRevenue(clients: Client[], plans: Plan[], year: Date): number {
    return clients
      .filter(c => c.status === 'Ativo' && isSameYear(parseISO(c.startDate), year))
      .reduce((acc, client) => {
        const plan = plans.find(p => p.id === client.planId);
        return acc + (plan?.price || 0);
      }, 0);
  }

  /**
   * Filtra clientes por status de vencimento
   */
  private static getClientsByExpirationStatus(clients: Client[]) {
    const now = new Date();
    const in3DaysStart = addDays(now, 1);
    const in3DaysEnd = addDays(now, 3);

    return {
      expiringYesterday: clients.filter(c => isYesterday(parseISO(c.expirationDate))).length,
      expiringToday: clients.filter(c => isToday(parseISO(c.expirationDate))),
      expiringTomorrow: clients.filter(c => isTomorrow(parseISO(c.expirationDate))).length,
      expiringIn3Days: clients.filter(c => {
        const expiration = parseISO(c.expirationDate);
        return expiration > in3DaysStart && expiration <= in3DaysEnd;
      }).length,
    };
  }

  /**
   * Calcula métricas de testes
   */
  private static getTestMetrics(tests: Client[]) {
    const now = new Date();
    
    return {
      activeTests: tests.filter(c => !isPast(parseISO(c.expirationDate))).length,
      testsThisMonth: tests.filter(c => {
        const startDate = parseISO(c.startDate);
        return getMonth(startDate) === getMonth(now) && getYear(startDate) === getYear(now);
      }).length,
    };
  }

  /**
   * Obtém clientes adicionados recentemente
   */
  private static getRecentlyAddedClients(clients: Client[], limit: number = 5): Client[] {
    return [...clients]
      .filter(c => c.status === 'Ativo')
      .sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())
      .slice(0, limit);
  }

  /**
   * Calcula todas as métricas do dashboard
   */
  static calculateDashboardMetrics(
    allClients: Client[],
    allTests: Client[],
    allPlans: Plan[]
  ): DashboardMetrics {
    const now = new Date();
    const previousMonthDate = subMonths(now, 1);

    // Métricas de receita
    const monthlyRevenue = this.getRevenueForMonth(allClients, allPlans, now);
    const previousMonthRevenue = this.getRevenueForMonth(allClients, allPlans, previousMonthDate);
    const revenueDifference = previousMonthRevenue > 0
      ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
      : monthlyRevenue > 0 ? 100 : 0;
    const revenueStatus = revenueDifference >= 0 ? 'positivo' : 'negativo';
    const yearlyRevenue = this.getYearlyRevenue(allClients, allPlans, now);

    // Métricas de clientes
    const newCustomersThisMonth = allClients.filter(c =>
      c.status === 'Ativo' &&
      isSameMonth(parseISO(c.startDate), now) &&
      isSameYear(parseISO(c.startDate), now)
    ).length;
    
    const recentlyAddedClients = this.getRecentlyAddedClients(allClients);
    const totalActiveClients = allClients.filter(c => c.status === 'Ativo').length;
    const totalOverdueClients = allClients.filter(c => 
      c.status !== 'Em teste' && isPast(parseISO(c.expirationDate))
    ).length;

    // Métricas de vencimento
    const expirationMetrics = this.getClientsByExpirationStatus(allClients);

    // Métricas de testes
    const testMetrics = this.getTestMetrics(allTests);

    return {
      monthlyRevenue,
      previousMonthRevenue,
      revenueDifference,
      revenueStatus,
      yearlyRevenue,
      newCustomersThisMonth,
      recentlyAddedClients,
      totalActiveClients,
      totalOverdueClients,
      ...expirationMetrics,
      ...testMetrics,
      currentMonthName: now.toISOString(),
      previousMonthName: previousMonthDate.toISOString(),
      currentYear: now.getFullYear(),
    };
  }

  /**
   * Obtém clientes que vencem em um período específico
   */
  static getClientsExpiringInPeriod(clients: Client[], days: number): Client[] {
    const now = new Date();
    const endDate = addDays(now, days);
    
    return clients.filter(c => {
      const expiration = parseISO(c.expirationDate);
      return expiration >= now && expiration <= endDate;
    });
  }

  /**
   * Calcula a taxa de conversão de testes para clientes
   */
  static calculateTestConversionRate(allClients: Client[], allTests: Client[]): number {
    if (allTests.length === 0) return 0;
    
    const convertedTests = allClients.filter(client => 
      allTests.some(test => test.email === client.email)
    ).length;
    
    return (convertedTests / allTests.length) * 100;
  }
}