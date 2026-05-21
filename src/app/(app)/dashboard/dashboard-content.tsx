// @/app/(app)/dashboard/dashboard-content.tsx
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, Users, FlaskConical, Clock, UserCheck, Calendar, History, UserX, AlertTriangle, CalendarCheck, CalendarClock, TrendingUp, TrendingDown, Activity, Zap, Target, BarChart3 } from "lucide-react";
import Link from "next/link";
import { FormattedDate } from "@/components/app/formatted-date";
import { AddCustomerForm } from "@/app/(app)/clientes/add-customer-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Client, Plan, Server } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { AddTestForm } from "@/app/(app)/testes/add-test-form";
import { useDashboardMetrics } from "@/hooks/useDashboardMetrics";
import { useTestConversionRate } from "@/hooks/useTestConversionRate";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { Badge } from "@/components/ui/badge";

import { RecentActivities } from "@/components/dashboard/recent-activities";
import { ContextualAssistant } from "@/components/ui/contextual-assistant";

type DashboardContentProps = {
    clients: Client[];
    tests: Client[];
    plans: Plan[];
    servers: Server[];
}

export function DashboardContent({ clients, tests, plans, servers }: DashboardContentProps) {
  const { handleError } = useErrorHandler();
  
  // Usar hooks especializados para cálculos
  const metrics = useDashboardMetrics(clients, tests, plans);
  const conversionRate = useTestConversionRate(clients);
  
  // Tratamento de erro para dados inválidos
  if (!clients || !plans) {
    handleError(new Error('Dados necessários não foram carregados'), 'Dashboard');
    return null;
  }

  if (!metrics) {
    return (
       <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-32" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-24 mb-2" />
                            <Skeleton className="h-3 w-40" />
                        </CardContent>
                    </Card>
                ))}
            </div>
             <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Clientes Vencendo Hoje</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
                  <Card>
                    <CardHeader>
                        <CardTitle>Novos Clientes Adicionados</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
        <div id="dashboard-header" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <AddTestForm plans={plans} servers={servers}>
              <Button className="btn-gradient w-full sm:w-auto min-h-10">
                <FlaskConical className="h-4 w-4 mr-2" />
                Criar Teste
              </Button>
            </AddTestForm>
            <AddCustomerForm plans={plans} servers={servers}>
              <Button variant="outline" className="btn-gradient-secondary w-full sm:w-auto min-h-10">
                <UserCheck className="h-4 w-4 mr-2" />
                Adicionar Cliente
              </Button>
            </AddCustomerForm>
        </div>
      
      {/* Seção de Faturamento */}
      <div id="stats-section" className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="heading-3 text-foreground">Faturamento</h2>
          </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="clean-card-hover status-success">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Receita do Mês</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">R$ {metrics.monthlyRevenue.toFixed(2)}</div>
                  <p className={`text-xs ${metrics.revenueStatus === 'positivo' ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.revenueStatus === 'positivo' ? '+' : ''}{metrics.revenueDifference.toFixed(1)}% em relação ao mês anterior
                </p>
              </CardContent>
            </Card>
            <Card className="clean-card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Receita Mês Anterior</CardTitle>
                <History className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">R$ {metrics.previousMonthRevenue.toFixed(2)}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Faturamento de <FormattedDate dateString={metrics.previousMonthName} format="LLLL" />
                </p>
              </CardContent>
            </Card>
              <Card className="clean-card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Receita no Ano</CardTitle>
                <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">R$ {metrics.yearlyRevenue.toFixed(2)}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Total para o ano de {metrics.currentYear}
                </p>
              </CardContent>
            </Card>
              <Card className="clean-card-hover status-info">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Novos Clientes no Mês</CardTitle>
                <Users className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">+{metrics.newCustomersThisMonth}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  no mês de <FormattedDate dateString={metrics.currentMonthName} format="LLLL" />
                </p>
              </CardContent>
            </Card>
          </div>
      </div>

      {/* Seção de Clientes e Vencimentos */}
      <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            <h2 className="heading-3 text-foreground">Clientes e Vencimentos</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <Card className="clean-card-hover status-success">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Clientes Ativos</CardTitle>
                <UserCheck className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.totalActiveClients}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total de clientes com assinatura ativa</p>
              </CardContent>
            </Card>
              <Card className="clean-card-hover status-error">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Total de Vencidos</CardTitle>
                <UserX className="h-5 w-5 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.totalOverdueClients}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Assinaturas com data de expiração passada</p>
              </CardContent>
            </Card>
            <Card className="clean-card-hover status-warning">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Vencidos Ontem</CardTitle>
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.expiringYesterday}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Clientes que venceram ontem</p>
              </CardContent>
            </Card>
              <Card className="clean-card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Vence Hoje</CardTitle>
                <CalendarCheck className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.expiringToday?.length || 0}</div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Clientes que vencem hoje</p>
              </CardContent>
            </Card>
              <Card className="clean-card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Vence Amanhã</CardTitle>
                <CalendarClock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.expiringTomorrow}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Clientes que vencem amanhã</p>
              </CardContent>
            </Card>
              <Card className="clean-card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Vence em 3 Dias</CardTitle>
                <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.expiringIn3Days}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Clientes que vencem nos próximos 3 dias</p>
              </CardContent>
            </Card>
              <Card className="clean-card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Testes Ativos</CardTitle>
                <FlaskConical className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{metrics.activeTests}</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Contas de teste em andamento</p>
              </CardContent>
            </Card>
              <Card className="clean-card-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">Taxa de Conversão</CardTitle>
                <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{conversionRate.rate.toFixed(1)}%</div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Testes convertidos em clientes</p>
              </CardContent>
            </Card>
          </div>
      </div>

      {/* Seção de Clientes Vencendo Hoje */}
      <div id="expiring-clients-section" className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card className="clean-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground heading-3">
              <CalendarCheck className="h-5 w-5" />
              Clientes Vencendo Hoje
            </CardTitle>
            <CardDescription>Clientes que precisam renovar hoje</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!metrics.expiringToday || metrics.expiringToday.length === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente vencendo hoje</p>
            ) : (
              metrics.expiringToday.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center space-x-4">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-orange-100 text-orange-700">
                      {client.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Vence: <FormattedDate dateString={client.expirationDate} format="dd/MM/yyyy" />
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    <Link href={`/clientes/${client.id}`}>
                      <Button variant="outline" size="sm">Ver</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
            {metrics.expiringToday && metrics.expiringToday.length > 5 && (
              <div className="pt-2">
                <Link href="/clientes?status=expiring_today">
                  <Button variant="outline" className="w-full">Ver todos ({metrics.expiringToday.length})</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card id="new-clients-section" className="clean-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground heading-3">
              <Users className="h-5 w-5" />
              Novos Clientes Adicionados
            </CardTitle>
            <CardDescription>Últimos clientes cadastrados no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!metrics.recentlyAddedClients || metrics.recentlyAddedClients.length === 0) ? (
              <p className="text-sm text-muted-foreground">Nenhum cliente adicionado recentemente</p>
            ) : (
              metrics.recentlyAddedClients.slice(0, 5).map((client) => (
                <div key={client.id} className="flex items-center space-x-4">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {client.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{client.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Cadastrado: <FormattedDate dateString={client.created_at || new Date().toISOString()} format="dd/MM/yyyy" />
                    </p>
                  </div>
                  <div className="ml-auto font-medium">
                    <Link href={`/clientes/${client.id}`}>
                      <Button variant="outline" size="sm">Ver</Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
            {metrics.recentlyAddedClients && metrics.recentlyAddedClients.length > 5 && (
              <div className="pt-2">
                <Link href="/clientes">
                  <Button variant="outline" className="w-full">Ver todos</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Seção de Últimas Atividades */}
      <div id="recent-activities-section" className="grid gap-4">
        <RecentActivities limit={8} />
      </div>
      
      {/* Assistente Contextual */}
      <ContextualAssistant
        pageId="dashboard"
        steps={[
          {
            id: "welcome",
            title: "Bem-vindo ao Dashboard!",
            content: "Esta é sua tela principal onde você pode visualizar um resumo geral do sistema.",
            target: "dashboard-header"
          },
          {
            id: "stats",
            title: "Estatísticas Gerais",
            content: "Aqui você vê o total de clientes, clientes ativos, receita mensal e taxa de conversão.",
            target: "stats-section"
          },
          {
            id: "new-clients",
            title: "Novos Clientes",
            content: "Esta seção mostra os clientes adicionados recentemente ao sistema.",
            target: "new-clients-section"
          },
          {
            id: "expiring-clients",
            title: "Clientes Vencendo",
            content: "Aqui você pode ver quais clientes têm pagamentos vencendo hoje.",
            target: "expiring-clients-section"
          },
          {
            id: "recent-activities",
            title: "Últimas Atividades",
            content: "Esta seção exibe as atividades mais recentes do sistema, como logins, criação de clientes, etc.",
            target: "recent-activities-section"
          }
        ]}
      />
    </div>
  );
}

