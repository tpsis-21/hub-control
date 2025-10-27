// @/hooks/useRecentActivities.ts
import { useState, useEffect } from 'react';
import { LoggerService } from '@/services/logger.service';

interface ActivityLog {
  id: string;
  created_at: string;
  action: string;
  table_name?: string;
  user_email?: string;
  user_role?: string;
  description?: string;
  severity?: string;
  metadata?: Record<string, any>;
}

interface UseRecentActivitiesReturn {
  activities: ActivityLog[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useRecentActivities(limit: number = 10): UseRecentActivitiesReturn {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/activities/recent?limit=${limit}&page=1`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar atividades');
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Erro ao buscar atividades');
      }
      
      setActivities(data.activities || []);
      
      // Log de aviso se estiver usando dados simulados
      if (data.source === 'mock') {
        LoggerService.warn(
          'Usando atividades simuladas - verifique configurações do banco',
          'useRecentActivities',
          { warning: data.warning }
        );
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      LoggerService.error('Erro ao buscar atividades recentes', 'useRecentActivities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  const refetch = () => {
    fetchActivities();
  };

  return {
    activities,
    loading,
    error,
    refetch
  };
}

// Hook para formatar atividades para exibição
export function useFormattedActivities(activities: ActivityLog[]) {
  return activities.map(activity => {
    let actionText = activity.action;
    let icon = 'Activity';
    let color = 'blue';
    
    // Mapear ações para textos mais amigáveis
    switch (activity.action) {
      case 'INSERT':
        actionText = 'Criou';
        icon = 'Plus';
        color = 'green';
        break;
      case 'UPDATE':
        actionText = 'Atualizou';
        icon = 'Edit';
        color = 'blue';
        break;
      case 'DELETE':
        actionText = 'Excluiu';
        icon = 'Trash';
        color = 'red';
        break;
      case 'LOGIN':
        actionText = 'Fez login';
        icon = 'LogIn';
        color = 'green';
        break;
      case 'LOGOUT':
        actionText = 'Fez logout';
        icon = 'LogOut';
        color = 'gray';
        break;
      case 'FAILED_LOGIN':
        actionText = 'Tentativa de login falhada';
        icon = 'AlertTriangle';
        color = 'red';
        break;
      default:
        actionText = activity.description || activity.action;
    }
    
    // Mapear tabelas para nomes mais amigáveis
    let resourceText = activity.table_name;
    switch (activity.table_name) {
      case 'clients':
        resourceText = 'cliente';
        break;
      case 'payments':
        resourceText = 'pagamento';
        break;
      case 'servers':
        resourceText = 'servidor';
        break;
      case 'plans':
        resourceText = 'plano';
        break;
      case 'tests':
        resourceText = 'teste';
        break;
      case 'profiles':
        resourceText = 'perfil';
        break;
      default:
        resourceText = activity.table_name || 'sistema';
    }
    
    return {
      ...activity,
      actionText,
      resourceText,
      icon,
      color
    };
  });
}
