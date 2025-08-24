/**
 * 🎣 Hook de Analytics - Hub Control
 * 
 * Hook personalizado para facilitar o uso de analytics
 * em componentes React, incluindo tracking automático
 * e gerenciamento de estado.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsApi } from '../services/analyticsApi';
import { useAuth } from './useAuth';
import { useToast } from '../components/ui/use-toast';
import { logger } from '../utils/logger';

// ============================================================================
// 🎣 HOOK PRINCIPAL DE ANALYTICS
// ============================================================================

/**
 * Hook principal para analytics
 * @param {Object} options - Opções de configuração
 * @returns {Object} Funções e estado do analytics
 */
export const useAnalytics = (options = {}) => {
  const {
    autoTrack = true,
    trackPageViews = true,
    trackErrors = true,
    enableRealtime = false,
    realtimeInterval = 30000 // 30 segundos
  } = options;

  const { user } = useAuth();
  const { toast } = useToast();
  const [isTracking, setIsTracking] = useState(false);
  const [realtimeData, setRealtimeData] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const lastPageRef = useRef(null);

  // ============================================================================
  // 📊 FUNÇÕES DE TRACKING
  // ============================================================================

  /**
   * Registra um evento
   */
  const track = useCallback(async (eventName, properties = {}, options = {}) => {
    try {
      setError(null);
      
      // Adicionar informações do usuário se disponível
      const eventProperties = {
        ...properties,
        userId: user?.id,
        userRole: user?.role,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
        ...options
      };

      await analyticsApi.trackEvent(eventName, eventProperties);
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Event tracked:', { eventName, properties: eventProperties });
      }
    } catch (err) {
      logger.error('Erro ao registrar evento:', err);
      setError(err);
      
      if (options.showToast !== false) {
        toast({
          title: 'Erro no analytics',
          description: 'Não foi possível registrar o evento.',
          variant: 'destructive'
        });
      }
    }
  }, [user, toast]);

  /**
   * Registra visualização de página
   */
  const trackPage = useCallback(async (page, properties = {}) => {
    if (!trackPageViews) return;
    
    try {
      const pageProperties = {
        page,
        url: window.location.href,
        referrer: document.referrer,
        title: document.title,
        ...properties
      };

      await analyticsApi.trackPageView(page, pageProperties);
      lastPageRef.current = page;
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Page view tracked:', pageProperties);
      }
    } catch (err) {
      logger.error('Erro ao registrar visualização de página:', err);
      setError(err);
    }
  }, [trackPageViews]);

  /**
   * Registra ação do usuário
   */
  const trackAction = useCallback(async (action, target, properties = {}) => {
    try {
      await analyticsApi.trackUserAction(action, target, {
        page: lastPageRef.current || window.location.pathname,
        ...properties
      });
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('User action tracked:', { action, target, properties });
      }
    } catch (err) {
      logger.error('Erro ao registrar ação do usuário:', err);
      setError(err);
    }
  }, []);

  /**
   * Registra transação
   */
  const trackTransaction = useCallback(async (transactionData) => {
    try {
      await analyticsApi.trackTransaction(transactionData);
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Transaction tracked:', transactionData);
      }
    } catch (err) {
      logger.error('Erro ao registrar transação:', err);
      setError(err);
    }
  }, []);

  /**
   * Registra erro
   */
  const trackError = useCallback(async (error, context = {}) => {
    if (!trackErrors) return;
    
    try {
      await analyticsApi.trackError(error, {
        page: lastPageRef.current || window.location.pathname,
        userId: user?.id,
        ...context
      });
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Error tracked:', { error: error.message, context });
      }
    } catch (err) {
      logger.error('Erro ao registrar erro:', err);
    }
  }, [trackErrors, user]);

  /**
   * Registra uso de funcionalidade
   */
  const trackFeature = useCallback(async (feature, action, properties = {}) => {
    try {
      await analyticsApi.trackFeatureUsage(feature, action, {
        page: lastPageRef.current || window.location.pathname,
        ...properties
      });
      
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Feature usage tracked:', { feature, action, properties });
      }
    } catch (err) {
      logger.error('Erro ao registrar uso de funcionalidade:', err);
      setError(err);
    }
  }, []);

  // ============================================================================
  // 📈 FUNÇÕES DE MÉTRICAS
  // ============================================================================

  /**
   * Carrega dados em tempo real
   */
  const loadRealtimeData = useCallback(async () => {
    try {
      const data = await analyticsApi.getRealtimeMetrics();
      setRealtimeData(data);
      setError(null);
    } catch (err) {
      logger.error('Erro ao carregar dados em tempo real:', err);
      setError(err);
    }
  }, []);

  /**
   * Inicia tracking automático
   */
  const startTracking = useCallback(() => {
    setIsTracking(true);
    
    // Registrar página atual
    if (trackPageViews) {
      trackPage(window.location.pathname);
    }
    
    // Iniciar coleta de dados em tempo real
    if (enableRealtime) {
      loadRealtimeData();
      intervalRef.current = setInterval(loadRealtimeData, realtimeInterval);
    }
  }, [trackPageViews, enableRealtime, realtimeInterval, trackPage, loadRealtimeData]);

  /**
   * Para tracking automático
   */
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // ============================================================================
  // 🔄 EFEITOS
  // ============================================================================

  // Iniciar tracking automático
  useEffect(() => {
    if (autoTrack) {
      startTracking();
    }
    
    return () => {
      stopTracking();
    };
  }, [autoTrack, startTracking, stopTracking]);

  // Tracking de mudanças de página
  useEffect(() => {
    if (!trackPageViews || !isTracking) return;
    
    const handleLocationChange = () => {
      const currentPage = window.location.pathname;
      if (currentPage !== lastPageRef.current) {
        trackPage(currentPage);
      }
    };

    // Listener para mudanças de URL (SPA)
    window.addEventListener('popstate', handleLocationChange);
    
    // Observer para mudanças no DOM (para SPAs que não usam popstate)
    const observer = new MutationObserver(() => {
      const currentPage = window.location.pathname;
      if (currentPage !== lastPageRef.current) {
        setTimeout(handleLocationChange, 100); // Delay para garantir que a página carregou
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      observer.disconnect();
    };
  }, [trackPageViews, isTracking, trackPage]);

  // Tracking de erros globais
  useEffect(() => {
    if (!trackErrors || !isTracking) return;
    
    const handleError = (event) => {
      trackError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    };
    
    const handleUnhandledRejection = (event) => {
      trackError(new Error(event.reason), {
        type: 'unhandled_promise_rejection'
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [trackErrors, isTracking, trackError]);

  // ============================================================================
  // 📤 RETORNO DO HOOK
  // ============================================================================

  return {
    // Estado
    isTracking,
    realtimeData,
    error,
    
    // Funções de tracking
    track,
    trackPage,
    trackAction,
    trackTransaction,
    trackError,
    trackFeature,
    
    // Controle
    startTracking,
    stopTracking,
    loadRealtimeData,
    
    // Utilitários
    clearError: () => setError(null)
  };
};

// ============================================================================
// 🎣 HOOKS ESPECIALIZADOS
// ============================================================================

/**
 * Hook para tracking de métricas específicas
 */
export const useMetrics = (metricNames, options = {}) => {
  const [metrics, setMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const loadMetrics = useCallback(async () => {
    if (!metricNames || metricNames.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await analyticsApi.getMetrics(metricNames, options);
      setMetrics(data);
    } catch (err) {
      logger.error('Erro ao carregar métricas:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [metricNames, options]);
  
  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);
  
  return {
    metrics,
    loading,
    error,
    reload: loadMetrics
  };
};

/**
 * Hook para dashboards
 */
export const useDashboard = (dashboardName, period = '24h') => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const loadDashboard = useCallback(async () => {
    if (!dashboardName) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const data = await analyticsApi.getDashboard(dashboardName, period);
      setDashboard(data);
    } catch (err) {
      logger.error('Erro ao carregar dashboard:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [dashboardName, period]);
  
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  
  return {
    dashboard,
    loading,
    error,
    reload: loadDashboard
  };
};

/**
 * Hook para tracking de componentes
 */
export const useComponentTracking = (componentName, options = {}) => {
  const { track } = useAnalytics({ autoTrack: false });
  const mountTimeRef = useRef(null);
  
  useEffect(() => {
    mountTimeRef.current = Date.now();
    
    // Track component mount
    track('component_mount', {
      component: componentName,
      ...options
    });
    
    return () => {
      // Track component unmount with duration
      const duration = Date.now() - mountTimeRef.current;
      track('component_unmount', {
        component: componentName,
        duration,
        ...options
      });
    };
  }, [componentName, track, options]);
  
  const trackInteraction = useCallback((interaction, properties = {}) => {
    track('component_interaction', {
      component: componentName,
      interaction,
      ...properties
    });
  }, [componentName, track]);
  
  return {
    trackInteraction
  };
};

// ============================================================================
// 🛠️ UTILITÁRIOS
// ============================================================================

/**
 * Gera ou obtém ID da sessão
 */
function getSessionId() {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  
  return sessionId;
}

/**
 * HOC para tracking automático de componentes
 */
export const withAnalytics = (WrappedComponent, componentName, options = {}) => {
  return function AnalyticsWrappedComponent(props) {
    const { trackInteraction } = useComponentTracking(componentName, options);
    
    return (
      <WrappedComponent
        {...props}
        trackInteraction={trackInteraction}
      />
    );
  };
};

export default useAnalytics;

/**
 * Exemplo de uso:
 * 
 * // Hook básico
 * const { track, trackPage, trackAction } = useAnalytics();
 * 
 * // Tracking manual
 * const handleClick = () => {
 *   trackAction('click', 'button', { buttonId: 'save' });
 * };
 * 
 * // Hook de métricas
 * const { metrics, loading } = useMetrics(['daily_active_users', 'revenue']);
 * 
 * // Hook de dashboard
 * const { dashboard } = useDashboard('executive', '30d');
 * 
 * // Hook de componente
 * const { trackInteraction } = useComponentTracking('UserProfile');
 * 
 * // HOC
 * export default withAnalytics(MyComponent, 'MyComponent');
 */