/**
 * Componente de Navegação do Sistema de Otimização
 * 
 * Fornece navegação consistente entre todas as páginas do sistema
 * de otimização e analytics.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  NavigationUtils, 
  useOptimizationNavigation,
  NAVIGATION_CONFIG 
} from '@/lib/optimization-routes';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  ChevronDown,
  LayoutDashboard,
  Code,
  BookOpen,
  FileText,
  ExternalLink,
  Home,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

/**
 * Mapeamento de ícones
 */
const ICON_MAP = {
  LayoutDashboard,
  Code,
  BookOpen,
  FileText,
  ExternalLink,
  Home
};

/**
 * Componente de Breadcrumb
 */
export function OptimizationBreadcrumb() {
  const pathname = usePathname();
  const { breadcrumbs } = useOptimizationNavigation(pathname);
  
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbItem>
              {item.path ? (
                <BreadcrumbLink asChild>
                  <Link href={item.path}>{item.title}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{item.title}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/**
 * Menu dropdown de navegação
 */
export function OptimizationNavigationMenu() {
  const pathname = usePathname();
  const { navigationMenu } = useOptimizationNavigation(pathname);
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Navegação
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        {navigationMenu.map((category) => (
          <React.Fragment key={category.key}>
            <DropdownMenuLabel>{category.title}</DropdownMenuLabel>
            {category.routes.map((route) => {
              const IconComponent = ICON_MAP[route.icon as keyof typeof ICON_MAP] || FileText;
              const isActive = pathname === route.path;
              
              return (
                <DropdownMenuItem key={route.path} asChild>
                  <Link 
                    href={route.path}
                    className={`flex items-center space-x-2 ${isActive ? 'bg-accent' : ''}`}
                    target={route.external ? '_blank' : undefined}
                    rel={route.external ? 'noopener noreferrer' : undefined}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span>{route.title}</span>
                    {route.external && <ExternalLink className="h-3 w-3 ml-auto" />}
                    {isActive && <Badge variant="secondary" className="ml-auto">Atual</Badge>}
                  </Link>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Navegação sequencial (anterior/próximo)
 */
export function OptimizationSequentialNavigation() {
  const pathname = usePathname();
  const { adjacentRoutes } = useOptimizationNavigation(pathname);
  
  if (!adjacentRoutes.previous && !adjacentRoutes.next) {
    return null;
  }
  
  return (
    <div className="flex items-center justify-between mt-8 pt-8 border-t">
      <div>
        {adjacentRoutes.previous && (
          <Link href={adjacentRoutes.previous.path}>
            <Button variant="outline" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <div className="text-left">
                <div className="text-xs text-gray-500">Anterior</div>
                <div className="font-medium">{adjacentRoutes.previous.title}</div>
              </div>
            </Button>
          </Link>
        )}
      </div>
      
      <div>
        {adjacentRoutes.next && (
          <Link href={adjacentRoutes.next.path}>
            <Button variant="outline" className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-xs text-gray-500">Próximo</div>
                <div className="font-medium">{adjacentRoutes.next.title}</div>
              </div>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Barra de navegação completa
 */
export function OptimizationNavigationBar() {
  const pathname = usePathname();
  const { currentRoute } = useOptimizationNavigation(pathname);
  
  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo e breadcrumb */}
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2">
              <Home className="h-5 w-5" />
              <span className="font-semibold">Hub Control</span>
            </Link>
            <div className="text-gray-300">|</div>
            <OptimizationBreadcrumb />
          </div>
          
          {/* Menu de navegação */}
          <div className="flex items-center space-x-4">
            {currentRoute && (
              <Badge variant="outline">
                {NAVIGATION_CONFIG[currentRoute.category].title}
              </Badge>
            )}
            <OptimizationNavigationMenu />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Sidebar de navegação (para layouts mais complexos)
 */
export function OptimizationSidebar() {
  const pathname = usePathname();
  const { navigationMenu } = useOptimizationNavigation(pathname);
  
  return (
    <div className="w-64 bg-white border-r h-full">
      <div className="p-6">
        <h2 className="text-lg font-semibold mb-4">Sistema de Otimização</h2>
        
        <nav className="space-y-6">
          {navigationMenu.map((category) => (
            <div key={category.key}>
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">
                {category.title}
              </h3>
              <ul className="space-y-1">
                {category.routes.map((route) => {
                  const IconComponent = ICON_MAP[route.icon as keyof typeof ICON_MAP] || FileText;
                  const isActive = pathname === route.path;
                  
                  return (
                    <li key={route.path}>
                      <Link
                        href={route.path}
                        className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        target={route.external ? '_blank' : undefined}
                        rel={route.external ? 'noopener noreferrer' : undefined}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{route.title}</span>
                        {route.external && <ExternalLink className="h-3 w-3 ml-auto" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

/**
 * Cards de navegação rápida
 */
export function OptimizationQuickNavigation() {
  const navigationMenu = NavigationUtils.getNavigationMenu();
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {navigationMenu.map((category) => (
        <div key={category.key} className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
          <p className="text-gray-600 text-sm mb-4">{category.description}</p>
          
          <div className="space-y-2">
            {category.routes.map((route) => {
              const IconComponent = ICON_MAP[route.icon as keyof typeof ICON_MAP] || FileText;
              
              return (
                <Link
                  key={route.path}
                  href={route.path}
                  className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 transition-colors"
                  target={route.external ? '_blank' : undefined}
                  rel={route.external ? 'noopener noreferrer' : undefined}
                >
                  <IconComponent className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{route.title}</span>
                  {route.external && <ExternalLink className="h-3 w-3 ml-auto text-gray-400" />}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default OptimizationNavigationBar;