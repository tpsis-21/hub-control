'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Package, Calendar, CreditCard, TrendingUp, AlertCircle, BarChart3, Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tipos para as renovações
interface TheBestRenewal {
  id: string;
  user_id: string;
  package_id: string;
  payment_id: string;
  credits_added: number;
  expiry_date: string;
  status: 'pending' | 'completed' | 'failed';
  processed_at?: string;
  created_at: string;
  metadata?: {
    package_name?: string;
    payment_amount?: number;
    payment_method?: string;
  };
}

// Tipos para os pacotes
interface TheBestPackage {
  id: string;
  package_id: string;
  name: string;
  classification: string;
  duration_months: number;
  screens: number;
  credits: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Tipos para estatísticas
interface RenewalStats {
  total_renewals: number;
  total_credits: number;
  last_renewal: string | null;
  active_packages: number;
  status_breakdown: {
    completed: number;
    pending: number;
    failed: number;
  };
  monthly_stats: {
    month: string;
    renewals: number;
    credits: number;
  }[];
  success_rate: number;
}

interface TheBestRenewalsProps {
  userId: string;
}

export function TheBestRenewals({ userId }: TheBestRenewalsProps) {
  const [renewals, setRenewals] = useState<TheBestRenewal[]>([]);
  const [packages, setPackages] = useState<TheBestPackage[]>([]);
  const [stats, setStats] = useState<RenewalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadRenewals(),
        loadPackages(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados das renovações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRenewals = async () => {
    const response = await fetch(`/api/thebest/renewals?user_id=${userId}`);
    if (response.ok) {
      const data = await response.json();
      setRenewals(data.renewals || []);
    }
  };

  const loadPackages = async () => {
    const response = await fetch('/api/thebest/packages?active_only=true');
    if (response.ok) {
      const data = await response.json();
      setPackages(data.packages || []);
    }
  };

  const loadStats = async () => {
    const response = await fetch(`/api/thebest/renewals/stats?user_id=${userId}`);
    if (response.ok) {
      const data = await response.json();
      setStats(data.stats);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({
      title: 'Atualizado',
      description: 'Dados atualizados com sucesso'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive'
    } as const;

    const icons = {
      completed: <CheckCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      failed: <XCircle className="w-3 h-3" />
    };

    const labels = {
      completed: 'Concluída',
      pending: 'Pendente',
      failed: 'Falhou'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className="flex items-center gap-1">
        {icons[status as keyof typeof icons]}
        {labels[status as keyof typeof labels]}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin" />
        <span className="ml-2">Carregando renovações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de atualizar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Renovações The Best</h2>
          <p className="text-muted-foreground">
            Gerencie e visualize suas renovações automáticas
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Cards de estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Renovações</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_renewals}</div>
              <p className="text-xs text-muted-foreground">
                Taxa de sucesso: {stats.success_rate}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Créditos Adicionados</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_credits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total acumulado
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pacotes Ativos</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_packages}</div>
              <p className="text-xs text-muted-foreground">
                Disponíveis para renovação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Última Renovação</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-bold">
                {stats.last_renewal 
                  ? formatDate(stats.last_renewal)
                  : 'Nenhuma'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Processada com sucesso
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs principais */}
      <Tabs defaultValue="renewals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="renewals">Histórico de Renovações</TabsTrigger>
          <TabsTrigger value="packages">Pacotes Disponíveis</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
        </TabsList>

        {/* Tab: Histórico de Renovações */}
        <TabsContent value="renewals" className="space-y-4">
          {renewals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma renovação encontrada</h3>
                <p className="text-muted-foreground text-center">
                  Suas renovações automáticas aparecerão aqui após o primeiro pagamento processado.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {renewals.map((renewal) => (
                <Card key={renewal.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {renewal.metadata?.package_name || `Pacote ${renewal.package_id}`}
                        </CardTitle>
                        <CardDescription>
                          Pagamento: {renewal.payment_id}
                        </CardDescription>
                      </div>
                      {getStatusBadge(renewal.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Créditos Adicionados</p>
                        <p className="text-lg font-semibold">{renewal.credits_added.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Data de Expiração</p>
                        <p className="text-lg font-semibold">{formatDate(renewal.expiry_date)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Processado em</p>
                        <p className="text-lg font-semibold">
                          {renewal.processed_at 
                            ? formatDate(renewal.processed_at)
                            : 'Pendente'
                          }
                        </p>
                      </div>
                    </div>
                    {renewal.metadata?.payment_amount && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Valor do pagamento: {formatCurrency(renewal.metadata.payment_amount)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Pacotes Disponíveis */}
        <TabsContent value="packages" className="space-y-4">
          {packages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum pacote disponível</h3>
                <p className="text-muted-foreground text-center">
                  Os pacotes para renovação automática aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <Card key={pkg.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{pkg.name}</CardTitle>
                    <CardDescription>{pkg.classification}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Duração:</span>
                        <span className="font-medium">{pkg.duration_months} meses</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Telas:</span>
                        <span className="font-medium">{pkg.screens}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Créditos:</span>
                        <span className="font-medium">{pkg.credits.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab: Análises */}
        <TabsContent value="analytics" className="space-y-4">
          {stats ? (
            <div className="space-y-6">
              {/* Breakdown por Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Status das Renovações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Concluídas</span>
                        <span>{stats.status_breakdown.completed}</span>
                      </div>
                      <Progress 
                        value={stats.total_renewals > 0 ? (stats.status_breakdown.completed / stats.total_renewals) * 100 : 0} 
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Pendentes</span>
                        <span>{stats.status_breakdown.pending}</span>
                      </div>
                      <Progress 
                        value={stats.total_renewals > 0 ? (stats.status_breakdown.pending / stats.total_renewals) * 100 : 0} 
                        className="h-2"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Falharam</span>
                        <span>{stats.status_breakdown.failed}</span>
                      </div>
                      <Progress 
                        value={stats.total_renewals > 0 ? (stats.status_breakdown.failed / stats.total_renewals) * 100 : 0} 
                        className="h-2"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Estatísticas Mensais */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Renovações por Mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stats.monthly_stats.map((month) => (
                      <div key={month.month} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">
                            {new Date(month.month + '-01').toLocaleDateString('pt-BR', {
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {month.renewals} renovações
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{month.credits.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">créditos</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <BarChart3 className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Dados insuficientes</h3>
                <p className="text-muted-foreground text-center">
                  As análises aparecerão aqui após algumas renovações serem processadas.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}