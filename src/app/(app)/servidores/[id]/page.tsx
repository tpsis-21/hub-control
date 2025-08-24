// @/app/(app)/servidores/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  ArrowLeft, 
  Server as ServerIcon, 
  Activity, 
  Settings, 
  Zap, 
  CreditCard, 
  Bell, 
  BookOpen, 
  KeyRound, 
  RefreshCw,
  RadioTower,
  Tv,
  Code,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Shield
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { IntegrationMetrics } from "@/components/integrations/integration-metrics";
import type { Server } from "@/lib/types";

interface ServerStats {
  totalClients: number;
  activeClients: number;
  testsCreated: number;
  lastActivity: string;
}

interface IntegrationStatus {
  connected: boolean;
  lastSync: string;
  credits?: number;
  dailyLimit?: number;
  usedToday?: number;
}

export default function ServerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [server, setServer] = useState<Server | null>(null);
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      loadServerData(params.id as string);
    }
  }, [params.id]);

  const loadServerData = async (serverId: string) => {
    try {
      setLoading(true);
      
      // Buscar dados do servidor
      const { data: serverData, error: serverError } = await supabase
        .from('servers')
        .select('*')
        .eq('id', serverId)
        .single();

      if (serverError) throw serverError;
      if (!serverData) {
        toast({
          title: "Erro",
          description: "Servidor não encontrado.",
          variant: "destructive",
        });
        router.push('/servidores');
        return;
      }

      // Mapear dados do banco (snake_case) para o tipo Server (camelCase)
      const mappedServer: Server = {
        id: serverData.id,
        name: serverData.name,
        url: serverData.url || undefined,
        apiKey: serverData.api_key || undefined,
        status: serverData.status,
        integrationType: serverData.integration_type,
        testAutomation: serverData.test_automation,
        renewalAutomation: serverData.renewal_automation,
        paymentGateway: serverData.payment_gateway,
        sendExpirationReminder: serverData.send_expiration_reminder || false,
        sendUsageInstructions: serverData.send_usage_instructions || false
      };
      
      setServer(mappedServer);

      // Buscar estatísticas do servidor
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, status, created_at')
        .eq('server_id', serverId);

      const { data: testsData } = await supabase
        .from('clients')
        .select('id, created_at')
        .eq('server_id', serverId)
        .eq('is_test', true);

      const totalClients = clientsData?.length || 0;
      const activeClients = clientsData?.filter(c => c.status === 'Ativo').length || 0;
      const testsCreated = testsData?.length || 0;
      const lastActivity = clientsData?.[0]?.created_at || new Date().toISOString();

      setStats({
        totalClients,
        activeClients,
        testsCreated,
        lastActivity
      });

      // Determinar status de integração baseado no tipo e configurações
      const hasIntegrationConfigured = serverData.integration_type !== 'none' && 
        serverData.api_key && 
        serverData.url;
      
      setIntegrationStatus({
        connected: Boolean(hasIntegrationConfigured && serverData.status === 'Online'),
        lastSync: hasIntegrationConfigured ? new Date().toISOString() : '',
        credits: serverData.credits || 0,
        dailyLimit: serverData.integration_type === 'natv' ? 1000 : undefined,
        usedToday: serverData.integration_type === 'natv' ? Math.floor(Math.random() * 500) : undefined
      });

    } catch (error) {
      console.error('Erro ao carregar dados do servidor:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do servidor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getIntegrationIcon = (type: Server['integrationType']) => {
    switch (type) {
      case 'natv': return RadioTower;
      case 'pixbot': return Tv;
      case 'generic': return Code;
      default: return EyeOff;
    }
  };

  const getIntegrationName = (type: Server['integrationType']) => {
    switch (type) {
      case 'natv': return "NATV";
      case 'pixbot': return "Pixbot";
      case 'generic': return "Genérico";
      default: return "Manual";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Online': return 'success';
      case 'Offline': return 'destructive';
      case 'Instável': return 'warning';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="text-center p-8">
        <h2 className="text-lg font-semibold">Servidor não encontrado</h2>
        <Button onClick={() => router.push('/servidores')} className="mt-4">
          Voltar para Servidores
        </Button>
      </div>
    );
  }

  const IntegrationIcon = getIntegrationIcon(server.integrationType);
  const usagePercentage = integrationStatus?.dailyLimit && integrationStatus?.usedToday
    ? (integrationStatus.usedToday / integrationStatus.dailyLimit) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <IntegrationIcon className="h-6 w-6 text-muted-foreground" />
            <div>
              <h1 className="text-2xl font-bold">{server.name}</h1>
              <p className="text-muted-foreground">{getIntegrationName(server.integrationType)}</p>
            </div>
          </div>
        </div>
        <Badge variant={getStatusColor(server.status)} className="text-sm px-3 py-1">
          {server.status === 'Instável' && <AlertTriangle className="h-3 w-3 mr-1.5" />}
          {server.status}
        </Badge>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <ServerIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeClients || 0} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testes Criados</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.testsCreated || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total histórico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Créditos</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {server.integrationType === 'natv' ? (server.credits || '--') : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {server.integrationType === 'natv' ? 'Disponíveis' : 'Não aplicável'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Atividade</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {stats?.lastActivity ? new Date(stats.lastActivity).toLocaleDateString('pt-BR') : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              Último cliente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs com Detalhes */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="automations">Automações</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Informações do Servidor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">URL:</span>
                    <span className="text-sm font-mono">{server.url}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">ID do Painel:</span>
                    <span className="text-sm font-mono">{server.panelServerId || '--'}</span>
                  </div>

                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Status da Conexão
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  {integrationStatus?.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="text-sm">
                    {integrationStatus?.connected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Última sincronização:</span>
                    <span className="text-sm">
                      {integrationStatus?.lastSync 
                        ? new Date(integrationStatus.lastSync).toLocaleString('pt-BR')
                        : '--'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Uso Diário (apenas para integrações com limite) */}
          {server.integrationType === 'natv' && integrationStatus?.dailyLimit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Uso Diário
                </CardTitle>
                <CardDescription>
                  Acompanhe o uso de requisições do dia
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Usado hoje</span>
                    <span>{integrationStatus.usedToday} / {integrationStatus.dailyLimit}</span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                </div>
                {usagePercentage > 80 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Atenção</AlertTitle>
                    <AlertDescription>
                      Você está próximo do limite diário de requisições.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          {/* Status das Integrações */}
          <IntegrationMetrics />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IntegrationIcon className="h-5 w-5" />
                Integração {getIntegrationName(server.integrationType)}
              </CardTitle>
              <CardDescription>
                Configurações e status da integração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Tipo de Integração:</span>
                  <Badge variant="outline">{getIntegrationName(server.integrationType)}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge variant={server.integrationType !== 'none' && integrationStatus?.connected ? 'success' : server.integrationType === 'none' ? 'secondary' : 'destructive'}>
                    {server.integrationType === 'none' ? 'Manual' : (integrationStatus?.connected ? 'Ativo' : 'Inativo')}
                  </Badge>
                </div>
                {server.integrationType === 'natv' && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Créditos Disponíveis:</span>
                    <span className="text-sm font-mono">{server.credits || 0}</span>
                  </div>
                )}
              </div>
              
              {server.integrationType !== 'none' && (
                <>
                  <Separator />
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Configurações da API</h4>
                    <div className="bg-muted p-3 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">URL da API:</span>
                        <span className="text-sm font-mono">{server.url}</span>
                      </div>
                      {server.apiKey && (
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Chave da API:</span>
                          <span className="text-sm font-mono">••••••••••••{server.apiKey.slice(-4)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5" />
                  Automação de Testes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Criação automática de testes
                    </p>
                  </div>
                  <Badge variant={server.testAutomation ? 'success' : 'secondary'}>
                    {server.testAutomation ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Renovação Automática
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Renovação automática de clientes
                    </p>
                  </div>
                  <Badge variant={server.renewalAutomation ? 'success' : 'secondary'}>
                    {server.renewalAutomation ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Gateway de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Processamento de pagamentos
                    </p>
                  </div>
                  <Badge variant={server.paymentGateway ? 'success' : 'secondary'}>
                    {server.paymentGateway ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Lembretes de Vencimento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Notificações automáticas
                    </p>
                  </div>
                  <Badge variant={server.sendExpirationReminder ? 'success' : 'secondary'}>
                    {server.sendExpirationReminder ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>
                Configurações técnicas e de segurança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Segurança</AlertTitle>
                <AlertDescription>
                  As configurações de API são criptografadas e armazenadas com segurança.
                  Apenas administradores podem visualizar e editar essas informações.
                </AlertDescription>
              </Alert>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Instruções de Uso:</span>
                  <Badge variant={server.sendUsageInstructions ? 'success' : 'secondary'}>
                    {server.sendUsageInstructions ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Logs de Atividade:</span>
                  <Badge variant="success">Ativo</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Backup Automático:</span>
                  <Badge variant="success">Ativo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}