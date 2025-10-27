"use client";

import * as React from "react";
import {
  Tv,
  LayoutDashboard,
  Users,
  Server as ServerIcon,
  TestTube,
  CreditCard,
  Settings,
  Plug,
  BarChart3,
  Bell,
  HelpCircle,
  Shield,
  Search,
  ChevronRight,
  LogOut,
  FileText,
  ScrollText,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getBrowserUser, createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navigationData = {
  navPrincipal: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
      description: "Painel principal com métricas",
    },
    {
      title: "Clientes",
      url: "/clientes",
      icon: Users,
      description: "Gerenciar clientes ativos",
    },
    {
      title: "Planos",
      url: "/planos",
      icon: CreditCard,
      description: "Configurar planos e preços",
      items: [
        {
          title: "Planos Individuais",
          url: "/planos",
        },
        {
          title: "Grupos de Planos",
          url: "/planos/grupos",
        },
      ],
    },
    {
      title: "Testes",
      url: "/testes",
      icon: TestTube,
      description: "Controle de testes e conversões",
    },
    {
      title: "Servidores",
      url: "/servidores",
      icon: ServerIcon,
      description: "Monitorar infraestrutura",
    },
  ],
  navFinanceiro: [
    {
      title: "Financeiro",
      url: "/financeiro",
      icon: BarChart3,
      description: "Controle financeiro e relatórios",
    },
    {
      title: "Relatórios",
      url: "/relatorios",
      icon: FileText,
      description: "Análise completa dos dados",
    },
  ],
  navSistema: [
    {
      title: "Notificações",
      url: "/notificacoes",
      icon: Bell,
    },
    {
      title: "Integrações",
      url: "/integracoes",
      icon: Plug,
    },
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: Settings,
    },
    {
      title: "Fila de Mensagens",
      url: "/mensagens",
      icon: BarChart3,
    },
    {
      title: "Logs",
      url: "/logs",
      icon: ScrollText,
      description: "Auditoria e monitoramento",
    },
    {
      title: "Painel Admin",
      url: "/admin",
      icon: Shield,
    },
  ],
  navSecondary: [
    {
      title: "Configurações",
      url: "/configuracoes",
      icon: Settings,
    },
    {
      title: "Ajuda",
      url: "/ajuda",
      icon: HelpCircle,
    },
  ],
};

function SearchForm({ onSearch }: { onSearch: (term: string) => void }) {
  const [searchTerm, setSearchTerm] = React.useState("");

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  return (
    <SidebarGroup className="py-0">
      <SidebarGroupContent className="relative">
        <Label htmlFor="search" className="sr-only">
          Buscar
        </Label>
        <SidebarInput
          id="search"
          placeholder="Buscar funcionalidades..."
          className="pl-8"
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 opacity-50 select-none" />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavUser() {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<any>(null);
  const [mounted, setMounted] = React.useState(false);
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    setMounted(true);
    const loadUserData = async () => {
      try {
        const currentUser = await getBrowserUser();
        if (currentUser) {
          setUser(currentUser);
          
          // Buscar dados do perfil do usuário
          const supabase = createBrowserSupabaseClient();
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();
          
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
      }
    };
    
    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push('/login');
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao fazer logout. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const getUserDisplayName = () => {
    if (userProfile?.full_name) return userProfile.full_name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    return user?.email?.split('@')[0] || "Usuário";
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserRole = () => {
    if (userProfile?.role === 'admin') return 'Administrador';
    if (userProfile?.role === 'user') return 'Usuário';
    return 'Usuário';
  };

  // Evitar erro de hidratação - mostrar dados padrão até montar
  if (!mounted) {
    return (
      <div className="space-y-2">
        <div className="px-3 py-2 text-xs text-muted-foreground border-t">
          <div className="truncate">admin@iptvmanager.com</div>
        </div>
        
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src="" alt="Admin" />
                    <AvatarFallback className="rounded-lg bg-hub-blue text-white font-semibold">
                      AD
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Admin</span>
                    <span className="truncate text-xs text-muted-foreground">Administrador</span>
                  </div>
                  <ChevronRight className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link href="/perfil">
                    <Settings className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/configuracoes">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-2">
        <div className="px-3 py-2 text-xs text-muted-foreground border-t">
          <div className="truncate">Não autenticado</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Email do usuário */}
      <div className="px-3 py-2 text-xs text-muted-foreground border-t">
        <div className="truncate">{user.email}</div>
      </div>
      
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={userProfile?.avatar_url || ""} alt={getUserDisplayName()} />
                  <AvatarFallback className="rounded-lg bg-hub-blue text-white font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{getUserDisplayName()}</span>
                  <span className="truncate text-xs text-muted-foreground">{getUserRole()}</span>
                </div>
                <ChevronRight className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
              side="bottom"
              align="end"
              sideOffset={4}
            >
              <DropdownMenuItem asChild>
                <Link href="/perfil">
                  <Settings className="mr-2 h-4 w-4" />
                  Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/configuracoes">
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </div>
  );
}

function NavPrincipal({ items }: { items: typeof navigationData.navPrincipal }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Principal</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            // Se o item tem subitens, renderiza como collapsible
            if ('items' in item && item.items) {
              return (
                <Collapsible key={item.title} asChild defaultOpen={pathname?.startsWith(item.url) || false}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((subItem) => (
                          <SidebarMenuSubItem key={subItem.title}>
                            <SidebarMenuSubButton asChild isActive={pathname === subItem.url}>
                              <Link href={subItem.url}>
                                <span>{subItem.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }
            
            // Item normal sem subitens
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={pathname === item.url}
                >
                  <Link href={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavFinanceiro({ items }: { items: typeof navigationData.navFinanceiro }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Financeiro</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.url}
              >
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavSistema({ items }: { items: typeof navigationData.navSistema }) {
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Sistema</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={pathname === item.url}
              >
                <Link href={item.url}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function NavSecondary({ items }: { items: typeof navigationData.navSecondary }) {
  const pathname = usePathname();

  return (
    <SidebarGroup className="mt-auto">
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={pathname === item.url}
              >
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function ModernSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [searchTerm, setSearchTerm] = React.useState("");

  // Função para filtrar itens baseado no termo de busca
  const filterItems = (items: any[]) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  const filteredNavPrincipal = filterItems(navigationData.navPrincipal);
  const filteredNavFinanceiro = filterItems(navigationData.navFinanceiro);
  const filteredNavSistema = filterItems(navigationData.navSistema);

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center"
            >
              <div className="flex items-center gap-2">
                <Logo 
                  variant="icon" 
                  size="sm" 
                  className="group-data-[collapsible=icon]:w-6 group-data-[collapsible=icon]:h-6" 
                />
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate heading-2 text-foreground">Hub Control</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SearchForm onSearch={setSearchTerm} />
      </SidebarHeader>
      <SidebarContent>
        <NavPrincipal items={filteredNavPrincipal} />
        <NavFinanceiro items={filteredNavFinanceiro} />
        <NavSistema items={filteredNavSistema} />
        <NavSecondary items={navigationData.navSecondary} />
      </SidebarContent>
      <SidebarFooter className="border-t">
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
