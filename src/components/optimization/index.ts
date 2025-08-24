/**
 * Índice dos Componentes de Otimização
 * 
 * Exporta todos os componentes relacionados à otimização
 * de performance e recursos da aplicação.
 */

// Dashboards de Otimização
export { default as AutoOptimizationDashboard } from './auto-optimization-dashboard';
export { default as ResourceOptimizationDashboard } from './resource-optimization-dashboard';
export { default as RealTimePerformanceDashboard } from './real-time-performance-dashboard';
export { default as GlobalConfigDashboard } from './global-config-dashboard';

// Exportações de componentes de navegação
export {
  OptimizationBreadcrumb,
  OptimizationNavigationMenu,
  OptimizationSequentialNavigation,
  OptimizationNavigationBar,
  OptimizationSidebar,
  OptimizationQuickNavigation,
  default as OptimizationNavigation
} from './navigation';

// Re-exportar tipos importantes das bibliotecas de otimização
export type {
  OptimizationConfig,
  OptimizationResult
} from '@/lib/auto-optimization';

export type {
  ResourceMetrics,
  OptimizationRule as ResourceOptimizationRule,
  OptimizationAction,
  OptimizationResult as ResourceOptimizationResult
} from '@/lib/resource-optimization';

export type {
  PerformanceMetrics,
  OptimizationRule as PerformanceOptimizationRule,
  OptimizationResult as PerformanceOptimizationResult,
  AdaptiveConfig
} from '@/lib/real-time-performance-optimizer';

export type {
  RouteConfig,
  BreadcrumbItem
} from '@/lib/optimization-routes';

// Hooks de otimização
export {
  useAutoOptimization,
  useOptimizationMetrics
} from '@/lib/auto-optimization';

export {
  useResourceOptimization
} from '@/lib/resource-optimization';

export {
  useRealTimeOptimization,
  usePerformanceMetrics,
  useOptimizationRules
} from '@/lib/real-time-performance-optimizer';

export {
  useOptimizationNavigation
} from '@/lib/optimization-routes';

// Utilitários
export {
  PerformanceUtils,
  OptimizationPresets
} from '@/lib/real-time-performance-optimizer';

export {
  NavigationUtils,
  OPTIMIZATION_ROUTES,
  NAVIGATION_CONFIG
} from '@/lib/optimization-routes';