'use client';

import { useState, useEffect, useCallback } from 'react';
import { NATVService } from '@/services/natv.service';

export interface NATVCreditsState {
  credits: number | null;
  loading: boolean;
  error: string | null;
  lastSync: Date | null;
  isConfigured: boolean;
}

export function useNATVCredits(autoRefreshInterval: number = 0) { // Desabilitado por padrão
  const [state, setState] = useState<NATVCreditsState>({
    credits: null,
    loading: false,
    error: null,
    lastSync: null,
    isConfigured: false
  });

  const syncCredits = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const natvService = new NATVService();
      
      if (!natvService.isConfigured()) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'NATV não configurado',
          isConfigured: false
        }));
        return { success: false, error: 'NATV não configurado' };
      }

      const response = await natvService.syncCredits();
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          credits: response.data!.credits,
          lastSync: new Date(),
          loading: false,
          error: null,
          isConfigured: true
        }));
        return { success: true, credits: response.data.credits };
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: response.error || 'Erro ao sincronizar créditos',
          isConfigured: true
        }));
        return { success: false, error: response.error || 'Erro ao sincronizar créditos' };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        isConfigured: false
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Sincronização inicial
  useEffect(() => {
    syncCredits();
  }, [syncCredits]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    
    const interval = setInterval(() => {
      if (state.isConfigured) {
        syncCredits();
      }
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [syncCredits, autoRefreshInterval, state.isConfigured]);

  const getCreditsStatus = useCallback((credits: number | null) => {
    if (credits === null) return { level: 'unknown', color: 'gray', label: 'Desconhecido' };
    if (credits >= 100) return { level: 'high', color: 'green', label: 'Alto' };
    if (credits >= 50) return { level: 'medium', color: 'yellow', label: 'Médio' };
    if (credits >= 10) return { level: 'low', color: 'orange', label: 'Baixo' };
    return { level: 'critical', color: 'red', label: 'Crítico' };
  }, []);

  const formatLastSync = useCallback((date: Date | null) => {
    if (!date) return null;
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  return {
    ...state,
    syncCredits,
    getCreditsStatus,
    formatLastSync,
    refresh: syncCredits
  };
}

export default useNATVCredits;
