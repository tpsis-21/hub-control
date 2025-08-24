/**
 * ⚙️ Configuração de Analytics - Hub Control
 * 
 * Componente para configuração e administração
 * do sistema de analytics, incluindo configurações
 * de coleta, privacidade e integrações.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../ui/use-toast';
import { analyticsApi } from '../../services/analyticsApi';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import {
  Settings,
  Shield,
  Database,
  Bell,
  ExternalLink,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';

// ============================================================================
// 📊 COMPONENTE PRINCIPAL
// ============================================================================

const AnalyticsConfig = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [status, setStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('general');

  // ============================================================================
  // 🔄 CARREGAMENTO DE DADOS
  // ============================================================================

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [configData, statusData] = await Promise.all([
        analyticsApi.getConfig(),
        analyticsApi.getStatus()
      ]);
      setConfig(configData);
      setStatus(statusData);
    } catch (error) {
      logger.error('Erro ao carregar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    try {
      setSaving(true);
      await analyticsApi.updateConfig(config);
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso.',
        variant: 'default'
      });
      await loadConfig(); // Recarregar para obter status atualizado
    } catch (error) {
      logger.error('Erro ao salvar configuração:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (service) => {
    try {
      await analyticsApi.testIntegration(service);
      toast({
        title: 'Sucesso',
        description: `Conexão com ${service} testada com sucesso.`,
        variant: 'default'
      });
    } catch (error) {
      logger.error(`Erro ao testar ${service}:`, error);
      toast({
        title: 'Erro',
        description: `Falha na conexão com ${service}.`,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Verificar permissões
  if (!user || !['admin', 'manager'].includes(user.role)) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Você não tem permissão para acessar as configurações de analytics.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configurações de Analytics</h1>
          <p className="text-muted-foreground">
            Configure coleta de dados, privacidade e integrações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadConfig}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Recarregar
          </Button>
          <Button
            onClick={saveConfig}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Status do Sistema */}
      <StatusCard status={status} />

      {/* Configurações */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacidade
          </TabsTrigger>
          <TabsTrigger value="storage">
            <Database className="h-4 w-4 mr-2" />
            Armazenamento
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <ExternalLink className="h-4 w-4 mr-2" />
            Integrações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacyConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="storage">
          <StorageConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsConfig config={config} setConfig={setConfig} />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsConfig 
            config={config} 
            setConfig={setConfig}
            onTestConnection={testConnection}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ============================================================================
// 📊 COMPONENTE DE STATUS
// ============================================================================

const StatusCard = ({ status }) => {
  if (!status) return null;

  const getStatusColor = (isHealthy) => {
    return isHealthy ? 'text-green-600' : 'text-red-600';
  };

  const getStatusIcon = (isHealthy) => {
    return isHealthy ? CheckCircle : AlertTriangle;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Status do Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`flex items-center justify-center mb-2 ${getStatusColor(status.database)}`}>
              {React.createElement(getStatusIcon(status.database), { className: 'h-6 w-6' })}
            </div>
            <p className="text-sm font-medium">Banco de Dados</p>
            <p className="text-xs text-muted-foreground">
              {status.database ? 'Conectado' : 'Desconectado'}
            </p>
          </div>
          
          <div className="text-center">
            <div className={`flex items-center justify-center mb-2 ${getStatusColor(status.queue)}`}>
              {React.createElement(getStatusIcon(status.queue), { className: 'h-6 w-6' })}
            </div>
            <p className="text-sm font-medium">Fila de Eventos</p>
            <p className="text-xs text-muted-foreground">
              {status.queueSize || 0} eventos
            </p>
          </div>
          
          <div className="text-center">
            <div className={`flex items-center justify-center mb-2 ${getStatusColor(status.integrations?.googleAnalytics)}`}>
              {React.createElement(getStatusIcon(status.integrations?.googleAnalytics), { className: 'h-6 w-6' })}
            </div>
            <p className="text-sm font-medium">Google Analytics</p>
            <p className="text-xs text-muted-foreground">
              {status.integrations?.googleAnalytics ? 'Ativo' : 'Inativo'}
            </p>
          </div>
          
          <div className="text-center">
            <div className={`flex items-center justify-center mb-2 ${getStatusColor(status.integrations?.mixpanel)}`}>
              {React.createElement(getStatusIcon(status.integrations?.mixpanel), { className: 'h-6 w-6' })}
            </div>
            <p className="text-sm font-medium">Mixpanel</p>
            <p className="text-xs text-muted-foreground">
              {status.integrations?.mixpanel ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// ⚙️ CONFIGURAÇÕES GERAIS
// ============================================================================

const GeneralConfig = ({ config, setConfig }) => {
  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Básicas</CardTitle>
          <CardDescription>
            Configure as opções fundamentais do sistema de analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enabled">Analytics Habilitado</Label>
              <p className="text-sm text-muted-foreground">
                Ativar ou desativar todo o sistema de analytics
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(value) => updateConfig('enabled', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment">Ambiente</Label>
            <Select
              value={config.environment}
              onValueChange={(value) => updateConfig('environment', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="development">Desenvolvimento</SelectItem>
                <SelectItem value="staging">Homologação</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sampleRate">Taxa de Amostragem (%)</Label>
            <Input
              id="sampleRate"
              type="number"
              min="1"
              max="100"
              value={config.sampleRate}
              onChange={(e) => updateConfig('sampleRate', parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Porcentagem de eventos que serão coletados (1-100%)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="batchSize">Tamanho do Lote</Label>
            <Input
              id="batchSize"
              type="number"
              min="1"
              max="1000"
              value={config.batchSize}
              onChange={(e) => updateConfig('batchSize', parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Número de eventos processados por lote
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos Rastreados</CardTitle>
          <CardDescription>
            Configure quais tipos de eventos devem ser coletados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(config.events || {}).map(([eventType, enabled]) => (
            <div key={eventType} className="flex items-center justify-between">
              <div>
                <Label htmlFor={eventType}>
                  {eventType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </Label>
              </div>
              <Switch
                id={eventType}
                checked={enabled}
                onCheckedChange={(value) => updateConfig(`events.${eventType}`, value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// 🔒 CONFIGURAÇÕES DE PRIVACIDADE
// ============================================================================

const PrivacyConfig = ({ config, setConfig }) => {
  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Anonimização de Dados</CardTitle>
          <CardDescription>
            Configure como os dados pessoais são tratados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="anonymizeIp">Anonimizar IP</Label>
              <p className="text-sm text-muted-foreground">
                Remove os últimos octetos do endereço IP
              </p>
            </div>
            <Switch
              id="anonymizeIp"
              checked={config.privacy?.anonymizeIp}
              onCheckedChange={(value) => updateConfig('privacy.anonymizeIp', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="anonymizeUserAgent">Anonimizar User Agent</Label>
              <p className="text-sm text-muted-foreground">
                Remove informações específicas do navegador
              </p>
            </div>
            <Switch
              id="anonymizeUserAgent"
              checked={config.privacy?.anonymizeUserAgent}
              onCheckedChange={(value) => updateConfig('privacy.anonymizeUserAgent', value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hashUserIds">Hash de IDs de Usuário</Label>
              <p className="text-sm text-muted-foreground">
                Aplica hash nos IDs de usuário para proteção
              </p>
            </div>
            <Switch
              id="hashUserIds"
              checked={config.privacy?.hashUserIds}
              onCheckedChange={(value) => updateConfig('privacy.hashUserIds', value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consentimento e Compliance</CardTitle>
          <CardDescription>
            Configurações para LGPD, GDPR e outras regulamentações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="requireConsent">Exigir Consentimento</Label>
              <p className="text-sm text-muted-foreground">
                Usuários devem consentir antes da coleta
              </p>
            </div>
            <Switch
              id="requireConsent"
              checked={config.privacy?.requireConsent}
              onCheckedChange={(value) => updateConfig('privacy.requireConsent', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dataRetentionDays">Retenção de Dados (dias)</Label>
            <Input
              id="dataRetentionDays"
              type="number"
              min="1"
              max="2555" // ~7 anos
              value={config.privacy?.dataRetentionDays}
              onChange={(e) => updateConfig('privacy.dataRetentionDays', parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Dados serão automaticamente removidos após este período
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="privacyPolicyUrl">URL da Política de Privacidade</Label>
            <Input
              id="privacyPolicyUrl"
              type="url"
              value={config.privacy?.privacyPolicyUrl || ''}
              onChange={(e) => updateConfig('privacy.privacyPolicyUrl', e.target.value)}
              placeholder="https://exemplo.com/privacidade"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// 💾 CONFIGURAÇÕES DE ARMAZENAMENTO
// ============================================================================

const StorageConfig = ({ config, setConfig }) => {
  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Banco de Dados</CardTitle>
          <CardDescription>
            Configure como os dados são armazenados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxEventAge">Idade Máxima de Eventos (dias)</Label>
            <Input
              id="maxEventAge"
              type="number"
              min="1"
              max="365"
              value={config.storage?.maxEventAge}
              onChange={(e) => updateConfig('storage.maxEventAge', parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Eventos mais antigos serão arquivados
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="compressionLevel">Nível de Compressão</Label>
            <Select
              value={config.storage?.compressionLevel?.toString()}
              onValueChange={(value) => updateConfig('storage.compressionLevel', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Sem compressão</SelectItem>
                <SelectItem value="1">Baixa (rápida)</SelectItem>
                <SelectItem value="6">Média (balanceada)</SelectItem>
                <SelectItem value="9">Alta (lenta)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableArchiving">Arquivamento Automático</Label>
              <p className="text-sm text-muted-foreground">
                Mover dados antigos para armazenamento de longo prazo
              </p>
            </div>
            <Switch
              id="enableArchiving"
              checked={config.storage?.enableArchiving}
              onCheckedChange={(value) => updateConfig('storage.enableArchiving', value)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// 🔔 CONFIGURAÇÕES DE ALERTAS
// ============================================================================

const AlertsConfig = ({ config, setConfig }) => {
  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Alertas do Sistema</CardTitle>
          <CardDescription>
            Configure quando e como receber alertas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableAlerts">Alertas Habilitados</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações sobre problemas
              </p>
            </div>
            <Switch
              id="enableAlerts"
              checked={config.alerts?.enabled}
              onCheckedChange={(value) => updateConfig('alerts.enabled', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alertEmail">E-mail para Alertas</Label>
            <Input
              id="alertEmail"
              type="email"
              value={config.alerts?.email || ''}
              onChange={(e) => updateConfig('alerts.email', e.target.value)}
              placeholder="admin@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slackWebhook">Webhook do Slack</Label>
            <Input
              id="slackWebhook"
              type="url"
              value={config.alerts?.slackWebhook || ''}
              onChange={(e) => updateConfig('alerts.slackWebhook', e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="errorThreshold">Limite de Erros (por hora)</Label>
            <Input
              id="errorThreshold"
              type="number"
              min="1"
              max="1000"
              value={config.alerts?.errorThreshold}
              onChange={(e) => updateConfig('alerts.errorThreshold', parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">
              Enviar alerta quando exceder este número de erros
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// 🔗 CONFIGURAÇÕES DE INTEGRAÇÕES
// ============================================================================

const IntegrationsConfig = ({ config, setConfig, onTestConnection }) => {
  const updateConfig = (path, value) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return newConfig;
    });
  };

  return (
    <div className="space-y-6">
      {/* Google Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Google Analytics
            <Badge variant={config.integrations?.googleAnalytics?.enabled ? 'default' : 'secondary'}>
              {config.integrations?.googleAnalytics?.enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Integração com Google Analytics 4
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="gaEnabled">Habilitado</Label>
            <Switch
              id="gaEnabled"
              checked={config.integrations?.googleAnalytics?.enabled}
              onCheckedChange={(value) => updateConfig('integrations.googleAnalytics.enabled', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gaTrackingId">Tracking ID</Label>
            <Input
              id="gaTrackingId"
              value={config.integrations?.googleAnalytics?.trackingId || ''}
              onChange={(e) => updateConfig('integrations.googleAnalytics.trackingId', e.target.value)}
              placeholder="G-XXXXXXXXXX"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => onTestConnection('googleAnalytics')}
            disabled={!config.integrations?.googleAnalytics?.enabled}
          >
            Testar Conexão
          </Button>
        </CardContent>
      </Card>

      {/* Mixpanel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Mixpanel
            <Badge variant={config.integrations?.mixpanel?.enabled ? 'default' : 'secondary'}>
              {config.integrations?.mixpanel?.enabled ? 'Ativo' : 'Inativo'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Integração com Mixpanel para analytics avançado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="mixpanelEnabled">Habilitado</Label>
            <Switch
              id="mixpanelEnabled"
              checked={config.integrations?.mixpanel?.enabled}
              onCheckedChange={(value) => updateConfig('integrations.mixpanel.enabled', value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mixpanelToken">Project Token</Label>
            <Input
              id="mixpanelToken"
              type="password"
              value={config.integrations?.mixpanel?.token || ''}
              onChange={(e) => updateConfig('integrations.mixpanel.token', e.target.value)}
              placeholder="••••••••••••••••"
            />
          </div>

          <Button
            variant="outline"
            onClick={() => onTestConnection('mixpanel')}
            disabled={!config.integrations?.mixpanel?.enabled}
          >
            Testar Conexão
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsConfig;

/**
 * Exemplo de uso:
 * 
 * import AnalyticsConfig from './components/Analytics/AnalyticsConfig';
 * 
 * function AdminPanel() {
 *   return (
 *     <div>
 *       <h1>Painel Administrativo</h1>
 *       <AnalyticsConfig />
 *     </div>
 *   );
 * }
 */