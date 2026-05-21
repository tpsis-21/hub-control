'use client';

import { useState, useEffect, useCallback } from 'react';
import { appToast } from '@/lib/app-toast';
import { logger } from '@/utils/production-logger';
import {
  TheBestPackage,
  HubControlPlan,
  TheBestPlanMapping,
  MappingStatistics,
  UnmappedPackage,
  MappingConfig,
  MappingFormData,
} from '../types';

type MappingApiBundle = {
  config_id: string;
  config: MappingConfig;
  mappings: TheBestPlanMapping[];
  packages: TheBestPackage[];
  plans: HubControlPlan[];
  statistics: MappingStatistics;
  unmapped_packages: UnmappedPackage[];
};

async function parseApiResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!res.ok) {
    const message =
      (json as { message?: string }).message ??
      (json as { error?: string }).error ??
      'Erro na requisição';
    throw new Error(message);
  }
  return (json as { data: T }).data;
}

export interface UseMappingDataReturn {
  mappings: TheBestPlanMapping[];
  packages: TheBestPackage[];
  plans: HubControlPlan[];
  statistics: MappingStatistics;
  unmappedPackages: UnmappedPackage[];
  config: MappingConfig;
  isLoading: boolean;
  autoMappingProgress: number;
  loadData: () => Promise<void>;
  loadMappings: () => Promise<void>;
  loadPackages: () => Promise<void>;
  loadPlans: () => Promise<void>;
  loadStatistics: () => Promise<void>;
  loadUnmappedPackages: () => Promise<void>;
  loadConfigs: () => Promise<void>;
  handleAutoMapping: () => Promise<void>;
  handleCreateMapping: (formData: MappingFormData) => Promise<void>;
  handleUpdateMapping: (mappingId: string, formData: MappingFormData) => Promise<void>;
  handleDeleteMapping: (mappingId: string) => Promise<void>;
  handleQuickMap: (packageId: string, planId: string) => Promise<void>;
  setAutoMappingProgress: (progress: number) => void;
}

const emptyStatistics: MappingStatistics = {
  total_mappings: 0,
  active_mappings: 0,
  inactive_mappings: 0,
  total_packages: 0,
  mapped_packages: 0,
  unmapped_packages: 0,
  sync_issues: 0,
};

function applyBundle(
  bundle: MappingApiBundle,
  setters: {
    setMappings: (v: TheBestPlanMapping[]) => void;
    setPackages: (v: TheBestPackage[]) => void;
    setPlans: (v: HubControlPlan[]) => void;
    setStatistics: (v: MappingStatistics) => void;
    setUnmappedPackages: (v: UnmappedPackage[]) => void;
    setConfig: (v: MappingConfig) => void;
  }
) {
  setters.setMappings(bundle.mappings);
  setters.setPackages(bundle.packages);
  setters.setPlans(bundle.plans);
  setters.setStatistics(bundle.statistics);
  setters.setUnmappedPackages(bundle.unmapped_packages);
  setters.setConfig(bundle.config);
}

export function useMappingData(): UseMappingDataReturn {
  const [mappings, setMappings] = useState<TheBestPlanMapping[]>([]);
  const [packages, setPackages] = useState<TheBestPackage[]>([]);
  const [plans, setPlans] = useState<HubControlPlan[]>([]);
  const [statistics, setStatistics] = useState<MappingStatistics>(emptyStatistics);
  const [unmappedPackages, setUnmappedPackages] = useState<UnmappedPackage[]>([]);
  const [config, setConfig] = useState<MappingConfig>({
    auto_sync_enabled: false,
    sync_interval: 300,
    notification_enabled: true,
    backup_enabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [autoMappingProgress, setAutoMappingProgress] = useState(0);

  const setters = {
    setMappings,
    setPackages,
    setPlans,
    setStatistics,
    setUnmappedPackages,
    setConfig,
  };

  const fetchBundle = useCallback(async (): Promise<MappingApiBundle | null> => {
    const res = await fetch('/api/thebest/mappings', { credentials: 'include' });
    if (res.status === 404) {
      const json = await res.json().catch(() => ({}));
      if ((json as { error?: string }).error === 'NO_THEBEST_CONFIG') {
        setMappings([]);
        setPackages([]);
        setPlans([]);
        setStatistics(emptyStatistics);
        setUnmappedPackages([]);
        return null;
      }
    }
    return parseApiResponse<MappingApiBundle>(res);
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const bundle = await fetchBundle();
      if (bundle) applyBundle(bundle, setters);
    } catch (error) {
      logger.error(
        'Erro ao carregar dados de mapeamento',
        error instanceof Error ? error : new Error(String(error))
      );
      appToast.error('Erro ao carregar dados do mapeamento');
    } finally {
      setIsLoading(false);
    }
  }, [fetchBundle]);

  const loadMappings = loadData;
  const loadPackages = loadData;
  const loadPlans = loadData;
  const loadStatistics = loadData;
  const loadUnmappedPackages = loadData;
  const loadConfigs = loadData;

  const handleAutoMapping = useCallback(async () => {
    setAutoMappingProgress(0);
    try {
      const res = await fetch('/api/thebest/mappings/auto', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? 'Falha no auto-mapeamento');
      }

      setAutoMappingProgress(100);
      appToast.success(
        'Auto-mapeamento concluído',
        json.message ?? `${json.data?.mapped_count ?? 0} pacote(s) processado(s)`
      );
      await loadData();
    } catch (error) {
      setAutoMappingProgress(0);
      logger.error(
        'Erro no auto-mapeamento',
        error instanceof Error ? error : new Error(String(error))
      );
      appToast.error('Erro ao executar auto-mapeamento');
    }
  }, [loadData]);

  const postMapping = useCallback(
    async (mapping: MappingFormData) => {
      const res = await fetch('/api/thebest/mappings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping }),
      });
      await parseApiResponse(res);
    },
    []
  );

  const handleCreateMapping = useCallback(
    async (formData: MappingFormData) => {
      try {
        await postMapping(formData);
        appToast.success('Mapeamento criado com sucesso');
        await loadData();
      } catch (error) {
        logger.error(
          'Erro ao criar mapeamento',
          error instanceof Error ? error : new Error(String(error))
        );
        appToast.error('Erro ao criar mapeamento');
        throw error;
      }
    },
    [postMapping, loadData]
  );

  const handleUpdateMapping = useCallback(
    async (mappingId: string, formData: MappingFormData) => {
      try {
        const res = await fetch('/api/thebest/mappings', {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: mappingId, mapping: formData }),
        });
        await parseApiResponse(res);
        appToast.success('Mapeamento atualizado com sucesso');
        await loadData();
      } catch (error) {
        logger.error(
          'Erro ao atualizar mapeamento',
          error instanceof Error ? error : new Error(String(error))
        );
        appToast.error('Erro ao atualizar mapeamento');
        throw error;
      }
    },
    [loadData]
  );

  const handleDeleteMapping = useCallback(
    async (mappingId: string) => {
      try {
        const res = await fetch(`/api/thebest/mappings?id=${encodeURIComponent(mappingId)}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        await parseApiResponse(res);
        appToast.success('Mapeamento removido com sucesso');
        await loadData();
      } catch (error) {
        logger.error(
          'Erro ao excluir mapeamento',
          error instanceof Error ? error : new Error(String(error))
        );
        appToast.error('Erro ao remover mapeamento');
        throw error;
      }
    },
    [loadData]
  );

  const handleQuickMap = useCallback(
    async (packageId: string, planId: string) => {
      await handleCreateMapping({
        thebest_package_id: packageId,
        hubcontrol_plan_id: planId,
        is_active: true,
        is_default: true,
        sync_price: true,
        sync_validity: true,
        sync_screens: true,
      });
    },
    [handleCreateMapping]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    mappings,
    packages,
    plans,
    statistics,
    unmappedPackages,
    config,
    isLoading,
    autoMappingProgress,
    loadData,
    loadMappings,
    loadPackages,
    loadPlans,
    loadStatistics,
    loadUnmappedPackages,
    loadConfigs,
    handleAutoMapping,
    handleCreateMapping,
    handleUpdateMapping,
    handleDeleteMapping,
    handleQuickMap,
    setAutoMappingProgress,
  };
}
