// @/components/app/notifications/in-app-notifications.tsx
"use client";

import { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Info, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { FormattedDate } from "@/components/app/formatted-date";

interface InAppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  created_at: string;
}

const notificationIcons = {
  payment_activated: DollarSign,
  payment_pending: AlertCircle,
  payment_confirmed: CheckCircle,
  system: Info,
  default: Bell,
};

const notificationColors = {
  payment_activated: "text-green-600",
  payment_pending: "text-orange-600",
  payment_confirmed: "text-blue-600",
  system: "text-gray-600",
  default: "text-gray-600",
};

export function InAppNotifications({ userId, autoRefresh = false, refreshInterval = 300 }: { 
  userId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Carregamento inicial
  useEffect(() => {
    loadNotifications();
  }, [userId]);

  // Auto-refresh apenas se explicitamente habilitado e com intervalo mínimo de 5 minutos
  useEffect(() => {
    if (!autoRefresh || refreshInterval < 300) return;
    
    const interval = setInterval(loadNotifications, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Usar API route ao invés de Server Action para evitar problemas de ID inconsistente
  const loadNotifications = async () => {
    try {
      const response = await fetch(`/api/notifications/in-app?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      // Em caso de erro, definir array vazio para evitar quebrar a UI
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Usar API route para marcar como lida também
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return { success: false, error: 'Erro ao marcar notificação como lida' };
    }
  };

  const handleNotificationClick = async (notification: InAppNotification) => {
    // Marcar como lida se não estiver lida
    if (!notification.read) {
      try {
        const result = await markAsRead(notification.id);
        if (result.success) {
          setNotifications(prev => 
            (prev || []).map(n => n.id === notification.id ? { ...n, read: true } : n)
          );
        }
      } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
      }
    }

    // Redirecionar baseado no tipo de notificação
    if (notification.type === 'payment_activated' || notification.type === 'payment_confirmed') {
      router.push('/pagamentos');
    }
  };

  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  const getNotificationIcon = (type: string) => {
    const IconComponent = notificationIcons[type as keyof typeof notificationIcons] || notificationIcons.default;
    const colorClass = notificationColors[type as keyof typeof notificationColors] || notificationColors.default;
    return <IconComponent className={`w-4 h-4 ${colorClass}`} />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} nova(s)</Badge>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Carregando...</p>
          </div>
        ) : (notifications?.length || 0) === 0 ? (
          <div className="p-4 text-center">
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
          </div>
        ) : (
          <ScrollArea className="h-80">
            {notifications?.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`p-3 cursor-pointer hover:bg-muted/50 ${
                  !notification.read ? 'bg-blue-50/50' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3 w-full">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-sm font-medium truncate ${
                        !notification.read ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 ml-2" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <FormattedDate 
                        dateString={notification.created_at} 
                        format="dd/MM/yyyy HH:mm" 
                      />
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}
        
        {(notifications?.length || 0) > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center justify-center text-sm text-primary cursor-pointer"
              onClick={() => router.push('/pagamentos')}
            >
              Ver todos os pagamentos
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
