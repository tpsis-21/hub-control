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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getClientUser } from "@/lib/supabase-client";
import { InAppNotifications } from "./notifications/in-app-notifications";

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
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getClientUser().then(user => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

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
      '/notificacoes': 'Notificações',
      '/integracoes': 'Integrações',
      '/configuracoes': 'Configurações',
      '/mensagens': 'Fila de Mensagens',
      '/admin': 'Painel Admin'
    };
    
    return routeTitles[pathname] || 'Hub Control';
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
          {/* Notifications */}
          {userId && <InAppNotifications userId={userId} />}



          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="/avatars/01.png" alt="@admin" />
                  <AvatarFallback className="bg-muted text-foreground">AD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Admin</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    admin@iptvmanager.com
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
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