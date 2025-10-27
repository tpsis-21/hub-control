/**
 * Sistema de lazy loading para componentes pesados
 * Implementa carregamento sob demanda com fallbacks e error boundaries
 */

import React, { Suspense, lazy, ComponentType, ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { logger } from '@/lib/logger';

// Interface para configuração de lazy loading
interface LazyLoadConfig {
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  retryable?: boolean;
  preload?: boolean;
  timeout?: number;
}

// Interface para props do error boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

// Error Boundary para componentes lazy
class LazyErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode; retryable?: boolean; onRetry?: () => void },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      retryCount: 0
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Erro no lazy loading de componente:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    } as any);
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: undefined,
      retryCount: prevState.retryCount + 1
    }));
    
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Alert variant="destructive" className="m-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Erro ao carregar componente. 
              {this.state.retryCount > 0 && ` (Tentativa ${this.state.retryCount})`}
            </span>
            {this.props.retryable && (
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Tentar Novamente
              </Button>
            )}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// Componente de loading padrão
const DefaultLoadingFallback = ({ lines = 3 }: { lines?: number }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} className="h-4 w-full" />
    ))}
  </div>
);

// Função para criar componente lazy com configurações
export const createLazyComponent = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  config: LazyLoadConfig = {}
) => {
  const LazyComponent = lazy(importFn);
  
  // Preload se configurado
  if (config.preload) {
    // Preload após um pequeno delay para não bloquear o carregamento inicial
    setTimeout(() => {
      importFn().catch(error => {
        logger.warn('Falha no preload do componente:', error);
      });
    }, 100);
  }

  const WrappedComponent = (props: P) => {
    const [retryKey, setRetryKey] = React.useState(0);
    
    const handleRetry = React.useCallback(() => {
      setRetryKey(prev => prev + 1);
    }, []);

    return (
      <LazyErrorBoundary
        fallback={config.errorFallback}
        retryable={config.retryable !== false}
        onRetry={handleRetry}
      >
        <Suspense
          fallback={config.fallback || <DefaultLoadingFallback />}
        >
          <LazyComponent key={retryKey} {...(props as any)} />
        </Suspense>
      </LazyErrorBoundary>
    );
  };

  // Adicionar método de preload manual
  WrappedComponent.preload = importFn;
  
  return WrappedComponent;
};

// Hook para lazy loading com estado
export const useLazyLoad = <T = any>(
  loadFn: () => Promise<T>,
  deps: React.DependencyList = []
) => {
  const [state, setState] = React.useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({ data: null, loading: false, error: null });

  const load = React.useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const data = await loadFn();
      setState({ data, loading: false, error: null });
    } catch (error) {
      logger.error('Erro no lazy loading:', error as Error);
      setState({ data: null, loading: false, error: error as Error });
    }
  }, deps);

  React.useEffect(() => {
    load();
  }, [load]);

  return {
    ...state,
    reload: load
  };
};

// Hook para intersection observer (lazy loading baseado em visibilidade)
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isVisible = entry.isIntersecting;
        setIsIntersecting(isVisible);
        
        if (isVisible && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, options]);

  return {
    ref: elementRef,
    isIntersecting,
    hasIntersected
  };
};

// Componente para lazy loading baseado em visibilidade
export const LazyOnVisible: React.FC<{
  children: ReactNode;
  fallback?: ReactNode;
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
}> = ({ 
  children, 
  fallback = <DefaultLoadingFallback />, 
  once = true,
  rootMargin = '50px',
  threshold = 0.1 
}) => {
  const { ref, isIntersecting, hasIntersected } = useIntersectionObserver({
    rootMargin,
    threshold
  });

  const shouldRender = once ? hasIntersected : isIntersecting;

  return (
    <div ref={ref}>
      {shouldRender ? children : fallback}
    </div>
  );
};

// Componentes lazy pré-configurados para uso comum
export const LazyMappingTable = createLazyComponent(
  () => import('@/components/integrations/mapping/MappingsTable'),
  {
    fallback: <DefaultLoadingFallback lines={5} />,
    retryable: true,
    preload: false
  }
);

export const LazyUnmappedPackagesTable = createLazyComponent(
  () => import('@/components/integrations/mapping/components/UnmappedPackagesTable'),
  {
    fallback: <DefaultLoadingFallback lines={4} />,
    retryable: true,
    preload: false
  }
);

export const LazyProblemsTable = createLazyComponent(
  () => import('@/components/integrations/mapping/components/ProblemsTable'),
  {
    fallback: <DefaultLoadingFallback lines={3} />,
    retryable: true,
    preload: false
  }
);

export const LazyMappingForm = createLazyComponent(
  () => import('@/components/integrations/mapping/MappingForm'),
  {
    fallback: (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-32 w-full" />
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    ),
    retryable: true,
    preload: false
  }
);

// Charts component removido - não existe no projeto
// export const LazyDashboardCharts = createLazyComponent(
//   () => import('@/components/dashboard/Charts'),
//   {
//     fallback: (
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
//         {Array.from({ length: 4 }).map((_, i) => (
//           <Skeleton key={i} className="h-64 w-full" />
//         ))}
//       </div>
//     ),
//     retryable: true,
//     preload: true
//   }
// );

// ReportsTable component removido - não existe no projeto
// export const LazyReportsTable = createLazyComponent(
//   () => import('@/components/reports/ReportsTable'),
//   {
//     fallback: <DefaultLoadingFallback lines={6} />,
//     retryable: true,
//     preload: false
//   }
// );

// Utilitário para preload de múltiplos componentes
export const preloadComponents = (...components: Array<{ preload?: () => Promise<any> }>) => {
  components.forEach(component => {
    if (component.preload) {
      component.preload().catch(error => {
        logger.warn('Falha no preload de componente:', error);
      });
    }
  });
};

// Hook para preload inteligente baseado em rota
export const useRoutePreload = (routes: Record<string, () => Promise<any>>) => {
  const [currentRoute, setCurrentRoute] = React.useState<string>('');
  
  React.useEffect(() => {
    // Preload componentes da rota atual e rotas relacionadas
    const preloadRoute = routes[currentRoute];
    if (preloadRoute) {
      preloadRoute().catch(error => {
        logger.warn(`Falha no preload da rota ${currentRoute}:`, error);
      });
    }
  }, [currentRoute, routes]);

  return { setCurrentRoute };
};

// Componente para lazy loading de imagens
export const LazyImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  fallback?: ReactNode;
}> = ({ src, alt, className, fallback }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const { ref, hasIntersected } = useIntersectionObserver();

  return (
    <div ref={ref} className={className}>
      {hasIntersected && !error ? (
        <img
          src={src}
          alt={alt}
          className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : (
        fallback || <Skeleton className="w-full h-full" />
      )}
    </div>
  );
};

export default {
  createLazyComponent,
  useLazyLoad,
  useIntersectionObserver,
  LazyOnVisible,
  LazyImage,
  preloadComponents,
  useRoutePreload
};
