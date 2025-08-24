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
  period_calculation_type: 'fixed',
  period_duration_days: 30,
  grace_period_days: 3,
  auto_renewal: true,
  pricing: {
    base_price: 0,
    currency: 'BRL',
    billing_cycle: 'monthly',
    discount_percentage: 0,
    promotional_price: 0,
    promotional_end_date: ''
  },
  features: {
    max_users: 1,
    storage_gb: 1,
    bandwidth_gb: 10,
    api_calls_per_month: 1000,
    support_level: 'basic',
    custom_features: []
  },
  limits: {
    max_projects: 1,
    max_integrations: 5,
    max_concurrent_sessions: 1,
    rate_limit_per_minute: 60
  },
  notification_settings: {
    usage_alerts: true,
    billing_notifications: true,
    feature_updates: false,
    maintenance_notices: true,
    threshold_percentage: 80
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
  const [newCustomFeature, setNewCustomFeature] = useState('');
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

  const addCustomFeature = () => {
    if (newCustomFeature.trim()) {
      updateConfig('features.custom_features', [...config.features.custom_features, newCustomFeature.trim()]);
      setNewCustomFeature('');
    }
  };

  const removeCustomFeature = (index: number) => {
    const newFeatures = config.features.custom_features.filter((_, i) => i !== index);
    updateConfig('features.custom_features', newFeatures);
  };

  const updateArrayValue = (path: string, index: number, value: number) => {
    const currentArray = path.split('.').reduce((obj, key) => obj[key], config) as number[];
    const newArray = [...currentArray];
    newArray[index] = value;
    updateConfig(path, newArray);
  };

  const addArrayValue = (path: string, value: number) => {
    const currentArray = path.split('.').reduce((obj, key) => obj[key], config) as number[];
    updateConfig(path, [...currentArray, value]);
  };

  const removeArrayValue = (path: string, index: number) => {
    const currentArray = path.split('.').reduce((obj, key) => obj[key], config) as number[];
    updateConfig(path, currentArray.filter((_, i) => i !== index));
  };

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
                    value={config.name}
                    onChange={(e) => updateConfig('name', e.target.value)}
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
                  <Label htmlFor="base_period">Período Base (dias) *</Label>
                  <Input
                    id="base_period"
                    type="number"
                    value={config.period_calculation_config.base_period_days}
                    onChange={(e) => updateConfig('period_calculation_config.base_period_days', parseInt(e.target.value) || 0)}
                    className={errors.base_period_days ? 'border-red-500' : ''}
                  />
                  {errors.base_period_days && (
                    <p className="text-sm text-red-500">{errors.base_period_days}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="renewal_type">Tipo de Renovação</Label>
                  <Select 
                    value={config.period_calculation_config.renewal_type} 
                    onValueChange={(value: 'automatic' | 'manual' | 'hybrid') => updateConfig('period_calculation_config.renewal_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automática</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="hybrid">Híbrida</SelectItem>
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

              <div className="space-y-2">
                <Label htmlFor="early_renewal_discount">Desconto Renovação Antecipada (%)</Label>
                <Input
                  id="early_renewal_discount"
                  type="number"
                  min="0"
                  max="100"
                  value={config.period_calculation_config.early_renewal_discount}
                  onChange={(e) => updateConfig('period_calculation_config.early_renewal_discount', parseInt(e.target.value) || 0)}
                />
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
                    value={config.pricing.billing_cycle} 
                    onValueChange={(value: 'monthly' | 'quarterly' | 'annual') => updateConfig('pricing.billing_cycle', value)}
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
                  <Label htmlFor="early_payment_discount">Desconto Pagamento Antecipado (%)</Label>
                  <Input
                    id="early_payment_discount"
                    type="number"
                    min="0"
                    max="100"
                    value={config.pricing.discount_rules.early_payment_discount}
                    onChange={(e) => updateConfig('pricing.discount_rules.early_payment_discount', parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="volume_discount"
                    checked={config.pricing.discount_rules.volume_discount}
                    onCheckedChange={(checked) => updateConfig('pricing.discount_rules.volume_discount', checked)}
                  />
                  <Label htmlFor="volume_discount">Desconto por Volume</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="loyalty_discount"
                    checked={config.pricing.discount_rules.loyalty_discount}
                    onCheckedChange={(checked) => updateConfig('pricing.discount_rules.loyalty_discount', checked)}
                  />
                  <Label htmlFor="loyalty_discount">Desconto por Fidelidade</Label>
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

              <div className="space-y-4">
                <Label>Recursos Personalizados</Label>
                <div className="flex space-x-2">
                  <Input
                    value={newCustomFeature}
                    onChange={(e) => setNewCustomFeature(e.target.value)}
                    placeholder="Adicionar recurso personalizado"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomFeature()}
                  />
                  <Button type="button" onClick={addCustomFeature} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.features.custom_features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {feature}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeCustomFeature(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="limits" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="api_calls">Chamadas API por Mês *</Label>
                  <Input
                    id="api_calls"
                    type="number"
                    value={config.limits.api_calls_per_month}
                    onChange={(e) => updateConfig('limits.api_calls_per_month', parseInt(e.target.value) || 0)}
                    className={errors.api_calls_per_month ? 'border-red-500' : ''}
                  />
                  {errors.api_calls_per_month && (
                    <p className="text-sm text-red-500">{errors.api_calls_per_month}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concurrent_connections">Conexões Simultâneas</Label>
                  <Input
                    id="concurrent_connections"
                    type="number"
                    value={config.limits.concurrent_connections}
                    onChange={(e) => updateConfig('limits.concurrent_connections', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="data_retention">Retenção de Dados (dias)</Label>
                  <Input
                    id="data_retention"
                    type="number"
                    value={config.limits.data_retention_days}
                    onChange={(e) => updateConfig('limits.data_retention_days', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backup_frequency">Frequência de Backup</Label>
                  <Select 
                    value={config.limits.backup_frequency} 
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') => updateConfig('limits.backup_frequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="admin_notifications"
                    checked={config.notification_settings.admin_notifications}
                    onCheckedChange={(checked) => updateConfig('notification_settings.admin_notifications', checked)}
                  />
                  <Label htmlFor="admin_notifications">Notificações para Administradores</Label>
                </div>

                <div className="space-y-2">
                  <Label>Lembretes de Renovação (dias antes)</Label>
                  <div className="flex flex-wrap gap-2">
                    {config.notification_settings.renewal_reminder_days.map((days, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Input
                          type="number"
                          value={days}
                          onChange={(e) => updateArrayValue('notification_settings.renewal_reminder_days', index, parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayValue('notification_settings.renewal_reminder_days', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayValue('notification_settings.renewal_reminder_days', 7)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Retry de Pagamento Falhado (dias)</Label>
                  <div className="flex flex-wrap gap-2">
                    {config.notification_settings.payment_failure_retry_days.map((days, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Input
                          type="number"
                          value={days}
                          onChange={(e) => updateArrayValue('notification_settings.payment_failure_retry_days', index, parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayValue('notification_settings.payment_failure_retry_days', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayValue('notification_settings.payment_failure_retry_days', 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alertas de Uso (% do limite)</Label>
                  <div className="flex flex-wrap gap-2">
                    {config.notification_settings.usage_alert_thresholds.map((threshold, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={threshold}
                          onChange={(e) => updateArrayValue('notification_settings.usage_alert_thresholds', index, parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                        <span className="text-sm">%</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeArrayValue('notification_settings.usage_alert_thresholds', index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addArrayValue('notification_settings.usage_alert_thresholds', 80)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
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