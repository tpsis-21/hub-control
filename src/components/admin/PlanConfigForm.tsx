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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, TestTube, Plus, Trash2, AlertTriangle, CheckCircle, DollarSign } from 'lucide-react';
import { 
  validatePlanConfig, 
  validatePlanBusinessRules, 
  validateCompleteConfig,
  planConfigSchema,
  type PlanConfig 
} from '@/lib/validations/period-config';

// Configuração padrão do plano
const defaultPlanConfig: PlanConfig = {
  plan_name: '',
  plan_type: 'basic',
  description: '',
  status: 'active',
  period_calculation_config: {
    calculation_type: 'fixed',
    billing_cycle: 'monthly',
    trial_period_days: 0,
    grace_period_days: 3
  },
  pricing: {
    base_price: 0,
    setup_fee: 0,
    currency: 'BRL',
    discount_percentage: 0,
    promotional_price: 0
  },
  features: {
    max_servers: 1,
    max_users: 1,
    storage_gb: 1,
    bandwidth_gb: 10,
    backup_retention_days: 7,
    support_level: 'basic',
    api_calls_per_month: 1000
  },
  limits: {
    max_concurrent_connections: 10,
    max_file_size_mb: 100,
    rate_limit_per_minute: 60,
    custom_domain_allowed: false,
    ssl_certificate_included: false,
    priority_support: false
  },
  notification_settings: {
    billing_notifications: true,
    usage_notifications: true,
    maintenance_notifications: true,
    security_notifications: true
  }
};

interface PlanConfigFormProps {
  planId?: string;
  onSave?: (config: PlanConfig) => void;
  onCancel?: () => void;
}



export function PlanConfigForm({ planId, onSave, onCancel }: PlanConfigFormProps) {
  const [config, setConfig] = useState<PlanConfig>(defaultPlanConfig);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  // Estado newCustomFeature removido - não existe no schema
  const { toast } = useToast();

  // Carregar configuração existente se planId for fornecido
  useEffect(() => {
    if (planId) {
      loadPlanConfig(planId);
    }
  }, [planId]);

  const loadPlanConfig = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/period-config?type=plan&id=${id}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar configuração do plano');
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
      planConfigSchema, 
      validatePlanBusinessRules
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
      const method = planId ? 'PUT' : 'POST';
      const url = '/api/admin/period-config';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'plan',
          config: planId ? { ...config, id: planId } : config
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configuração');
      }

      const data = await response.json();
      
      toast({
        title: 'Sucesso',
        description: planId ? 'Configuração atualizada com sucesso' : 'Configuração criada com sucesso'
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

  // Funções de array removidas - não são mais necessárias

  if (loading && planId) {
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
            {planId ? 'Editar Configuração de Plano' : 'Nova Configuração de Plano'}
            <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
              {config.status}
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure os parâmetros de período, preços e recursos para planos de assinatura
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
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="pricing">Preços</TabsTrigger>
              <TabsTrigger value="features">Recursos</TabsTrigger>
              <TabsTrigger value="limits">Limites</TabsTrigger>
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="test">Teste</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Plano *</Label>
                  <Input
                    id="name"
                    value={config.plan_name}
                    onChange={(e) => updateConfig('plan_name', e.target.value)}
                    placeholder="Ex: Plano Premium"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plan_type">Tipo de Plano</Label>
                  <Select value={config.plan_type} onValueChange={(value: 'basic' | 'premium' | 'enterprise' | 'custom') => updateConfig('plan_type', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                      <SelectItem value="custom">Personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trial_period">Período de Teste (dias)</Label>
                  <Input
                    id="trial_period"
                    type="number"
                    value={config.period_calculation_config.trial_period_days}
                    onChange={(e) => updateConfig('period_calculation_config.trial_period_days', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="calculation_type">Tipo de Cálculo</Label>
                  <Select 
                    value={config.period_calculation_config.calculation_type} 
                    onValueChange={(value: 'fixed' | 'usage_based' | 'hybrid') => updateConfig('period_calculation_config.calculation_type', value)}
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

                <div className="space-y-2">
                  <Label htmlFor="grace_period">Período de Carência (dias)</Label>
                  <Input
                    id="grace_period"
                    type="number"
                    value={config.period_calculation_config.grace_period_days}
                    onChange={(e) => updateConfig('period_calculation_config.grace_period_days', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={config.status} onValueChange={(value: 'active' | 'inactive' | 'deprecated') => updateConfig('status', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="inactive">Inativo</SelectItem>
                      <SelectItem value="deprecated">Descontinuado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>


            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price">Preço Base *</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 text-sm text-gray-900 bg-gray-200 border border-r-0 border-gray-300 rounded-l-md">
                      <DollarSign className="h-4 w-4" />
                    </span>
                    <Input
                      id="base_price"
                      type="number"
                      step="0.01"
                      value={config.pricing.base_price}
                      onChange={(e) => updateConfig('pricing.base_price', parseFloat(e.target.value) || 0)}
                      className={`rounded-l-none ${errors.base_price ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {errors.base_price && (
                    <p className="text-sm text-red-500">{errors.base_price}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moeda</Label>
                  <Select value={config.pricing.currency} onValueChange={(value) => updateConfig('pricing.currency', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">Real (BRL)</SelectItem>
                      <SelectItem value="USD">Dólar (USD)</SelectItem>
                      <SelectItem value="EUR">Euro (EUR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="billing_cycle">Ciclo de Cobrança</Label>
                  <Select 
                    value={config.period_calculation_config.billing_cycle} 
                    onValueChange={(value: 'monthly' | 'quarterly' | 'annual') => updateConfig('period_calculation_config.billing_cycle', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                      <SelectItem value="annual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="setup_fee">Taxa de Configuração</Label>
                  <Input
                    id="setup_fee"
                    type="number"
                    step="0.01"
                    value={config.pricing.setup_fee}
                    onChange={(e) => updateConfig('pricing.setup_fee', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount_percentage">Desconto (%)</Label>
                  <Input
                    id="discount_percentage"
                    type="number"
                    min="0"
                    max="100"
                    value={config.pricing.discount_percentage}
                    onChange={(e) => updateConfig('pricing.discount_percentage', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="promotional_price">Preço Promocional</Label>
                  <Input
                    id="promotional_price"
                    type="number"
                    step="0.01"
                    value={config.pricing.promotional_price}
                    onChange={(e) => updateConfig('pricing.promotional_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_users">Máximo de Usuários *</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={config.features.max_users}
                    onChange={(e) => updateConfig('features.max_users', parseInt(e.target.value) || 0)}
                    className={errors.max_users ? 'border-red-500' : ''}
                  />
                  {errors.max_users && (
                    <p className="text-sm text-red-500">{errors.max_users}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_servers">Máximo de Servidores *</Label>
                  <Input
                    id="max_servers"
                    type="number"
                    value={config.features.max_servers}
                    onChange={(e) => updateConfig('features.max_servers', parseInt(e.target.value) || 0)}
                    className={errors.max_servers ? 'border-red-500' : ''}
                  />
                  {errors.max_servers && (
                    <p className="text-sm text-red-500">{errors.max_servers}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="storage_gb">Armazenamento (GB)</Label>
                  <Input
                    id="storage_gb"
                    type="number"
                    value={config.features.storage_gb}
                    onChange={(e) => updateConfig('features.storage_gb', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bandwidth_gb">Largura de Banda (GB)</Label>
                  <Input
                    id="bandwidth_gb"
                    type="number"
                    value={config.features.bandwidth_gb}
                    onChange={(e) => updateConfig('features.bandwidth_gb', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="support_level">Nível de Suporte</Label>
                  <Select 
                    value={config.features.support_level} 
                    onValueChange={(value: 'basic' | 'priority' | '24x7') => updateConfig('features.support_level', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Básico</SelectItem>
                      <SelectItem value="priority">Prioritário</SelectItem>
                      <SelectItem value="24x7">24x7</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seção de recursos personalizados removida - não existe no schema */}
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_concurrent_connections">Conexões Simultâneas Máximas</Label>
                  <Input
                    id="max_concurrent_connections"
                    type="number"
                    value={config.limits.max_concurrent_connections}
                    onChange={(e) => updateConfig('limits.max_concurrent_connections', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_file_size_mb">Tamanho Máximo de Arquivo (MB)</Label>
                  <Input
                    id="max_file_size_mb"
                    type="number"
                    value={config.limits.max_file_size_mb}
                    onChange={(e) => updateConfig('limits.max_file_size_mb', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rate_limit_per_minute">Limite de Taxa por Minuto</Label>
                  <Input
                    id="rate_limit_per_minute"
                    type="number"
                    value={config.limits.rate_limit_per_minute}
                    onChange={(e) => updateConfig('limits.rate_limit_per_minute', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="custom_domain_allowed"
                    checked={config.limits.custom_domain_allowed}
                    onCheckedChange={(checked) => updateConfig('limits.custom_domain_allowed', checked)}
                  />
                  <Label htmlFor="custom_domain_allowed">Domínio Personalizado Permitido</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="ssl_certificate_included"
                    checked={config.limits.ssl_certificate_included}
                    onCheckedChange={(checked) => updateConfig('limits.ssl_certificate_included', checked)}
                  />
                  <Label htmlFor="ssl_certificate_included">Certificado SSL Incluído</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="priority_support"
                    checked={config.limits.priority_support}
                    onCheckedChange={(checked) => updateConfig('limits.priority_support', checked)}
                  />
                  <Label htmlFor="priority_support">Suporte Prioritário</Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="billing_notifications"
                    checked={config.notification_settings.billing_notifications}
                    onCheckedChange={(checked) => updateConfig('notification_settings.billing_notifications', checked)}
                  />
                  <Label htmlFor="billing_notifications">Notificações de Cobrança</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="usage_notifications"
                    checked={config.notification_settings.usage_notifications}
                    onCheckedChange={(checked) => updateConfig('notification_settings.usage_notifications', checked)}
                  />
                  <Label htmlFor="usage_notifications">Notificações de Uso</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="maintenance_notifications"
                    checked={config.notification_settings.maintenance_notifications}
                    onCheckedChange={(checked) => updateConfig('notification_settings.maintenance_notifications', checked)}
                  />
                  <Label htmlFor="maintenance_notifications">Notificações de Manutenção</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="security_notifications"
                    checked={config.notification_settings.security_notifications}
                    onCheckedChange={(checked) => updateConfig('notification_settings.security_notifications', checked)}
                  />
                  <Label htmlFor="security_notifications">Notificações de Segurança</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="webhook_url">URL do Webhook (opcional)</Label>
                  <Input
                    id="webhook_url"
                    type="url"
                    value={config.notification_settings.webhook_url || ''}
                    onChange={(e) => updateConfig('notification_settings.webhook_url', e.target.value || undefined)}
                    placeholder="https://exemplo.com/webhook"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notification_email">Email de Notificação (opcional)</Label>
                  <Input
                    id="notification_email"
                    type="email"
                    value={config.notification_settings.notification_email || ''}
                    onChange={(e) => updateConfig('notification_settings.notification_email', e.target.value || undefined)}
                    placeholder="admin@exemplo.com"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    O teste validará a configuração e simulará o cálculo de período e preços sem afetar dados reais.
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
              {planId ? 'Atualizar' : 'Criar'} Configuração
            </>
          )}
        </Button>
      </div>
    </div>
  );
}