"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  FlaskConical,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";
import { FormattedDate } from "@/components/app/formatted-date";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ActivityType = "new_client" | "test_created" | "payment" | "expiring" | "renewal";

type Activity = {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    email: string;
  };
  metadata?: Record<string, any>;
};

type RecentActivityProps = {
  activities: Activity[];
  className?: string;
};

const activityConfig = {
  new_client: {
    icon: UserPlus,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    badge: "success" as const,
  },
  test_created: {
    icon: FlaskConical,
    color: "text-blue-600",
    bgColor: "bg-blue-100 dark:bg-blue-900/20",
    badge: "default" as const,
  },
  payment: {
    icon: CreditCard,
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
    badge: "success" as const,
  },
  expiring: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
    badge: "warning" as const,
  },
  renewal: {
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-100 dark:bg-green-900/20",
    badge: "success" as const,
  },
};

export function RecentActivity({ activities, className }: RecentActivityProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Atividade Recente</CardTitle>
        <CardDescription>
          Últimas ações realizadas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma atividade recente</p>
            </div>
          ) : (
            activities.map((activity) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className={cn("p-2 rounded-full", config.bgColor)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium leading-none">
                        {activity.title}
                      </p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={config.badge} className="text-xs">
                          {activity.type.replace('_', ' ')}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-3 w-3 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-3 w-3 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {activity.description}
                    </p>
                    <div className="flex items-center justify-between">
                      {activity.user && (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {activity.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {activity.user.name}
                          </span>
                        </div>
                      )}
                      <FormattedDate 
                        dateString={activity.timestamp.toISOString()} 
                        format="dd/MM/yyyy HH:mm"
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {activities.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full">
              Ver todas as atividades
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para lista de clientes vencendo
type ExpiringClient = {
  id: string;
  name: string;
  email: string;
  plan: string;
  expiresAt: Date;
  daysLeft: number;
};

type ExpiringClientsProps = {
  clients: ExpiringClient[];
  className?: string;
};

export function ExpiringClients({ clients, className }: ExpiringClientsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Clientes Vencendo</CardTitle>
        <CardDescription>
          Clientes que precisam renovar em breve
        </CardDescription>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhum cliente vencendo</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => {
              const isUrgent = client.daysLeft <= 3;
              const isWarning = client.daysLeft <= 7;
              
              return (
                <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {client.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.plan}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge 
                      variant={isUrgent ? "destructive" : isWarning ? "warning" : "default"}
                      className="text-xs"
                    >
                      {client.daysLeft === 0 ? "Hoje" : `${client.daysLeft}d`}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      <FormattedDate dateString={client.expiresAt.toISOString()} format="dd/MM/yyyy" />
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {clients.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <Button variant="outline" size="sm" className="w-full" asChild>
              <Link href="/clientes?filter=expiring">
                Ver todos os vencimentos
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Componente para top clientes por receita
type TopClient = {
  id: string;
  name: string;
  email: string;
  revenue: number;
  plan: string;
};

type TopClientsProps = {
  clients: TopClient[];
  className?: string;
};

export function TopClients({ clients, className }: TopClientsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Top Clientes</CardTitle>
        <CardDescription>
          Clientes que mais geram receita
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {clients.map((client, index) => (
            <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {index + 1}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {client.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.plan}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  R$ {client.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}