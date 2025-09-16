// @/components/app/main-nav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Package,
  Bell,
  Settings,
  FlaskConical,
  Server as ServerIcon,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Shield,
  CreditCard,
  MessageSquare,
  Mail,
  Plug,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { getBrowserUserRole, createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from "@/components/ui/sidebar";
import * as Collapsible from "@radix-ui/react-collapsible";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/testes", label: "Testes", icon: FlaskConical },
  { 
    isGroup: true,
    label: "Planos", 
    icon: Package,
    subItems: [
        { href: "/planos", label: "Planos Individuais" },
    { href: "/planos/grupos", label: "Grupos de Planos" },
    ]
  },
  { href: "/servidores", label: "Servidores", icon: ServerIcon },
  { href: "/pagamentos", label: "Pagamentos", icon: CreditCard },
  { href: "/marketing", label: "Marketing", icon: Mail },
  { href: "/integracoes", label: "Integrações", icon: Plug },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/ajuda", label: "Central de Ajuda", icon: LifeBuoy },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { id: "logout", label: "Sair", icon: LogOut },
];

export function MainNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const role = await getBrowserUserRole();
      setUserRole(role);
    } catch (error) {
      console.error('Erro ao verificar papel do usuário:', error);
      setUserRole(null);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });

      router.push("/login");
      router.refresh();
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message || "Ocorreu um erro ao desconectar.",
        variant: "destructive",
      });
    }
  };

  // Criar lista de itens de menu dinâmica baseada no papel do usuário
  const getMenuItems = () => {
    const items = [...menuItems];
    
    // Adicionar painel administrativo apenas para administradores
    if (userRole === 'admin') {
      const adminItem = { 
        isGroup: true,
        label: "Painel Admin", 
        icon: Shield,
        subItems: [
          { href: "/admin", label: "Visão Geral" },
          { href: "/admin/mensagens", label: "Sistema de Mensagens" },
        ]
      };
      // Inserir antes das configurações
      const configIndex = items.findIndex(item => item.href === '/configuracoes');
      if (configIndex !== -1) {
        items.splice(configIndex, 0, adminItem);
      } else {
        items.splice(-1, 0, adminItem); // Inserir antes do logout
      }
    }
    
    return items;
  };

  return (
    <SidebarMenu>
      {getMenuItems().map((item, index) => {
        if (item.isGroup && item.subItems) {
          const isGroupActive = item.subItems.some(sub => pathname?.startsWith(sub.href));
          return (
             <Collapsible.Root key={index} asChild defaultOpen={isGroupActive}>
                <SidebarMenuItem>
                    <Collapsible.Trigger asChild>
                        <SidebarMenuButton
                            isActive={isGroupActive}
                             tooltip={{
                                children: item.label,
                                className: "bg-primary text-primary-foreground",
                            }}
                        >
                            <item.icon />
                            <span>{item.label}</span>
                             <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </SidebarMenuButton>
                    </Collapsible.Trigger>
                    <Collapsible.Content asChild>
                        <SidebarMenuSub>
                            {item.subItems.map(subItem => (
                                <SidebarMenuSubItem key={subItem.href}>
                                    <SidebarMenuSubButton href={subItem.href} isActive={pathname === subItem.href}>
                                        {subItem.label}
                                    </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                            ))}
                        </SidebarMenuSub>
                    </Collapsible.Content>
                </SidebarMenuItem>
             </Collapsible.Root>
          )
        }
        // Item de logout
        if (item.id === "logout") {
          return (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip={{
                  children: item.label,
                  className: "bg-primary text-primary-foreground",
                }}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }
        
        // Itens de menu normais
        if (!item.href) return null;
        
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              isActive={pathname?.startsWith(item.href) || false}
              tooltip={{
                children: item.label,
                className: "bg-primary text-primary-foreground",
              }}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  );
}
