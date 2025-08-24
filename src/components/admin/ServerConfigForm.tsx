'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, TestTube, Plus, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';
import { 
  validateServerConfig, 
  validateServerBusinessRules, 
  validateCompleteConfig,
  serverConfigSchema,
  type ServerConfig 
} from '@/lib/validations/period-config';

// Configuração padrão do servidor
const defaultServerConfig: ServerConfig = {
  id: undefined,
  name: '',
  type: 'natv',
  period_calculation_type: 'monthly',
  custom_period_days: undefined,
  credit_threshold: 100,
  auto_renewal: true,
  notification_settings: {
    low_credit_alert: true,
    renewal_reminder: true,
    failure_notification: true,
    alert_threshold_percentage: 20
  },
  advanced_settings: {
    grace_period_days: 7,
    max_retry_attempts: 3,
    retry_interval_hours: 24,
    backup_enabled: true
  },
  status: 'active',
  created_at: undefined,
  updated_at: undefined
};

interface ServerConfigFormProps {
  serverId?: string;
  onSave?: (config: ServerConfig) => void;
  onCancel?: () => void;
}



export function ServerConfigForm({ serverId, onSave, onCancel }: ServerConfigFormProps) {
  const [config, setConfig] = useState<ServerConfig>(defaultServerConfig);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Carregar configuração existente se serverId for fornecido
  useEffect(() => {
    if (serverId) {
      loadServerConfig(serverId);
    }
  }, [serverId]);

  const loadServerConfig = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/period-config?type=server&id=${id}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar configuração do servidor');
      }
      const data = await response.json();
      setConfig(data.config);
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateConfig = (): boolean => {
    // Validação usando Zod schema
    const schemaValidation = validateCompleteConfig(
      config, 
      serverConfigSchema, 
      validateServerBusinessRules
    );
    
    if (!schemaValidation.success) {
      setValidationErrors(schemaValidation.errors);
      toast({
        title: 'Erro de validação',
        description: `${schemaValidation.errors.length} erro(s) encontrado(s)`,
        variant: 'destructive'
      });
      return false;
    }
    
    setValidationErrors([]);
    return true;
  };

  const handleSave = async () => {
    if (!validateConfig()) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, corrija os erros antes de salvar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const method = serverId ? 'PUT' : 'POST';
      const url = '/api/admin/period-config';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'server',
          config: serverId ? { ...config, id: serverId } : config
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configuração');
      }

      const data = await response.json();
      
      toast({
        title: 'Sucesso',
        description: serverId ? 'Configuração atualizada com sucesso' : 'Configuração criada com sucesso'
      });

      if (onSave) {
        onSave(data.config);
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!validateConfig()) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, corrija os erros antes de testar',
        variant: 'destructive'
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/period-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'test',
          config
        })
      });

      const data = await response.json();
      
      setTestResult({
        success: response.ok,
        message: data.message || (response.ok ? 'Teste realizado com sucesso' : 'Erro no teste')
      });

      if (response.ok) {
        toast({
          title: 'Teste bem-sucedido',
          description: data.message
        });
      } else {
        toast({
          title: 'Erro no teste',
          description: data.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message
      });
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current: any = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
    
    // Limpar erro do campo se existir
    if (errors[path]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[path];
        return newErrors;
      });
    }
  };

  if (loading && serverId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando configuração...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {serverId ? 'Editar Configuração de Servidor' : 'Nova Configuração de Servidor'}
            <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
              {config.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure os parâmetros de cálculo de período e renovação para servidores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Alertas de validação */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive" className="mb-4">
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
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="advanced">Avançado</TabsTrigger>
              <TabsTrigger value="test">Teste</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Servidor *</Label>
                  <Input
                    id="name"
                    value={config.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
                    placeholder="Ex: Servidor NATV Principal"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Servidor</Label>
                  <Select value={config.type} onValueChange={(value: 'natv' | 'thebest') => updateConfig('type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="natv">NATV</SelectItem>
                      <SelectItem value="thebest">The Best</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period_type">Tipo de Período</Label>
                  <Select 
                    value={config.period_calculation_type} 
                    onValueChange={(value: 'monthly' | 'quarterly' | 'annual' | 'custom') => updateConfig('period_calculation_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.period_calculation_type === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="custom_days">Período Personalizado (dias) *</Label>
                    <Input
                      id="custom_days"
                      type="number"
                      value={config.custom_period_days || ''}
                      onChange={(e) => updateConfig('custom_period_days', parseInt(e.target.value) || 0)}
                      placeholder="Ex: 30"
                      className={errors.custom_period_days ? 'border-red-500' : ''}
                    />
                    {errors.custom_period_days && (
                      <p className="text-sm text-red-500">{errors.custom_period_days}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="credit_threshold">Limite de Crédito *</Label>
                  <Input
                    id="credit_threshold"
                    type="number"
                    value={config.credit_threshold}
                    onChange={(e) => updateConfig('credit_threshold', parseInt(e.target.value) || 0)}
                    placeholder="Ex: 100"
                    className={errors.credit_threshold ? 'border-red-500' : ''}
                  />
                  {errors.credit_threshold && (
                    <p className="text-sm text-red-500">{errors.credit_threshold}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={config.status} onValueChange={(value: 'active' | 'inactive' | 'maintenance') => updateConfig('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_renewal"
                  checked={config.auto_renewal}
                  onCheckedChange={(checked) => updateConfig('auto_renewal', checked)}
                />
                <Label htmlFor="auto_renewal">Renovação Automática</Label>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="low_credit_alert"
                    checked={config.notification_settings.low_credit_alert}
                    onCheckedChange={(checked) => updateConfig('notification_settings.low_credit_alert', checked)}
                  />
                  <Label htmlFor="low_credit_alert">Alerta de Crédito Baixo</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="renewal_reminder"
                    checked={config.notification_settings.renewal_reminder}
                    onCheckedChange={(checked) => updateConfig('notification_settings.renewal_reminder', checked)}
                  />
                  <Label htmlFor="renewal_reminder">Lembrete de Renovação</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="failure_notification"
                    checked={config.notification_settings.failure_notification}
                    onCheckedChange={(checked) => updateConfig('notification_settings.failure_notification', checked)}
                  />
                  <Label htmlFor="failure_notification">Notificação de Falha</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alert_threshold">Limite de Alerta (%) *</Label>
                  <Input
                    id="alert_threshold"
                    type="number"
                    min="0"
                    max="100"
                    value={config.notification_settings.alert_threshold_percentage}
                    onChange={(e) => updateConfig('notification_settings.alert_threshold_percentage', parseInt(e.target.value) || 0)}
                    placeholder="Ex: 20"
                    className={errors.alert_threshold_percentage ? 'border-red-500' : ''}
                  />
                  {errors.alert_threshold_percentage && (
                    <p className="text-sm text-red-500">{errors.alert_threshold_percentage}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Porcentagem do limite de crédito para disparar alertas
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grace_period">Período de Carência (dias)</Label>
                  <Input
                    id="grace_period"
                    type="number"
                    min="0"
                    value={config.advanced_settings.grace_period_days}
                    onChange={(e) => updateConfig('advanced_settings.grace_period_days', parseInt(e.target.value) || 0)}
                    className={errors.grace_period_days ? 'border-red-500' : ''}
                  />
                  {errors.grace_period_days && (
                    <p className="text-sm text-red-500">{errors.grace_period_days}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_retries">Máximo de Tentativas</Label>
                  <Input
                    id="max_retries"
                    type="number"
                    min="1"
                    value={config.advanced_settings.max_retry_attempts}
                    onChange={(e) => updateConfig('advanced_settings.max_retry_attempts', parseInt(e.target.value) || 1)}
                    className={errors.max_retry_attempts ? 'border-red-500' : ''}
                  />
                  {errors.max_retry_attempts && (
                    <p className="text-sm text-red-500">{errors.max_retry_attempts}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retry_interval">Intervalo entre Tentativas (horas)</Label>
                  <Input
                    id="retry_interval"
                    type="number"
                    min="1"
                    value={config.advanced_settings.retry_interval_hours}
                    onChange={(e) => updateConfig('advanced_settings.retry_interval_hours', parseInt(e.target.value) || 1)}
                    className={errors.retry_interval_hours ? 'border-red-500' : ''}
                  />
                  {errors.retry_interval_hours && (
                    <p className="text-sm text-red-500">{errors.retry_interval_hours}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="backup_enabled"
                  checked={config.advanced_settings.backup_enabled}
                  onCheckedChange={(checked) => updateConfig('advanced_settings.backup_enabled', checked)}
                />
                <Label htmlFor="backup_enabled">Backup Habilitado</Label>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    O teste validará a configuração e simulará o cálculo de período sem afetar dados reais.
                  </AlertDescription>
                </Alert>

                <Button 
                  onClick={handleTest} 
                  disabled={testing}
                  variant="outline"
                  className="w-full"
                >
                  {testing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    <>
                      <TestTube className="mr-2 h-4 w-4" />
                      Executar Teste
                    </>
                  )}
                </Button>

                {testResult && (
                  <Alert variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {testResult.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {serverId ? 'Atualizar' : 'Criar'} Configuração
            </>
          )}
        </Button>
      </div>
    </div>
  );
}