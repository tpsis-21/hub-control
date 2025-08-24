/**
 * Índice dos Componentes de Analytics
 * 
 * Exporta todos os componentes relacionados à análise
 * de comportamento do usuário e análise preditiva.
 */

// Dashboards de Analytics
export { default as UserBehaviorDashboard } from './user-behavior-dashboard';
export { default as PredictiveAnalyticsDashboard } from './predictive-analytics-dashboard';

// Re-exportar tipos importantes das bibliotecas de analytics
export type {
  UserSession,
  PageView,
  UserInteraction,
  DeviceInfo,
  BrowserInfo,
  NetworkInfo,
  ErrorEvent,
  ConversionEvent,
  PagePerformanceMetrics,
  BehaviorPattern,
  UserSegment,
  AnalyticsReport
} from '@/lib/user-behavior-analytics';

export type {
  PredictiveMetrics,
  PredictionModel,
  Prediction,
  PredictiveRecommendation,
  AnomalyDetection
} from '@/lib/predictive-analytics';

// Hooks de analytics
export {
  useUserBehaviorAnalytics
} from '@/lib/user-behavior-analytics';

export {
  usePredictiveAnalytics
} from '@/lib/predictive-analytics';

// Instâncias globais
export {
  sessionTracker,
  behaviorAnalyzer
} from '@/lib/user-behavior-analytics';

export {
  predictiveAnalytics
} from '@/lib/predictive-analytics';