/**
 * Página de Configuração de Períodos
 * 
 * Interface administrativa para configurar tipos de cálculo de períodos
 * para servidores e planos, além de monitoramento de créditos.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Settings,
  Server,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Save,
  TestTube,
  Monitor,
  Calendar,
  DollarSign
} from 'lucide-react';
import { 
  validateServerConfig, 
  validatePlanConfig, 
  validateMonitoringConfig,
  type ServerConfig as ServerConfigType,
  type PlanConfig as PlanConfigType,
  type MonitoringConfig 
} from '@/lib/validations/period-config';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface ServerConfig {
  id: string;
  name: string;
  type: string;
  period_calculation_type: 'monthly' | 'custom' | null;
  period_calculation_config: any;
  credit_monitoring_enabled: boolean;
  credit_warning_threshold: number;
  credit_critical_threshold: number;
  credit_notification_enabled: boolean;
  current_credits?: number;
  status: 'active' | 'inactive' | 'warning' | 'critical';
}

interface PlanConfig {
  id: string;
  name: string;
  period_calculation_override: 'monthly' | 'custom' | null;
  period_calculation_config: any;
  servers_count?: number;
}

interface CreditAlert {
  id: string;
  server_id: string;
  server_name: string;
  alert_type: 'warning' | 'critical';
  current_credits: number;
  threshold: number;
  created_at: string;
  resolved: boolean;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function PeriodConfigPage() {
  const { toast } = useToast();
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [plans, setPlans] = useState<PlanConfig[]>([]);
  const [creditAlerts, setCreditAlerts] = useState<CreditAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedServer, setSelectedServer] = useState<ServerConfig | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Carregar configurações de servidores e planos
      const [serversRes, plansRes, alertsRes] = await Promise.all([
        fetch('/api/admin/period-config?type=servers'),
        fetch('/api/admin/period-config?type=plans'),
        fetch('/api/admin/credit-monitoring')
      ]);

      if (serversRes.ok) {
        const serversData = await serversRes.json();
        setServers(serversData.servers || []);
      }

      if (plansRes.ok) {
        const plansData = await plansRes.json();
        setPlans(plansData.plans || []);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setCreditAlerts(alertsData.alerts || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveServerConfig = async (serverId: string, config: Partial<ServerConfig>) => {
    try {
      setIsSaving(true);
      setValidationErrors([]);
      
      // Validar configuração antes de salvar
      const validation = validateServerConfig(config as unknown as ServerConfigType);
      if (!validation.success) {
        setValidationErrors(validation.errors || ['Erro de validação']);
        toast({
          title: 'Erro de validação',
          description: 'Erro de validação encontrado',
          variant: 'destructive'
        });
        return;
      }
      
      const response = await fetch('/api/admin/period-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'server',
          id: serverId,
          config
        })
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Configuração do servidor salva com sucesso'
        });
        await loadData();
      } else {
        throw new Error('Falha ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configuração do servidor',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const savePlanConfig = async (planId: string, config: Partial<PlanConfig>) => {
    try {
      setIsSaving(true);
      setValidationErrors([]);
      
      // Validar configuração antes de salvar
      const validation = validatePlanConfig(config as unknown as PlanConfigType);
      if (!validation.success) {
        setValidationErrors(validation.errors || ['Erro de validação']);
        toast({
          title: 'Erro de validação',
          description: 'Erro de validação encontrado',
          variant: 'destructive'
        });
        return;
      }
      
      const response = await fetch('/api/admin/period-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'plan',
          id: planId,
          config
        })
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Configuração do plano salva com sucesso'
        });
        await loadData();
      } else {
        throw new Error('Falha ao salvar configuração');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configuração do plano',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testConfiguration = async (type: 'server' | 'plan', id: string) => {
    try {
      const response = await fetch('/api/admin/period-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test',
          type,
          id
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Teste Concluído',
          description: `Configuração válida. Próximo período: ${result.nextPeriod}`
        });
      } else {
        toast({
          title: 'Erro no Teste',
          description: result.error || 'Configuração inválida',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Erro no teste:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar configuração',
        variant: 'destructive'
      });
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/credit-monitoring`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Alerta marcado como resolvido'
        });
        await loadData();
      }
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao resolver alerta',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuração de Períodos</h1>
          <p className="text-muted-foreground">
            Gerencie tipos de cálculo de períodos e monitoramento de créditos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Alertas de Validação */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Erros de validação encontrados:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Alertas de Crédito */}
      {creditAlerts.filter(a => !a.resolved).length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                {creditAlerts.filter(a => !a.resolved).length} alerta(s) de crédito ativo(s)
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => document.getElementById('credit-monitoring-tab')?.click()}
              >
                Ver Alertas
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Principais */}
      <Tabs defaultValue="servers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="servers">Servidores</TabsTrigger>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="credit-monitoring" id="credit-monitoring-tab">Monitoramento de Créditos</TabsTrigger>
        </TabsList>

        {/* Tab de Servidores */}
        <TabsContent value="servers" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Servidores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Servidores ({servers.length})
                </CardTitle>
                <CardDescription>
                  Selecione um servidor para configurar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {servers.map(server => (
                  <div 
                    key={server.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedServer?.id === server.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedServer(server)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{server.name}</div>
                        <div className="text-sm text-muted-foreground">{server.type}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={server.status === 'active' ? 'default' : 
                                 server.status === 'warning' ? 'secondary' : 'destructive'}
                        >
                          {server.status === 'active' ? 'Ativo' :
                           server.status === 'warning' ? 'Aviso' : 
                           server.status === 'critical' ? 'Crítico' : 'Inativo'}
                        </Badge>
                        {server.period_calculation_type && (
                          <Badge variant="outline">
                            {server.period_calculation_type === 'monthly' ? 'Mensal' : 'Personalizado'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {server.current_credits !== undefined && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Créditos</span>
                          <span>{server.current_credits}</span>
                        </div>
                        <Progress 
                          value={Math.max(0, Math.min(100, (server.current_credits / 1000) * 100))} 
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Configuração do Servidor Selecionado */}
            {selectedServer && (
              <ServerConfigForm 
                server={selectedServer}
                onSave={saveServerConfig}
                onTest={testConfiguration}
                isSaving={isSaving}
              />
            )}
          </div>
        </TabsContent>

        {/* Tab de Planos */}
        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista de Planos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Planos ({plans.length})
                </CardTitle>
                <CardDescription>
                  Selecione um plano para configurar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {plans.map(plan => (
                  <div 
                    key={plan.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPlan?.id === plan.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedPlan(plan)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{plan.name}</div>
                        {plan.servers_count !== undefined && (
                          <div className="text-sm text-muted-foreground">
                            {plan.servers_count} servidor(es)
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {plan.period_calculation_override && (
                          <Badge variant="outline">
                            {plan.period_calculation_override === 'monthly' ? 'Mensal' : 'Personalizado'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Configuração do Plano Selecionado */}
            {selectedPlan && (
              <PlanConfigForm 
                plan={selectedPlan}
                onSave={savePlanConfig}
                onTest={testConfiguration}
                isSaving={isSaving}
              />
            )}
          </div>
        </TabsContent>

        {/* Tab de Monitoramento de Créditos */}
        <TabsContent value="credit-monitoring" className="space-y-4">
          <CreditMonitoringDashboard 
            alerts={creditAlerts}
            servers={servers}
            onResolveAlert={resolveAlert}
            onRefresh={loadData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// COMPONENTE DE CONFIGURAÇÃO DE SERVIDOR
// ============================================

interface ServerConfigFormProps {
  server: ServerConfig;
  onSave: (serverId: string, config: Partial<ServerConfig>) => void;
  onTest: (type: 'server', id: string) => void;
  isSaving: boolean;
}

function ServerConfigForm({ server, onSave, onTest, isSaving }: ServerConfigFormProps) {
  const [config, setConfig] = useState({
    period_calculation_type: server.period_calculation_type || 'monthly',
    period_calculation_config: server.period_calculation_config || {},
    credit_monitoring_enabled: server.credit_monitoring_enabled || false,
    credit_warning_threshold: server.credit_warning_threshold || 100,
    credit_critical_threshold: server.credit_critical_threshold || 50,
    credit_notification_enabled: server.credit_notification_enabled || false
  });

  const handleSave = () => {
    onSave(server.id, config);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurar: {server.name}
        </CardTitle>
        <CardDescription>
          Configure o tipo de cálculo de período e monitoramento de créditos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipo de Cálculo de Período */}
        <div className="space-y-2">
          <Label>Tipo de Cálculo de Período</Label>
          <Select 
            value={config.period_calculation_type || 'monthly'}
            onValueChange={(value) => setConfig({
              ...config, 
              period_calculation_type: value as 'monthly' | 'custom'
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal (Padrão)</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Configuração Personalizada */}
        {config.period_calculation_type === 'custom' && (
          <div className="space-y-2">
            <Label>Configuração Personalizada (JSON)</Label>
            <Textarea 
              value={JSON.stringify(config.period_calculation_config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setConfig({ ...config, period_calculation_config: parsed });
                } catch {
                  // Ignorar erros de parsing durante a digitação
                }
              }}
              placeholder='{"interval": "weekly", "day": 1}'
              rows={4}
            />
          </div>
        )}

        {/* Monitoramento de Créditos */}
        <div className="space-y-4 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label>Monitoramento de Créditos</Label>
            <Switch 
              checked={config.credit_monitoring_enabled}
              onCheckedChange={(checked) => setConfig({
                ...config, 
                credit_monitoring_enabled: checked
              })}
            />
          </div>

          {config.credit_monitoring_enabled && (
            <div className="space-y-3 pl-4 border-l-2 border-blue-200">
              <div className="space-y-2">
                <Label>Limite de Aviso</Label>
                <Input 
                  type="number"
                  value={config.credit_warning_threshold}
                  onChange={(e) => setConfig({
                    ...config, 
                    credit_warning_threshold: parseInt(e.target.value) || 0
                  })}
                  placeholder="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Limite Crítico</Label>
                <Input 
                  type="number"
                  value={config.credit_critical_threshold}
                  onChange={(e) => setConfig({
                    ...config, 
                    credit_critical_threshold: parseInt(e.target.value) || 0
                  })}
                  placeholder="50"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Notificações Ativas</Label>
                <Switch 
                  checked={config.credit_notification_enabled}
                  onCheckedChange={(checked) => setConfig({
                    ...config, 
                    credit_notification_enabled: checked
                  })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => onTest('server', server.id)}
            disabled={isSaving}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Testar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE DE CONFIGURAÇÃO DE PLANO
// ============================================

interface PlanConfigFormProps {
  plan: PlanConfig;
  onSave: (planId: string, config: Partial<PlanConfig>) => void;
  onTest: (type: 'plan', id: string) => void;
  isSaving: boolean;
}

function PlanConfigForm({ plan, onSave, onTest, isSaving }: PlanConfigFormProps) {
  const [config, setConfig] = useState({
    period_calculation_override: plan.period_calculation_override || null,
    period_calculation_config: plan.period_calculation_config || {}
  });

  const handleSave = () => {
    onSave(plan.id, config);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Configurar: {plan.name}
        </CardTitle>
        <CardDescription>
          Configure sobrescrita de período para este plano
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sobrescrita de Período */}
        <div className="space-y-2">
          <Label>Sobrescrita de Período</Label>
          <Select 
            value={config.period_calculation_override || 'none'}
            onValueChange={(value) => setConfig({
              ...config, 
              period_calculation_override: value === 'none' ? null : value as 'monthly' | 'custom'
            })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Usar configuração do servidor</SelectItem>
              <SelectItem value="monthly">Mensal (Sobrescrever)</SelectItem>
              <SelectItem value="custom">Personalizado (Sobrescrever)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Configuração Personalizada */}
        {config.period_calculation_override === 'custom' && (
          <div className="space-y-2">
            <Label>Configuração Personalizada (JSON)</Label>
            <Textarea 
              value={JSON.stringify(config.period_calculation_config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setConfig({ ...config, period_calculation_config: parsed });
                } catch {
                  // Ignorar erros de parsing durante a digitação
                }
              }}
              placeholder='{"interval": "weekly", "day": 1}'
              rows={4}
            />
          </div>
        )}

        {/* Informações do Plano */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-muted-foreground">
            <div>Servidores associados: {plan.servers_count || 0}</div>
            <div className="mt-1">
              {config.period_calculation_override 
                ? 'Este plano sobrescreverá a configuração dos servidores'
                : 'Este plano usará a configuração individual de cada servidor'
              }
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex gap-2 pt-4">
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button 
            variant="outline"
            onClick={() => onTest('plan', plan.id)}
            disabled={isSaving}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Testar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE DE MONITORAMENTO DE CRÉDITOS
// ============================================

interface CreditMonitoringDashboardProps {
  alerts: CreditAlert[];
  servers: ServerConfig[];
  onResolveAlert: (alertId: string) => void;
  onRefresh: () => void;
}

function CreditMonitoringDashboard({ 
  alerts, 
  servers, 
  onResolveAlert, 
  onRefresh 
}: CreditMonitoringDashboardProps) {
  const activeAlerts = alerts.filter(a => !a.resolved);
  const resolvedAlerts = alerts.filter(a => a.resolved);
  const serversWithMonitoring = servers.filter(s => s.credit_monitoring_enabled);

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{serversWithMonitoring.length}</div>
                <div className="text-sm text-muted-foreground">Servidores Monitorados</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold">{activeAlerts.length}</div>
                <div className="text-sm text-muted-foreground">Alertas Ativos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold">{resolvedAlerts.length}</div>
                <div className="text-sm text-muted-foreground">Alertas Resolvidos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">
                  {servers.reduce((sum, s) => sum + (s.current_credits || 0), 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total de Créditos</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Ativos */}
      {activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alertas Ativos ({activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeAlerts.map(alert => (
              <div 
                key={alert.id}
                className={`p-4 border rounded-lg ${
                  alert.alert_type === 'critical' 
                    ? 'border-red-200 bg-red-50' 
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{alert.server_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {alert.alert_type === 'critical' ? 'Crítico' : 'Aviso'}: 
                      {alert.current_credits} créditos (limite: {alert.threshold})
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onResolveAlert(alert.id)}
                  >
                    Resolver
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Status dos Servidores */}
      <Card>
        <CardHeader>
          <CardTitle>Status dos Servidores</CardTitle>
          <CardDescription>
            Visão geral dos créditos por servidor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {serversWithMonitoring.map(server => {
              const warningPercent = server.current_credits && server.credit_warning_threshold 
                ? (server.current_credits / server.credit_warning_threshold) * 100 
                : 100;
              
              return (
                <div key={server.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium">{server.name}</div>
                      <div className="text-sm text-muted-foreground">{server.type}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{server.current_credits || 0} créditos</div>
                      <Badge 
                        variant={server.status === 'active' ? 'default' : 
                               server.status === 'warning' ? 'secondary' : 'destructive'}
                      >
                        {server.status === 'active' ? 'Normal' :
                         server.status === 'warning' ? 'Aviso' : 'Crítico'}
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={Math.max(0, Math.min(100, warningPercent))} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Crítico: {server.credit_critical_threshold}</span>
                    <span>Aviso: {server.credit_warning_threshold}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}