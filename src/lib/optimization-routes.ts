/**
 * Configuração de Rotas do Sistema de Otimização
 * 
 * Este arquivo centraliza todas as rotas relacionadas ao sistema de otimização
 * e analytics, facilitando a navegação e manutenção.
 */

export interface RouteConfig {
  path: string;
  title: string;
  description: string;
  category: 'dashboard' | 'example' | 'config' | 'docs';
  icon?: string;
  external?: boolean;
}

/**
 * Rotas principais do sistema de otimização
 */
export const OPTIMIZATION_ROUTES: Record<string, RouteConfig> = {
  // Dashboards principais
  MAIN_DASHBOARD: {
    path: '/optimization',
    title: 'Dashboard Principal',
    description: 'Visão geral completa do sistema de otimização e analytics',
    category: 'dashboard',
    icon: 'LayoutDashboard'
  },
  
  // Exemplos e demonstrações
  INTEGRATION_EXAMPLE: {
    path: '/examples/optimization',
    title: 'Exemplo de Integração',
    description: 'Demonstração prática de como usar o sistema completo',
    category: 'example',
    icon: 'Code'
  },
  
  // Documentação
  DOCUMENTATION: {
    path: '/README-optimization.md',
    title: 'Documentação',
    description: 'Guia completo de uso e configuração do sistema',
    category: 'docs',
    icon: 'BookOpen',
    external: true
  },
  
  SYSTEM_DOCS: {
    path: '/docs/optimization-analytics-system.md',
    title: 'Documentação Técnica',
    description: 'Documentação detalhada da arquitetura do sistema',
    category: 'docs',
    icon: 'FileText',
    external: true
  }
};

/**
 * Configurações de navegação por categoria
 */
export const NAVIGATION_CONFIG = {
  dashboard: {
    title: 'Dashboards',
    description: 'Interfaces de monitoramento e controle',
    routes: Object.values(OPTIMIZATION_ROUTES).filter(r => r.category === 'dashboard')
  },
  example: {
    title: 'Exemplos',
    description: 'Demonstrações práticas e casos de uso',
    routes: Object.values(OPTIMIZATION_ROUTES).filter(r => r.category === 'example')
  },
  config: {
    title: 'Configurações',
    description: 'Configurações e preferências do sistema',
    routes: Object.values(OPTIMIZATION_ROUTES).filter(r => r.category === 'config')
  },
  docs: {
    title: 'Documentação',
    description: 'Guias e referências técnicas',
    routes: Object.values(OPTIMIZATION_ROUTES).filter(r => r.category === 'docs')
  }
};

/**
 * Breadcrumbs para navegação
 */
export interface BreadcrumbItem {
  title: string;
  path?: string;
}

export function getBreadcrumbs(currentPath: string): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Hub Control', path: '/' }
  ];
  
  // Encontra a rota atual
  const currentRoute = Object.values(OPTIMIZATION_ROUTES).find(
    route => route.path === currentPath
  );
  
  if (currentRoute) {
    // Adiciona categoria se não for dashboard principal
    if (currentRoute.category !== 'dashboard' || currentPath !== '/optimization') {
      breadcrumbs.push({
        title: NAVIGATION_CONFIG[currentRoute.category].title,
        path: currentRoute.category === 'dashboard' ? '/optimization' : undefined
      });
    }
    
    // Adiciona página atual
    breadcrumbs.push({
      title: currentRoute.title
    });
  }
  
  return breadcrumbs;
}

/**
 * Utilitários para navegação
 */
export class NavigationUtils {
  /**
   * Obtém todas as rotas de uma categoria específica
   */
  static getRoutesByCategory(category: RouteConfig['category']): RouteConfig[] {
    return Object.values(OPTIMIZATION_ROUTES).filter(route => route.category === category);
  }
  
  /**
   * Obtém informações de uma rota pelo path
   */
  static getRouteByPath(path: string): RouteConfig | undefined {
    return Object.values(OPTIMIZATION_ROUTES).find(route => route.path === path);
  }
  
  /**
   * Gera menu de navegação estruturado
   */
  static getNavigationMenu() {
    return Object.entries(NAVIGATION_CONFIG).map(([key, config]) => ({
      ...config,
      key,
      routes: config.routes
    }));
  }
  
  /**
   * Verifica se uma rota é externa
   */
  static isExternalRoute(path: string): boolean {
    const route = this.getRouteByPath(path);
    return route?.external || false;
  }
  
  /**
   * Obtém próxima/anterior rota para navegação sequencial
   */
  static getAdjacentRoutes(currentPath: string): {
    previous?: RouteConfig;
    next?: RouteConfig;
  } {
    const routes = Object.values(OPTIMIZATION_ROUTES);
    const currentIndex = routes.findIndex(route => route.path === currentPath);
    
    if (currentIndex === -1) {
      return {};
    }
    
    return {
      previous: currentIndex > 0 ? routes[currentIndex - 1] : undefined,
      next: currentIndex < routes.length - 1 ? routes[currentIndex + 1] : undefined
    };
  }
}

/**
 * Hook React para navegação
 */
export function useOptimizationNavigation(currentPath: string) {
  const currentRoute = NavigationUtils.getRouteByPath(currentPath);
  const breadcrumbs = getBreadcrumbs(currentPath);
  const adjacentRoutes = NavigationUtils.getAdjacentRoutes(currentPath);
  const navigationMenu = NavigationUtils.getNavigationMenu();
  
  return {
    currentRoute,
    breadcrumbs,
    adjacentRoutes,
    navigationMenu,
    isExternal: NavigationUtils.isExternalRoute(currentPath)
  };
}

/**
 * Configurações de meta tags para SEO
 */
export function getRouteMetadata(path: string) {
  const route = NavigationUtils.getRouteByPath(path);
  
  if (!route) {
    return {
      title: 'Hub Control',
      description: 'Sistema de controle e otimização'
    };
  }
  
  return {
    title: `${route.title} | Hub Control`,
    description: route.description,
    keywords: [
      'otimização',
      'performance',
      'analytics',
      'dashboard',
      'react',
      'typescript'
    ].join(', ')
  };
}

export default OPTIMIZATION_ROUTES;
