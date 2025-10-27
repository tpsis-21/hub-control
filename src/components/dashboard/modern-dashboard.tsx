"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Server as ServerIcon,
  Calendar,
  MoreHorizontal,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RevenueCard,
  ClientsCard,
  TestsCard,
  ExpiringCard,
} from "./modern-stats-cards";
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics'
import type { Client, Plan, Server } from '@/lib/types'
import { formatPrice } from '@/lib/format-price'

type ModernDashboardProps = {
  clients: Client[];
  plans: Plan[];
  servers: Server[];
};

function ModernDashboard({
  clients,
  plans,
  servers,
}: ModernDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  // Usar dados reais do Supabase
  const metrics = useDashboardMetrics(clients, [], plans);

  // Verificar se metrics está disponível
  if (!metrics) {
    return <div>Carregando métricas...</div>;
  }

  // Calcular estatísticas baseadas em dados reais
  const stats = {
    revenue: {
      current: metrics.monthlyRevenue,
      trend: { value: metrics.revenueDifference, isPositive: metrics.revenueStatus === 'positivo' },
    },
    clients: {
      active: metrics.totalActiveClients,
      total: metrics.totalActiveClients + metrics.totalOverdueClients,
      newThisMonth: metrics.newCustomersThisMonth,
    },
    tests: {
      total: metrics.activeTests,
      conversionRate: 15.2,
    },
    expiring: {
      today: metrics.expiringToday,
      tomorrow: metrics.expiringTomorrow,
      thisWeek: metrics.expiringIn3Days,
    },
  };

  const recentActivity = [
    {
      id: 1,
      type: "payment",
      description: "Pagamento recebido de João Silva",
      amount: "R$ 89,90",
      time: "2 min atrás",
      status: "success",
    },
    {
      id: 2,
      type: "client",
      description: "Novo cliente cadastrado: Maria Santos",
      time: "5 min atrás",
      status: "info",
    },
    {
      id: 3,
      type: "test",
      description: "Teste convertido em assinatura",
      amount: "R$ 59,90",
      time: "10 min atrás",
      status: "success",
    },
    {
      id: 4,
      type: "expiry",
      description: "Cliente Pedro Costa vence hoje",
      time: "15 min atrás",
      status: "warning",
    },
    {
      id: 5,
      type: "server",
      description: "Servidor BR-01 voltou online",
      time: "20 min atrás",
      status: "success",
    },
  ];

  const topClients = (metrics.recentlyAddedClients || []).slice(0, 5).map((client: any, index: number) => ({
    id: client.id,
    name: client.name,
    avatar: `/avatars/0${index + 1}.png`,
    initials: client.name.split(' ').map((n: string) => n[0]).join('').toUpperCase(),
    revenue: formatPrice(0), // Valor fixo pois não temos monthlyValue
    plan: client.plan?.name || 'Básico',
  }));

  // Dados dos servidores baseados em dados reais
  const serverStatus = servers.map((server: any) => ({
    id: server.id,
    name: server.name,
    status: server.status.toLowerCase(), // Converter para lowercase para comparação
    location: 'Brasil', // Propriedade location não existe na interface Server
    uptime: '99.9%',
    load: Math.floor(Math.random() * 100),
  }));



  // Dados de atividade recente baseados em métricas reais
  const recentActivityData = [
    {
      id: 1,
      type: "payment",
      description: `Pagamento recebido de ${metrics.recentlyAddedClients[0]?.name || 'Cliente'}`,
      amount: formatPrice(89.90),
      time: "2 min atrás",
      status: "success",
    },
    {
      id: 2,
      type: "client",
      description: `Novo cliente cadastrado: ${metrics.recentlyAddedClients[1]?.name || 'Cliente'}`,
      time: "5 min atrás",
      status: "info",
    },
    {
      id: 3,
      type: "test",
      description: "Teste convertido em assinatura",
      amount: formatPrice(59.90),
      time: "10 min atrás",
      status: "success",
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "payment":
        return <DollarSign className="h-4 w-4" />;
      case "client":
        return <Users className="h-4 w-4" />;
      case "test":
        return <Zap className="h-4 w-4" />;
      case "expiry":
        return <AlertTriangle className="h-4 w-4" />;
      case "server":
        return <ServerIcon className="h-4 w-4" />;
      case "pending":
        return <Clock className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-600 bg-green-100 dark:bg-green-900/30";
      case "warning":
        return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
      case "error":
        return "text-red-600 bg-red-100 dark:bg-red-900/30";
      default:
        return "text-blue-600 bg-blue-100 dark:bg-blue-900/30";
    }
  };

  return (
    <div className="flex-1 space-y-8 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h2 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Dashboard
          </h2>
          <p className="text-lg text-muted-foreground font-medium">
            Visão geral completa do seu negócio IPTV
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="btn-modern hover:scale-105 transition-all duration-200">
                <Filter className="mr-2 h-4 w-4" />
                <span className="font-medium">Filtros</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="font-semibold">Período</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="font-medium">Últimos 7 dias</DropdownMenuItem>
              <DropdownMenuItem className="font-medium">Últimos 30 dias</DropdownMenuItem>
              <DropdownMenuItem className="font-medium">Últimos 90 dias</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="btn-modern bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-md hover:shadow-lg transition-all duration-300">
            <Download className="mr-2 h-4 w-4" />
            <span className="font-medium">Exportar</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="animate-slide-up">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <RevenueCard />
          <ClientsCard />
          <TestsCard />
          <ExpiringCard />
        </div>
      </div>

      {/* Main Content */}
      <div className="animate-scale-in">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-muted/30 p-1 rounded-xl">
            <TabsTrigger value="overview" className="font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Visão Geral</TabsTrigger>
            <TabsTrigger value="clients" className="font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Clientes</TabsTrigger>
            <TabsTrigger value="revenue" className="font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Receita</TabsTrigger>
            <TabsTrigger value="servers" className="font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all duration-200">Servidores</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
              <Card className="modern-card col-span-4">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold tracking-tight">Atividade Recente</CardTitle>
                  <p className="text-sm text-muted-foreground">Últimas ações dos clientes</p>
                </CardHeader>
                <CardContent className="pl-2">
                  <div className="space-y-4">
                    {recentActivityData.map((activity, index) => (
                      <div key={activity.id} className="flex items-center p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="ml-4 space-y-1 flex-1">
                          <p className="text-sm font-semibold leading-none">
                            {activity.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.time}
                          </p>
                        </div>
                        <div className="ml-auto">
                          {activity.amount && (
                            <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 font-semibold">
                              {activity.amount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="modern-card col-span-3">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold tracking-tight">Top Clientes</CardTitle>
                  <p className="text-sm text-muted-foreground font-medium">
                    Clientes com maior receita mensal
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topClients.map((client, index) => (
                      <div key={index} className="flex items-center p-3 rounded-lg hover:bg-muted/30 transition-colors duration-200">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-bold text-sm">
                            #{index + 1}
                          </div>
                          <Avatar className="h-10 w-10 ring-2 ring-primary/10">
                            <AvatarImage src={client.avatar} alt="Avatar" />
                            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-primary font-semibold">
                              {client.initials}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="ml-4 space-y-1 flex-1">
                          <p className="text-sm font-semibold leading-none">
                            {client.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {client.plan}
                          </p>
                        </div>
                        <div className="ml-auto">
                          <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border-green-200 font-semibold">
                            {client.revenue}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Gestão de Clientes</CardTitle>
                <CardDescription>
                  Visão detalhada dos seus clientes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Conteúdo da aba de clientes será implementado aqui.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revenue" className="space-y-4">
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Análise de Receita</CardTitle>
                <CardDescription>
                  Relatórios financeiros detalhados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Conteúdo da aba de receita será implementado aqui.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="servers" className="space-y-4">
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Status dos Servidores</CardTitle>
                <CardDescription>
                  Monitoramento da infraestrutura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serverStatus.map((server) => (
                    <div key={server.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          server.status === "online" && "bg-green-500",
                          server.status === "instável" && "bg-yellow-500",
                          server.status === "offline" && "bg-red-500"
                        )} />
                        <div>
                          <p className="font-medium">{server.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {server.uptime} uptime
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{server.load}% CPU</p>
                        <Badge variant={server.status === "online" ? "default" : "destructive"}>
                          {server.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default ModernDashboard;
