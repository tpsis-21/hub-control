// src/hooks/useDashboardMetrics.ts
import { useMemo } from "react";
import { DashboardService, type DashboardMetrics } from "@/services/dashboard.service";
import type { Client, Plan } from "@/lib/types";

/**
 * Hook personalizado para calcular métricas do dashboard
 * Encapsula a lógica de cálculo e memoização das métricas
 */
export function useDashboardMetrics(
  allClients: Client[],
  allTests: Client[],
  allPlans: Plan[]
): DashboardMetrics | null {
  return useMemo(() => {
    if (!allClients || !allPlans) {
      return null;
    }

    return DashboardService.calculateDashboardMetrics(
      allClients,
      allTests || [],
      allPlans
    );
  }, [allClients, allTests, allPlans]);
}

/**
 * Hook para obter clientes que vencem em um período específico
 */
export function useClientsExpiringInPeriod(
  clients: Client[],
  days: number
): Client[] {
  return useMemo(() => {
    if (!clients) return [];
    return DashboardService.getClientsExpiringInPeriod(clients, days);
  }, [clients, days]);
}