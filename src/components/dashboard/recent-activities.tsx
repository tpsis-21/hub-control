// @/components/dashboard/recent-activities.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentActivities, useFormattedActivities } from "@/hooks/useRecentActivities";
import { FormattedDate } from "@/components/app/formatted-date";
import Link from "next/link";
import {
  Activity,
  Plus,
  Edit,
  Trash,
  LogIn,
  LogOut,
  AlertTriangle,
  User,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentActivitiesProps {
  limit?: number;
}

function getActivityIcon(iconName: string) {
  const icons = {
    Plus,
    Edit,
    Trash,
    LogIn,
    LogOut,
    AlertTriangle,
    Activity
  };
  
  const IconComponent = icons[iconName as keyof typeof icons] || Activity;
  return IconComponent;
}

function getActivityColor(color: string) {
  const colorMap = {
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300"
  };
  
  return colorMap[color as keyof typeof colorMap] || colorMap.blue;
}

function getSeverityBadge(severity?: string) {
  if (!severity) return null;
  
  const severityConfig = {
    LOW: { label: "Baixa", variant: "secondary" as const },
    MEDIUM: { label: "Média", variant: "default" as const },
    HIGH: { label: "Alta", variant: "destructive" as const },
    CRITICAL: { label: "Crítica", variant: "destructive" as const }
  };
  
  const config = severityConfig[severity as keyof typeof severityConfig];
  if (!config) return null;
  
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

export function RecentActivities({ limit = 8 }: RecentActivitiesProps) {
  const { activities, loading, error, refetch } = useRecentActivities(limit);
  const formattedActivities = useFormattedActivities(activities);

  if (loading) {
    return (
      <Card className="clean-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground heading-3">
            <Activity className="h-5 w-5" />
            Últimas Atividades
          </CardTitle>
          <CardDescription>Atividades recentes do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="clean-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground heading-3">
            <Activity className="h-5 w-5" />
            Últimas Atividades
          </CardTitle>
          <CardDescription>Atividades recentes do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={refetch} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="clean-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-foreground heading-3">
              <Activity className="h-5 w-5" />
              Últimas Atividades
            </CardTitle>
            <CardDescription>Atividades recentes do sistema</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={refetch} variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Link href="/logs">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver todos
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {formattedActivities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente</p>
          </div>
        ) : (
          formattedActivities.map((activity) => {
            const IconComponent = getActivityIcon(activity.icon);
            const colorClass = getActivityColor(activity.color);
            
            return (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <Avatar className={`h-10 w-10 ${colorClass}`}>
                  <AvatarFallback className={colorClass}>
                    <IconComponent className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium leading-none">
                      {activity.actionText} {activity.resourceText}
                    </p>
                    {getSeverityBadge(activity.severity)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {activity.user_email && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {activity.user_email}
                      </span>
                    )}
                    <span>
                      {formatDistanceToNow(new Date(activity.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                  
                  {activity.description && activity.description !== activity.actionText && (
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {activity.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {formattedActivities.length >= limit && (
          <div className="pt-2 border-t">
            <Link href="/logs">
              <Button variant="outline" className="w-full" size="sm">
                Ver todas as atividades
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}