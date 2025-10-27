'use client';

import { lazy } from 'react';
import LazyPageWrapper, { 
  DashboardSkeleton, 
  TableSkeleton, 
  FormSkeleton 
} from './LazyPageWrapper';

/**
 * Componentes lazy para páginas principais
 * Implementa code splitting para melhorar performance
 */

// Dashboard
export const LazyDashboard = lazy(() => 
  import('@/app/(app)/dashboard/dashboard-content').then(module => ({
    default: (props: { clients: any[], plans: any[], servers: any[] }) => (
      <LazyPageWrapper fallback={<DashboardSkeleton />} title="Dashboard">
        <module.DashboardContent {...props} />
      </LazyPageWrapper>
    )
  }))
);

// Clientes
export const LazyCustomers = lazy(() => 
  import('@/app/(app)/clientes/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<TableSkeleton />} title="Clientes">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Planos
export const LazyPlans = lazy(() => 
  import('@/app/(app)/planos/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<TableSkeleton />} title="Planos">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Servidores
export const LazyServers = lazy(() => 
  import('@/app/(app)/servidores/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<TableSkeleton />} title="Servidores">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Testes
export const LazyTests = lazy(() => 
  import('@/app/(app)/testes/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<TableSkeleton />} title="Testes">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Financeiro
export const LazyFinanceiro = lazy(() => 
  import('@/app/(app)/financeiro/financeiro-content').then(module => ({
    default: (props: { initialData: any[] }) => (
      <LazyPageWrapper fallback={<DashboardSkeleton />} title="Financeiro">
        <module.FinanceiroContent {...props} />
      </LazyPageWrapper>
    )
  }))
);

// Pagamentos
export const LazyPayments = lazy(() => 
  import('@/app/(app)/pagamentos/payments-content').then(module => ({
    default: (props: { initialPayments: any[] }) => (
      <LazyPageWrapper fallback={<DashboardSkeleton />} title="Pagamentos">
        <module.PaymentsContent {...props} />
      </LazyPageWrapper>
    )
  }))
);

// Notificações
export const LazyNotifications = lazy(() => 
  import('@/app/(app)/notificacoes/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<FormSkeleton />} title="Notificações">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Marketing
export const LazyMarketing = lazy(() => 
  import('@/app/(app)/marketing/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<FormSkeleton />} title="Marketing">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Relatórios
export const LazyReports = lazy(() => 
  import('@/app/(app)/relatorios/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<DashboardSkeleton />} title="Relatórios">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Configurações
export const LazySettings = lazy(() => 
  import('@/app/(app)/configuracoes/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<FormSkeleton />} title="Configurações">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Logs
export const LazyLogs = lazy(() => 
  import('@/app/(app)/logs/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<TableSkeleton />} title="Logs">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Integrações
export const LazyIntegrations = lazy(() => 
  import('@/app/(app)/integracoes/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<FormSkeleton />} title="Integrações">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// TheBest Plan Mapping (componente pesado)
export const LazyTheBestMapping = lazy(() => 
  import('@/components/integrations/thebest-plan-mapping').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<FormSkeleton />} title="Mapeamento TheBest">
        <module.TheBestPlanMappingManager />
      </LazyPageWrapper>
    )
  }))
);

// Ajuda
export const LazyHelp = lazy(() => 
  import('@/app/(app)/ajuda/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<TableSkeleton />} title="Ajuda">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Perfil
export const LazyProfile = lazy(() => 
  import('@/app/(app)/perfil/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<FormSkeleton />} title="Perfil">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// LGPD
export const LazyLGPD = lazy(() => 
  import('@/app/(app)/lgpd/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<FormSkeleton />} title="LGPD">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

// Mensagens
export const LazyMessages = lazy(() => 
  import('@/app/(app)/mensagens/page').then(module => ({
    default: () => (
      <LazyPageWrapper fallback={<FormSkeleton />} title="Mensagens">
        <module.default />
      </LazyPageWrapper>
    )
  }))
);

/**
 * Hook para pré-carregar componentes lazy
 * Útil para pré-carregar páginas que o usuário provavelmente visitará
 */
export const preloadLazyComponents = {
  dashboard: () => import('@/app/(app)/dashboard/dashboard-content'),
  customers: () => import('@/app/(app)/clientes/page'),
  plans: () => import('@/app/(app)/planos/page'),
  servers: () => import('@/app/(app)/servidores/page'),
  tests: () => import('@/app/(app)/testes/page'),
  financial: () => import('@/app/(app)/financeiro/financeiro-content'),
  payments: () => import('@/app/(app)/pagamentos/payments-content'),
  notifications: () => import('@/app/(app)/notificacoes/page'),
  marketing: () => import('@/app/(app)/marketing/page'),
  reports: () => import('@/app/(app)/relatorios/page'),
  settings: () => import('@/app/(app)/configuracoes/page'),
  logs: () => import('@/app/(app)/logs/page'),
  integrations: () => import('@/app/(app)/integracoes/page'),
  thebestMapping: () => import('@/components/integrations/thebest-plan-mapping'),
  help: () => import('@/app/(app)/ajuda/page'),
  profile: () => import('@/app/(app)/perfil/page'),
  lgpd: () => import('@/app/(app)/lgpd/page'),
  messages: () => import('@/app/(app)/mensagens/page')
};

/**
 * Função utilitária para pré-carregar componentes baseado na rota atual
 */
export const preloadBasedOnRoute = (currentPath: string) => {
  // Pré-carrega componentes relacionados baseado na página atual
  if (currentPath.includes('/dashboard')) {
    preloadLazyComponents.customers();
    preloadLazyComponents.financial();
  } else if (currentPath.includes('/clientes')) {
    preloadLazyComponents.plans();
    preloadLazyComponents.tests();
  } else if (currentPath.includes('/financeiro')) {
    preloadLazyComponents.payments();
    preloadLazyComponents.reports();
  }
};

export default {
  LazyDashboard,
  LazyCustomers,
  LazyPlans,
  LazyServers,
  LazyTests,
  LazyFinanceiro,
  LazyPayments,
  LazyNotifications,
  LazyMarketing,
  LazyReports,
  LazySettings,
  LazyLogs,
  LazyIntegrations,
  LazyTheBestMapping,
  LazyHelp,
  LazyProfile,
  LazyLGPD,
  LazyMessages
};
