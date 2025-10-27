/**
 * Sistema de Lazy Loading para Componentes
 * 
 * Este arquivo centraliza o carregamento lazy de componentes pesados
 * para melhorar a performance inicial da aplicação.
 */

import { lazy, Suspense, ComponentType, useState, useEffect } from 'react';
import type { FC, LazyExoticComponent } from 'react';
import { LoadingSpinner } from '@/components/ui/loading';

// Helper para garantir default export compatível com React.lazy
function toLazyDefault<T = any>(
  promise: Promise<any>
): Promise<{ default: ComponentType<T> }> {
  return promise.then((mod) => {
    // Verificação robusta para módulos undefined/null
    if (!mod || typeof mod !== 'object') {
      console.error('❌ Módulo carregado é inválido:', mod);
      // Retorna um componente de fallback em vez de lançar erro
      return { 
        default: (() => (
          <div className="p-4 text-center text-red-500">
            Erro: Módulo não pôde ser carregado
          </div>
        )) as ComponentType<T>
      };
    }

    // Verifica se tem default export
    if (mod.default) {
      return { default: mod.default as ComponentType<T> };
    }

    // Tenta encontrar o primeiro export que pareça um componente React
    try {
      const moduleValues = Object.values(mod);
      const candidate = moduleValues.find((v: any) =>
        v && (typeof v === 'function' || (typeof v === 'object' && v && ('render' in v || 'displayName' in v)))
      );
      
      if (candidate) {
        return { default: candidate as ComponentType<T> };
      }
    } catch (error) {
      console.error('❌ Erro ao processar exports do módulo:', error);
    }

    console.error('❌ Módulo sem export válido:', Object.keys(mod));
    // Retorna um componente de fallback em vez de lançar erro
    return { 
      default: (() => (
        <div className="p-4 text-center text-yellow-500">
          Aviso: Componente não encontrado
        </div>
      )) as ComponentType<T>
    };
  }).catch((error) => {
    console.error('❌ Erro crítico no carregamento lazy:', error);
    // Retorna um componente de fallback em vez de lançar erro
    return { 
      default: (() => (
        <div className="p-4 text-center text-red-500">
          Erro crítico: {error.message}
        </div>
      )) as ComponentType<T>
    };
  });
}

// Wrapper para lazy loading com fallback personalizado
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function LazyWrapper({ 
  children, 
  fallback = <LoadingSpinner />, 
  className 
}: LazyWrapperProps) {
  return (
    <div className={className}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </div>
  );
}

// HOC para criar componentes lazy com configuração padrão
export function withLazyLoading<T extends Record<string, any>>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  fallback?: React.ReactNode
): FC<T> {
  const LazyComponent = lazy(importFn) as LazyExoticComponent<ComponentType<T>>;
  const WrappedComponent: FC<T> = (props: T) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      {/* props cast para evitar colisão com PropsWithRef e genéricos */}
      <LazyComponent {...(props as any)} />
    </Suspense>
  );
  return WrappedComponent;
}

// ============================================
// COMPONENTES LAZY - PÁGINAS PRINCIPAIS
// ============================================

// Páginas principais da aplicação
export const LazyDashboardPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/dashboard/page'))
);

export const LazyClientesPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/clientes/page'))
);

export const LazyServidoresPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/servidores/page'))
);

export const LazyPlanosPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/planos/page'))
);

export const LazyFinanceiroPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/financeiro/page'))
);

export const LazyPagamentosPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/pagamentos/page'))
);

export const LazyRelatoriosPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/relatorios/page'))
);

export const LazyTestesPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/testes/page'))
);

export const LazyIntegracoes = lazy(() => 
  toLazyDefault(import('@/app/(app)/integracoes/page'))
);

export const LazyMarketingPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/marketing/page'))
);

export const LazyNotificacoesPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/notificacoes/page'))
);

export const LazyConfiguracoesPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/configuracoes/page'))
);

export const LazyPerfilPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/perfil/page'))
);

export const LazyAjudaPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/ajuda/page'))
);

export const LazyLGPDPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/lgpd/page'))
);

export const LazyLogsPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/logs/page'))
);

export const LazyAdminPage = lazy(() => 
  toLazyDefault(import('@/app/(app)/admin/page'))
);

// ============================================
// COMPONENTES LAZY - DASHBOARDS
// ============================================

// Dashboard principal
export const LazyDashboard = lazy(() => 
  toLazyDefault(import('@/components/dashboard/modern-dashboard'))
);

// Dashboard de notificações
export const LazyNotificationDashboard = lazy(() => 
  toLazyDefault(import('@/components/dashboard/NotificationDashboard'))
);

// Dashboard de compliance
export const LazyComplianceDashboard = lazy(() => 
  toLazyDefault(import('@/components/app/ComplianceDashboard'))
);

// Dashboard de treinamento
export const LazyTrainingDashboard = lazy(() => 
  toLazyDefault(import('@/components/app/TrainingDashboard'))
);

// Dashboard de segurança
export const LazySecurityDashboard = lazy(() => 
  toLazyDefault(import('@/components/security/SecurityDashboard'))
);

// ============================================
// COMPONENTES LAZY - FORMULÁRIOS
// ============================================

// Formulários de teste
export const LazyAutomaticTestForm = lazy(() => 
  toLazyDefault(import('@/components/tests/automatic-test-form'))
);

export const LazyManualTestForm = lazy(() => 
  toLazyDefault(import('@/components/tests/manual-test-form'))
);

// Formulários de marketing
export const LazyCreateCampaignDialog = lazy(() => 
  toLazyDefault(import('@/components/marketing/create-campaign-dialog'))
);

export const LazyEmailTemplates = lazy(() => 
  toLazyDefault(import('@/components/marketing/email-templates'))
);

// ============================================
// COMPONENTES LAZY - RELATÓRIOS E ANALYTICS
// ============================================

// Analytics de notificações
export const LazyNotificationAnalytics = lazy(() => 
  toLazyDefault(import('@/components/dashboard/NotificationAnalytics'))
);

// Métricas de marketing
export const LazyMarketingMetrics = lazy(() => 
  toLazyDefault(import('@/components/marketing/marketing-metrics'))
);

// Métricas de integração
export const LazyIntegrationMetrics = lazy(() => 
  toLazyDefault(import('@/components/integrations/integration-metrics'))
);

// ============================================
// COMPONENTES LAZY - CONFIGURAÇÕES
// ============================================

// Configurações de notificação
export const LazyNotificationSettings = lazy(() => 
  toLazyDefault(import('@/components/dashboard/NotificationSettings'))
);

// Configurações SMTP
export const LazySMTPSettings = lazy(() => 
  toLazyDefault(import('@/components/marketing/smtp-settings'))
);

// Configurações NATV
export const LazyNATVConfig = lazy(() => 
  toLazyDefault(import('@/components/integrations/natv-config'))
);

// ============================================
// COMPONENTES LAZY - EDITORES E UPLOADS
// ============================================

// Editor HTML
export const LazyHTMLEditor = lazy(() => 
  toLazyDefault(import('@/components/ui/html-editor'))
);

// Upload de documentos
export const LazyDocumentUpload = lazy(() => 
  toLazyDefault(import('@/components/ui/document-upload'))
);

// Upload de imagens
export const LazyImageUpload = lazy(() => 
  toLazyDefault(import('@/components/ui/image-upload'))
);

// ============================================
// COMPONENTES LAZY - TABELAS E LISTAS
// ============================================

// Tabela responsiva
export const LazyResponsiveTable = lazy(() => 
  toLazyDefault(import('@/components/ui/responsive-table'))
);

// Tabela base
export const LazyBaseTable = lazy(() => 
  toLazyDefault(import('@/components/ui/base-table'))
);

// ============================================
// COMPONENTES LAZY - GRÁFICOS
// ============================================

// Gráfico de receita
export const LazyRevenueChart = lazy(() => 
  toLazyDefault(import('@/components/dashboard/revenue-chart'))
);

// Gráficos de chart
export const LazyChart = lazy(() => 
  import('@/components/ui/chart').then(mod => ({ default: mod.ChartContainer }))
);

// ============================================
// FALLBACKS PERSONALIZADOS
// ============================================

// Fallback para páginas principais
export const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[500px]">
    <div className="text-center space-y-4">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">
        Carregando página...
      </p>
    </div>
  </div>
);

// Fallback para dashboards
export const DashboardFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center space-y-4">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">
        Carregando dashboard...
      </p>
    </div>
  </div>
);

// Fallback para formulários
export const FormFallback = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="text-center space-y-2">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">
        Carregando formulário...
      </p>
    </div>
  </div>
);

// Fallback para tabelas
export const TableFallback = () => (
  <div className="flex items-center justify-center min-h-[300px]">
    <div className="text-center space-y-2">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">
        Carregando dados...
      </p>
    </div>
  </div>
);

// Fallback para gráficos
export const ChartFallback = () => (
  <div className="flex items-center justify-center min-h-[250px]">
    <div className="text-center space-y-2">
      <LoadingSpinner />
      <p className="text-sm text-muted-foreground">
        Carregando gráfico...
      </p>
    </div>
  </div>
);

// ============================================
// UTILITÁRIOS
// ============================================

// Preload de componentes críticos
export function preloadCriticalComponents() {
  if (typeof window !== 'undefined') {
    // Preload componentes que provavelmente serão usados
    const criticalComponents = [
      () => import('@/components/dashboard/modern-dashboard'),
      () => import('@/components/ui/responsive-table'),
      () => import('@/components/dashboard/NotificationDashboard'),
    ];
    
    // Preload após um pequeno delay para não impactar o carregamento inicial
    setTimeout(() => {
      criticalComponents.forEach(importFn => {
        importFn().catch(() => {
          // Silenciar erros de preload
        });
      });
    }, 2000);
  }
}

// Hook para lazy loading condicional
export function useLazyComponent<T>(
  condition: boolean,
  importFn: () => Promise<{ default: ComponentType<T> }>
) {
  const [Component, setComponent] = useState<ComponentType<T> | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (condition && !Component && !loading) {
      setLoading(true);
      importFn()
        .then(module => {
          setComponent(() => module.default);
        })
        .catch(error => {
          console.error('Erro ao carregar componente lazy:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [condition, Component, loading, importFn]);
  
  return { Component, loading };
}

// Exportar tudo como default para facilitar importação
export default {
  LazyWrapper,
  withLazyLoading,
  preloadCriticalComponents,
  useLazyComponent,
  // Páginas principais
  LazyDashboardPage,
  LazyClientesPage,
  LazyServidoresPage,
  LazyPlanosPage,
  LazyFinanceiroPage,
  LazyPagamentosPage,
  LazyRelatoriosPage,
  LazyTestesPage,
  LazyIntegracoes,
  LazyMarketingPage,
  LazyNotificacoesPage,
  LazyConfiguracoesPage,
  LazyPerfilPage,
  LazyAjudaPage,
  LazyLGPDPage,
  LazyLogsPage,
  LazyAdminPage,
  // Dashboards
  LazyDashboard,
  LazyNotificationDashboard,
  LazyComplianceDashboard,
  LazyTrainingDashboard,
  LazySecurityDashboard,
  // Formulários
  LazyAutomaticTestForm,
  LazyManualTestForm,
  LazyCreateCampaignDialog,
  LazyEmailTemplates,
  // Analytics
  LazyNotificationAnalytics,
  LazyMarketingMetrics,
  LazyIntegrationMetrics,
  // Configurações
  LazyNotificationSettings,
  LazySMTPSettings,
  LazyNATVConfig,
  // Editores
  LazyHTMLEditor,
  LazyDocumentUpload,
  LazyImageUpload,
  // Tabelas
  LazyResponsiveTable,
  LazyBaseTable,
  // Gráficos
  LazyRevenueChart,
  LazyChart,
  // Fallbacks
  PageFallback,
  DashboardFallback,
  FormFallback,
  TableFallback,
  ChartFallback,
};
