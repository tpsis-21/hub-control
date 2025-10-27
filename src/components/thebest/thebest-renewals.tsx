'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Package, CreditCard, Calendar, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface Package {
  id: string;
  package_id: number;
  name: string;
  classification: string;
  duration_months: number;
  screens: number;
  credits: number;
  is_active: boolean;
}

interface Renewal {
  id: string;
  package_id: number;
  payment_id: string;
  package_name: string;
  credits_added: number;
  expiration_date: string;
  status: 'pending' | 'completed' | 'failed';
  processed_at: string;
  created_at: string;
  thebest_packages?: Package;
}

interface RenewalStats {
  total_renewals: number;
  total_credits: number;
  last_renewal: string | null;
  active_packages: number;
}

export function TheBestRenewals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [stats, setStats] = useState<RenewalStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadRenewals = async () => {
    const response = await fetch(`/api/thebest/renewals?user_id=${user?.id}`);
    if (response.ok) {
      const data = await response.json();
      setRenewals(data.renewals || []);
    }
  };

  const loadPackages = async () => {
    const response = await fetch('/api/thebest/packages');
    if (response.ok) {
      const data = await response.json();
      setPackages(data.packages || []);
    }
  };

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

  const loadStats = async () => {
    const response = await fetch(`/api/thebest/renewals/stats?user_id=${user?.id}`);
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
      description: 'Dados das renovações atualizados com sucesso'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      pending: { variant: 'secondary' as const, icon: AlertCircle, color: 'text-yellow-600' },
      failed: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status === 'completed' ? 'Concluída' : 
         status === 'pending' ? 'Pendente' : 'Falhou'}
      </Badge>
    );
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando renovações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Renovações The Best</h2>
          <p className="text-muted-foreground">
            Gerencie e acompanhe as renovações automáticas dos pacotes
          </p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={refreshing}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Renovações</p>
                  <p className="text-2xl font-bold">{stats.total_renewals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total de Créditos</p>
                  <p className="text-2xl font-bold">{stats.total_credits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Última Renovação</p>
                  <p className="text-sm font-medium">
                    {stats.last_renewal ? formatDate(stats.last_renewal) : 'Nenhuma'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Pacotes Ativos</p>
                  <p className="text-2xl font-bold">{stats.active_packages}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="renewals" className="space-y-4">
        <TabsList>
          <TabsTrigger value="renewals">Histórico de Renovações</TabsTrigger>
          <TabsTrigger value="packages">Pacotes Disponíveis</TabsTrigger>
        </TabsList>

        {/* Histórico de Renovações */}
        <TabsContent value="renewals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Renovações</CardTitle>
              <CardDescription>
                Acompanhe todas as renovações automáticas processadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renewals.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma renovação encontrada. As renovações aparecerão aqui após os pagamentos serem processados.
                  </AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Pacote</TableHead>
                      <TableHead>Créditos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pagamento ID</TableHead>
                      <TableHead>Expiração</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewals.map((renewal) => (
                      <TableRow key={renewal.id}>
                        <TableCell>
                          {formatDate(renewal.processed_at || renewal.created_at)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{renewal.package_name}</p>
                            {renewal.thebest_packages && (
                              <p className="text-sm text-muted-foreground">
                                {renewal.thebest_packages.classification} • 
                                {renewal.thebest_packages.duration_months} mês(es) • 
                                {renewal.thebest_packages.screens} tela(s)
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            +{renewal.credits_added} créditos
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(renewal.status)}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1 py-0.5 rounded">
                            {renewal.payment_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          {formatDate(renewal.expiration_date)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pacotes Disponíveis */}
        <TabsContent value="packages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pacotes Disponíveis</CardTitle>
              <CardDescription>
                Pacotes que podem ser renovados automaticamente via pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {packages.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhum pacote encontrado. Execute a importação dos pacotes primeiro.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {packages.map((pkg) => (
                    <Card key={pkg.id} className="relative">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline">
                              ID: {pkg.package_id}
                            </Badge>
                            <Badge 
                              variant={pkg.is_active ? 'default' : 'secondary'}
                            >
                              {pkg.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                          
                          <h3 className="font-semibold text-sm">{pkg.name}</h3>
                          
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>📺 {pkg.screens} tela(s)</p>
                            <p>⏱️ {pkg.duration_months} mês(es)</p>
                            <p>💳 {pkg.credits} créditos</p>
                            <p>🏷️ {pkg.classification}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
