"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserUser, createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import { InAppNotifications } from "./notifications/in-app-notifications";
import { useTheme } from "next-themes";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type ModernHeaderProps = {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  actions?: React.ReactNode;
  className?: string;
};

export function ModernHeader({
  title,
  subtitle,
  showSearch = true,
  actions,
  className,
}: ModernHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  useEffect(() => {
    const loadUserData = async () => {
      const currentUser = await getBrowserUser();
      if (currentUser) {
        setUserId(currentUser.id);
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
    };
    
    loadUserData();
  }, []);

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      await supabase.auth.signOut();
      router.push('/login');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao fazer logout",
        description: "Ocorreu um erro ao tentar desconectar.",
        variant: "destructive",
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

  // Função para obter o título da página baseado na rota
  const getPageTitle = () => {
    if (title) return title;
    
    const routeTitles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/clientes': 'Clientes',
      '/planos': 'Planos Individuais',
      '/planos/grupos': 'Grupos de Planos',
      '/testes': 'Testes',
      '/servidores': 'Servidores',
      '/financeiro': 'Financeiro',
      '/relatorios': 'Relatórios',
      '/notificacoes': 'Notificações',
      '/integracoes': 'Integrações',
      '/checkout/pedidos': 'Checkout',
      '/pagamentos': 'Pagamentos',
      '/marketing': 'Marketing',
      '/configuracoes': 'Configurações',
      '/mensagens': 'Fila de Mensagens',
      '/logs': 'Logs e auditoria',
      '/ajuda': 'Central de Ajuda',
      '/perfil': 'Perfil',
      '/admin': 'Painel Admin',
      '/admin/mensagens': 'Administração de Mensagens',
      '/integracoes/gates2b': 'Integração Gates2b',
      '/documentacao/api-chatbots': 'API para Chatbots',
      '/lgpd': 'Direitos LGPD',
    };

    if (pathname) {
      if (routeTitles[pathname]) return routeTitles[pathname];
      if (pathname.startsWith('/clientes/')) return 'Detalhes do Cliente';
      if (pathname.startsWith('/testes/') && pathname !== '/testes') return 'Detalhes do Teste';
      if (pathname.startsWith('/integracoes/')) return 'Integrações';
    }

    return 'Hub Control';
  };

  const pageTitle = getPageTitle();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex h-16 items-center gap-4 px-4">
        {/* Sidebar trigger */}
        <SidebarTrigger className="-ml-1" />

        {/* Title section */}
        <div className="flex flex-col">
          <h1 className="heading-1 text-foreground animate-fade-in">{pageTitle}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>



        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}

        {/* Quick actions */}
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 px-0">
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Alternar tema</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>
                <Sun className="mr-2 h-4 w-4" />
                <span>Claro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>
                <Moon className="mr-2 h-4 w-4" />
                <span>Escuro</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>
                <Monitor className="mr-2 h-4 w-4" />
                <span>Sistema</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          {userId && <InAppNotifications userId={userId} />}



          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={userProfile?.avatar_url || ""} alt="@user" />
                  <AvatarFallback className="bg-hub-blue text-white font-semibold">{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email || "email@dominio.com"}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil">
                  <User className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/configuracoes">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
