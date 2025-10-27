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
  server_name: '',
  server_type: 'vps',
  location: '',
  status: 'active',
  period_calculation_type: 'fixed',
  period_duration_days: 30,
  grace_period_days: 7,
  auto_renewal: true,
  cpu_cores: 1,
  ram_gb: 1,
  storage_gb: 10,
  bandwidth_mbps: 100,
  base_price: 0,
  currency: 'BRL',
  notification_settings: {
    email_notifications: true,
    webhook_notifications: false,
    sms_notifications: false,
    notification_threshold_days: 7
  },
  advanced_settings: {
    backup_enabled: true,
    monitoring_enabled: true,
    ssl_enabled: false,
    firewall_enabled: true,
    custom_config: undefined
  }
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
                    id="server_name"
                    value={config.server_name}
                    onChange={(e) => updateConfig('server_name', e.target.value)}
                    placeholder="Ex: Servidor NATV Principal"
                    className={errors.server_name ? 'border-red-500' : ''}
                  />
                  {errors.server_name && (
                     <p className="text-sm text-red-500 mt-1">{errors.server_name}</p>
                   )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Servidor</Label>
                  <Select value={config.server_type} onValueChange={(value: 'vps' | 'dedicated' | 'cloud' | 'hybrid') => updateConfig('server_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vps">VPS</SelectItem>
                      <SelectItem value="dedicated">Dedicado</SelectItem>
                      <SelectItem value="cloud">Cloud</SelectItem>
                      <SelectItem value="hybrid">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="period_type">Tipo de Período</Label>
                  <Select 
                    value={config.period_calculation_type} 
                    onValueChange={(value: 'fixed' | 'usage_based' | 'hybrid') => updateConfig('period_calculation_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixo</SelectItem>
                      <SelectItem value="usage_based">Baseado em Uso</SelectItem>
                      <SelectItem value="hybrid">Híbrido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {config.period_calculation_type === 'hybrid' && (
                  <div className="space-y-2">
                    <Label htmlFor="period_duration_days">Duração do Período (dias) *</Label>
                    <Input
                      id="period_duration_days"
                      type="number"
                      value={config.period_duration_days || ''}
                      onChange={(e) => updateConfig('period_duration_days', parseInt(e.target.value) || 0)}
                      placeholder="Ex: 30"
                      className={errors.period_duration_days ? 'border-red-500' : ''}
                    />
                    {errors.period_duration_days && (
                      <p className="text-sm text-red-500">{errors.period_duration_days}</p>
                    )}
                  </div>
                )}

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
                    id="email_notifications"
                    checked={config.notification_settings.email_notifications}
                    onCheckedChange={(checked) => updateConfig('notification_settings.email_notifications', checked)}
                  />
                  <Label htmlFor="email_notifications">Notificações por Email</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="webhook_notifications"
                    checked={config.notification_settings.webhook_notifications}
                    onCheckedChange={(checked) => updateConfig('notification_settings.webhook_notifications', checked)}
                  />
                  <Label htmlFor="webhook_notifications">Notificações por Webhook</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="sms_notifications"
                    checked={config.notification_settings.sms_notifications}
                    onCheckedChange={(checked) => updateConfig('notification_settings.sms_notifications', checked)}
                  />
                  <Label htmlFor="sms_notifications">Notificações por SMS</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification_threshold_days">Limite de Notificação (dias) *</Label>
                  <Input
                    id="notification_threshold_days"
                    type="number"
                    min="1"
                    max="30"
                    value={config.notification_settings.notification_threshold_days}
                    onChange={(e) => updateConfig('notification_settings.notification_threshold_days', parseInt(e.target.value) || 1)}
                    placeholder="Ex: 7"
                    className={errors.notification_threshold_days ? 'border-red-500' : ''}
                  />
                  {errors.notification_threshold_days && (
                    <p className="text-sm text-red-500">{errors.notification_threshold_days}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Dias antes do vencimento para disparar notificações
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="backup_enabled"
                    checked={config.advanced_settings.backup_enabled}
                    onCheckedChange={(checked) => updateConfig('advanced_settings.backup_enabled', checked)}
                  />
                  <Label htmlFor="backup_enabled">Backup Habilitado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="monitoring_enabled"
                    checked={config.advanced_settings.monitoring_enabled}
                    onCheckedChange={(checked) => updateConfig('advanced_settings.monitoring_enabled', checked)}
                  />
                  <Label htmlFor="monitoring_enabled">Monitoramento Habilitado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ssl_enabled"
                    checked={config.advanced_settings.ssl_enabled}
                    onCheckedChange={(checked) => updateConfig('advanced_settings.ssl_enabled', checked)}
                  />
                  <Label htmlFor="ssl_enabled">SSL Habilitado</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="firewall_enabled"
                    checked={config.advanced_settings.firewall_enabled}
                    onCheckedChange={(checked) => updateConfig('advanced_settings.firewall_enabled', checked)}
                  />
                  <Label htmlFor="firewall_enabled">Firewall Habilitado</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="custom_config">Configuração Customizada</Label>
                  <textarea
                    id="custom_config"
                    value={config.advanced_settings.custom_config || ''}
                    onChange={(e) => updateConfig('advanced_settings.custom_config', e.target.value)}
                    placeholder="Configurações customizadas opcionais..."
                    className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={1000}
                  />
                  <p className="text-sm text-gray-500">
                    Máximo 1000 caracteres
                  </p>
                </div>
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
