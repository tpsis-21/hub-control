/**
 * Configuração de Alertas do Sistema
 * 
 * Componente para configurar regras de alertas, canais de notificação
 * e gerenciar configurações de monitoramento do sistema.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Bell,
  Check,
  Clock,
  Edit,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Save,
  Settings,
  Trash2,
  X,
  Zap,
  Shield,
  Activity,
  Database,
  Server,
  Users,
  Globe,
  Cpu,
  HardDrive,
  Network,
  Eye,
  EyeOff
} from 'lucide-react';
import { useSystemAlerts } from '@/hooks/use-system-alerts';
import { useToast } from '@/hooks/use-toast';

// ============================================
// TIPOS E INTERFACES
// ============================================

interface AlertConfigurationProps {
  className?: string;
  userId?: string;
  userRole?: string;
}

interface AlertRuleForm {
  id?: string;
  name: string;
  description: string;
  source: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'contains';
  threshold: number | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  channels: string[];
  cooldown: number; // em minutos
  tags: string[];
}

interface AlertChannelForm {
  id?: string;
  name: string;
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams';
  enabled: boolean;
  config: Record<string, any>;
  testResult?: {
    success: boolean;
    message: string;
    timestamp: Date;
  };
}

interface MonitoringSettings {
  enabled: boolean;
  interval: number; // em segundos
  retentionDays: number;
  maxAlertsPerHour: number;
  enableAutoResolve: boolean;
  autoResolveTimeout: number; // em minutos
  enableEscalation: boolean;
  escalationTimeout: number; // em minutos
}

// ============================================
// CONSTANTES
// ============================================

const ALERT_SOURCES = [
  { value: 'system', label: 'Sistema', icon: Server },
  { value: 'performance', label: 'Performance', icon: Activity },
  { value: 'security', label: 'Segurança', icon: Shield },
  { value: 'database', label: 'Banco de Dados', icon: Database },
  { value: 'network', label: 'Rede', icon: Network },
  { value: 'users', label: 'Usuários', icon: Users },
  { value: 'application', label: 'Aplicação', icon: Globe }
];

const METRICS_BY_SOURCE = {
  system: [
    { value: 'cpu_usage', label: 'Uso de CPU (%)' },
    { value: 'memory_usage', label: 'Uso de Memória (%)' },
    { value: 'disk_usage', label: 'Uso de Disco (%)' },
    { value: 'uptime', label: 'Tempo de Atividade (%)' }
  ],
  performance: [
    { value: 'response_time', label: 'Tempo de Resposta (ms)' },
    { value: 'throughput', label: 'Requisições/min' },
    { value: 'error_rate', label: 'Taxa de Erro (%)' },
    { value: 'lcp', label: 'LCP (ms)' },
    { value: 'fid', label: 'FID (ms)' },
    { value: 'cls', label: 'CLS' }
  ],
  security: [
    { value: 'failed_logins', label: 'Tentativas de Login Falhadas' },
    { value: 'threats_detected', label: 'Ameaças Detectadas' },
    { value: 'vulnerabilities', label: 'Vulnerabilidades' },
    { value: 'security_score', label: 'Score de Segurança' }
  ],
  database: [
    { value: 'connection_count', label: 'Conexões Ativas' },
    { value: 'query_time', label: 'Tempo de Query (ms)' },
    { value: 'deadlocks', label: 'Deadlocks' },
    { value: 'table_size', label: 'Tamanho da Tabela (MB)' }
  ],
  network: [
    { value: 'bandwidth_usage', label: 'Uso de Banda (%)' },
    { value: 'packet_loss', label: 'Perda de Pacotes (%)' },
    { value: 'latency', label: 'Latência (ms)' },
    { value: 'connection_errors', label: 'Erros de Conexão' }
  ],
  users: [
    { value: 'active_users', label: 'Usuários Ativos' },
    { value: 'session_duration', label: 'Duração da Sessão (min)' },
    { value: 'concurrent_sessions', label: 'Sessões Simultâneas' },
    { value: 'user_errors', label: 'Erros de Usuário' }
  ],
  application: [
    { value: 'exceptions', label: 'Exceções' },
    { value: 'memory_leaks', label: 'Vazamentos de Memória' },
    { value: 'cache_hit_rate', label: 'Taxa de Cache Hit (%)' },
    { value: 'queue_size', label: 'Tamanho da Fila' }
  ]
};

const SEVERITY_COLORS = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200'
};

const CHANNEL_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS', icon: Phone },
  { value: 'webhook', label: 'Webhook', icon: Zap },
  { value: 'slack', label: 'Slack', icon: MessageSquare },
  { value: 'teams', label: 'Microsoft Teams', icon: MessageSquare }
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AlertConfiguration({
  className,
  userId,
  userRole = 'user'
}: AlertConfigurationProps) {
  const { toast } = useToast();
  
  const {
    rules,
    channels,
    createRule,
    updateRule,
    deleteRule,
    createChannel,
    updateChannel,
    deleteChannel,
    testChannel
  } = useSystemAlerts({ userId });
  
  // ============================================
  // ESTADO
  // ============================================
  
  const [activeTab, setActiveTab] = useState('rules');
  const [isCreatingRule, setIsCreatingRule] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRuleForm | null>(null);
  const [editingChannel, setEditingChannel] = useState<AlertChannelForm | null>(null);
  
  const [ruleForm, setRuleForm] = useState<AlertRuleForm>({
    name: '',
    description: '',
    source: '',
    metric: '',
    condition: 'gt',
    threshold: 0,
    severity: 'medium',
    enabled: true,
    channels: [],
    cooldown: 15,
    tags: []
  });
  
  const [channelForm, setChannelForm] = useState<AlertChannelForm>({
    name: '',
    type: 'email',
    enabled: true,
    config: {}
  });
  
  const [settings, setSettings] = useState<MonitoringSettings>({
    enabled: true,
    interval: 60,
    retentionDays: 30,
    maxAlertsPerHour: 100,
    enableAutoResolve: true,
    autoResolveTimeout: 60,
    enableEscalation: false,
    escalationTimeout: 30
  });
  
  const [testingChannels, setTestingChannels] = useState<Set<string>>(new Set());
  
  // ============================================
  // FUNÇÕES
  // ============================================
  
  const handleCreateRule = async () => {
    try {
      if (!ruleForm.name || !ruleForm.source || !ruleForm.metric) {
        toast({
          title: 'Campos Obrigatórios',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }
      
      await createRule({
        name: ruleForm.name,
        description: ruleForm.description,
        enabled: ruleForm.enabled,
        conditions: [{
          metric: ruleForm.metric,
          operator: ruleForm.condition,
          value: ruleForm.threshold
        }],
        actions: ruleForm.channels.map(channelId => ({
          type: 'send_email' as const,
          config: {
            channelId,
            template: `Alerta: ${ruleForm.name}`,
            severity: ruleForm.severity
          }
        })),
        cooldown: ruleForm.cooldown,
        createdBy: userId || 'system'
      });
      
      setIsCreatingRule(false);
      setRuleForm({
        name: '',
        description: '',
        source: '',
        metric: '',
        condition: 'gt',
        threshold: 0,
        severity: 'medium',
        enabled: true,
        channels: [],
        cooldown: 15,
        tags: []
      });
      
      toast({
        title: 'Regra Criada',
        description: 'A regra de alerta foi criada com sucesso.'
      });
      
    } catch (error) {
      toast({
        title: 'Erro ao Criar Regra',
        description: 'Não foi possível criar a regra de alerta.',
        variant: 'destructive'
      });
    }
  };
  
  const handleCreateChannel = async () => {
    try {
      if (!channelForm.name || !channelForm.type) {
        toast({
          title: 'Campos Obrigatórios',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive'
        });
        return;
      }
      
      await createChannel({
        name: channelForm.name,
        type: channelForm.type as any,
        enabled: channelForm.enabled,
        config: channelForm.config
      });
      
      setIsCreatingChannel(false);
      setChannelForm({
        name: '',
        type: 'email',
        enabled: true,
        config: {}
      });
      
      toast({
        title: 'Canal Criado',
        description: 'O canal de notificação foi criado com sucesso.'
      });
      
    } catch (error) {
      toast({
        title: 'Erro ao Criar Canal',
        description: 'Não foi possível criar o canal de notificação.',
        variant: 'destructive'
      });
    }
  };
  
  const handleTestChannel = async (channelId: string) => {
    setTestingChannels(prev => new Set(prev).add(channelId));
    
    try {
      const result = await testChannel(channelId);
      
      toast({
        title: result ? 'Teste Bem-sucedido' : 'Teste Falhou',
        description: result ? 'Canal testado com sucesso.' : 'Falha no teste do canal.',
        variant: result ? 'default' : 'destructive'
      });
      
    } catch (error) {
      toast({
        title: 'Erro no Teste',
        description: 'Não foi possível testar o canal.',
        variant: 'destructive'
      });
    } finally {
      setTestingChannels(prev => {
        const newSet = new Set(prev);
        newSet.delete(channelId);
        return newSet;
      });
    }
  };
  
  const getAvailableMetrics = () => {
    if (!ruleForm.source) return [];
    return METRICS_BY_SOURCE[ruleForm.source as keyof typeof METRICS_BY_SOURCE] || [];
  };
  
  const renderChannelConfig = (type: string, config: Record<string, any>, onChange: (config: Record<string, any>) => void) => {
    switch (type) {
      case 'email':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={config.email || ''}
                onChange={(e) => onChange({ ...config, email: e.target.value })}
                placeholder="exemplo@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="subject">Assunto Padrão</Label>
              <Input
                id="subject"
                value={config.subject || ''}
                onChange={(e) => onChange({ ...config, subject: e.target.value })}
                placeholder="[ALERTA] Sistema de Monitoramento"
              />
            </div>
          </div>
        );
        
      case 'sms':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={config.phone || ''}
                onChange={(e) => onChange({ ...config, phone: e.target.value })}
                placeholder="+55 11 99999-9999"
              />
            </div>
          </div>
        );
        
      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="url">URL do Webhook</Label>
              <Input
                id="url"
                type="url"
                value={config.url || ''}
                onChange={(e) => onChange({ ...config, url: e.target.value })}
                placeholder="https://api.exemplo.com/webhook"
              />
            </div>
            <div>
              <Label htmlFor="method">Método HTTP</Label>
              <Select
                value={config.method || 'POST'}
                onValueChange={(value) => onChange({ ...config, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="headers">Headers (JSON)</Label>
              <Textarea
                id="headers"
                value={config.headers || ''}
                onChange={(e) => onChange({ ...config, headers: e.target.value })}
                placeholder='{"Authorization": "Bearer token"}'
                rows={3}
              />
            </div>
          </div>
        );
        
      case 'slack':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook_url">Webhook URL do Slack</Label>
              <Input
                id="webhook_url"
                value={config.webhook_url || ''}
                onChange={(e) => onChange({ ...config, webhook_url: e.target.value })}
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
            <div>
              <Label htmlFor="channel">Canal</Label>
              <Input
                id="channel"
                value={config.channel || ''}
                onChange={(e) => onChange({ ...config, channel: e.target.value })}
                placeholder="#alertas"
              />
            </div>
          </div>
        );
        
      case 'teams':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook_url">Webhook URL do Teams</Label>
              <Input
                id="webhook_url"
                value={config.webhook_url || ''}
                onChange={(e) => onChange({ ...config, webhook_url: e.target.value })}
                placeholder="https://outlook.office.com/webhook/..."
              />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  // ============================================
  // RENDERIZAÇÃO
  // ============================================
  
  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuração de Alertas</h1>
          <p className="text-muted-foreground">
            Configure regras de alertas, canais de notificação e configurações de monitoramento
          </p>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules">Regras de Alerta</TabsTrigger>
          <TabsTrigger value="channels">Canais de Notificação</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>
        
        {/* Regras de Alerta */}
        <TabsContent value="rules" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Regras de Alerta</h2>
            <Button onClick={() => setIsCreatingRule(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
          
          {/* Lista de Regras */}
          <div className="grid gap-4">
            {rules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn('p-2 rounded-full', rule.enabled ? 'bg-green-100' : 'bg-gray-100')}>
                        {rule.enabled ? (
                          <Bell className="h-4 w-4 text-green-600" />
                        ) : (
                          <Bell className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{rule.name}</h3>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={SEVERITY_COLORS['medium']}>
                            Ativo
                          </Badge>
                          <Badge variant="outline">{rule.enabled ? 'Ativo' : 'Inativo'}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Modal de Criação de Regra */}
          {isCreatingRule && (
            <Card>
              <CardHeader>
                <CardTitle>Nova Regra de Alerta</CardTitle>
                <CardDescription>
                  Configure uma nova regra para monitorar métricas do sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rule-name">Nome da Regra</Label>
                    <Input
                      id="rule-name"
                      value={ruleForm.name}
                      onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                      placeholder="CPU Alto"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rule-source">Fonte</Label>
                    <Select
                      value={ruleForm.source}
                      onValueChange={(value) => setRuleForm({ ...ruleForm, source: value, metric: '' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a fonte" />
                      </SelectTrigger>
                      <SelectContent>
                        {ALERT_SOURCES.map((source) => {
                          const Icon = source.icon;
                          return (
                            <SelectItem key={source.value} value={source.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {source.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="rule-description">Descrição</Label>
                  <Textarea
                    id="rule-description"
                    value={ruleForm.description}
                    onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                    placeholder="Alerta quando o uso de CPU exceder 80%"
                    rows={3}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="rule-metric">Métrica</Label>
                    <Select
                      value={ruleForm.metric}
                      onValueChange={(value) => setRuleForm({ ...ruleForm, metric: value })}
                      disabled={!ruleForm.source}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a métrica" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableMetrics().map((metric) => (
                          <SelectItem key={metric.value} value={metric.value}>
                            {metric.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rule-condition">Condição</Label>
                    <Select
                      value={ruleForm.condition}
                      onValueChange={(value) => setRuleForm({ ...ruleForm, condition: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gt">Maior que</SelectItem>
                            <SelectItem value="lt">Menor que</SelectItem>
                            <SelectItem value="eq">Igual a</SelectItem>
                            <SelectItem value="gte">Maior ou igual a</SelectItem>
                            <SelectItem value="lte">Menor ou igual a</SelectItem>
                        <SelectItem value="contains">Contém</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rule-threshold">Valor</Label>
                    <Input
                      id="rule-threshold"
                      type="number"
                      value={ruleForm.threshold}
                      onChange={(e) => setRuleForm({ ...ruleForm, threshold: parseFloat(e.target.value) || 0 })}
                      placeholder="80"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rule-severity">Severidade</Label>
                    <Select
                      value={ruleForm.severity}
                      onValueChange={(value) => setRuleForm({ ...ruleForm, severity: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rule-cooldown">Cooldown (minutos)</Label>
                    <Input
                      id="rule-cooldown"
                      type="number"
                      value={ruleForm.cooldown}
                      onChange={(e) => setRuleForm({ ...ruleForm, cooldown: parseInt(e.target.value) || 15 })}
                      placeholder="15"
                    />
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="rule-enabled"
                    checked={ruleForm.enabled}
                    onCheckedChange={(checked) => setRuleForm({ ...ruleForm, enabled: checked })}
                  />
                  <Label htmlFor="rule-enabled">Regra ativa</Label>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreatingRule(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateRule}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Regra
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Canais de Notificação */}
        <TabsContent value="channels" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Canais de Notificação</h2>
            <Button onClick={() => setIsCreatingChannel(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Canal
            </Button>
          </div>
          
          {/* Lista de Canais */}
          <div className="grid gap-4">
            {channels.map((channel) => {
              const ChannelIcon = CHANNEL_TYPES.find(t => t.value === channel.type)?.icon || Bell;
              
              return (
                <Card key={channel.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn('p-2 rounded-full', channel.enabled ? 'bg-green-100' : 'bg-gray-100')}>
                          <ChannelIcon className={cn('h-4 w-4', channel.enabled ? 'text-green-600' : 'text-gray-400')} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{channel.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {CHANNEL_TYPES.find(t => t.value === channel.type)?.label}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={channel.enabled ? 'default' : 'secondary'}>
                              {channel.enabled ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleTestChannel(channel.id)}
                          disabled={testingChannels.has(channel.id)}
                        >
                          {testingChannels.has(channel.id) ? (
                            <Clock className="h-4 w-4 animate-spin" />
                          ) : (
                            <Zap className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          {/* Modal de Criação de Canal */}
          {isCreatingChannel && (
            <Card>
              <CardHeader>
                <CardTitle>Novo Canal de Notificação</CardTitle>
                <CardDescription>
                  Configure um novo canal para receber notificações de alertas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="channel-name">Nome do Canal</Label>
                    <Input
                      id="channel-name"
                      value={channelForm.name}
                      onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                      placeholder="Email Administradores"
                    />
                  </div>
                  <div>
                    <Label htmlFor="channel-type">Tipo</Label>
                    <Select
                      value={channelForm.type}
                      onValueChange={(value) => setChannelForm({ ...channelForm, type: value as any, config: {} })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNEL_TYPES.map((type) => {
                          const Icon = type.icon;
                          return (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Configuração específica do canal */}
                {renderChannelConfig(
                  channelForm.type,
                  channelForm.config,
                  (config) => setChannelForm({ ...channelForm, config })
                )}
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="channel-enabled"
                    checked={channelForm.enabled}
                    onCheckedChange={(checked) => setChannelForm({ ...channelForm, enabled: checked })}
                  />
                  <Label htmlFor="channel-enabled">Canal ativo</Label>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsCreatingChannel(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateChannel}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Canal
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Configurações */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Monitoramento</CardTitle>
              <CardDescription>
                Configure as configurações gerais do sistema de monitoramento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="monitoring-enabled">Monitoramento Ativo</Label>
                  <p className="text-sm text-muted-foreground">Ativar ou desativar o sistema de monitoramento</p>
                </div>
                <Switch
                  id="monitoring-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="interval">Intervalo de Verificação (segundos)</Label>
                  <Input
                    id="interval"
                    type="number"
                    value={settings.interval}
                    onChange={(e) => setSettings({ ...settings, interval: parseInt(e.target.value) || 60 })}
                  />
                </div>
                <div>
                  <Label htmlFor="retention">Retenção de Dados (dias)</Label>
                  <Input
                    id="retention"
                    type="number"
                    value={settings.retentionDays}
                    onChange={(e) => setSettings({ ...settings, retentionDays: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="max-alerts">Máximo de Alertas por Hora</Label>
                <Input
                  id="max-alerts"
                  type="number"
                  value={settings.maxAlertsPerHour}
                  onChange={(e) => setSettings({ ...settings, maxAlertsPerHour: parseInt(e.target.value) || 100 })}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-resolve">Resolução Automática</Label>
                    <p className="text-sm text-muted-foreground">Resolver alertas automaticamente quando a condição não for mais atendida</p>
                  </div>
                  <Switch
                    id="auto-resolve"
                    checked={settings.enableAutoResolve}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableAutoResolve: checked })}
                  />
                </div>
                
                {settings.enableAutoResolve && (
                  <div>
                    <Label htmlFor="auto-resolve-timeout">Timeout para Resolução Automática (minutos)</Label>
                    <Input
                      id="auto-resolve-timeout"
                      type="number"
                      value={settings.autoResolveTimeout}
                      onChange={(e) => setSettings({ ...settings, autoResolveTimeout: parseInt(e.target.value) || 60 })}
                    />
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="escalation">Escalação de Alertas</Label>
                    <p className="text-sm text-muted-foreground">Escalar alertas não resolvidos para canais adicionais</p>
                  </div>
                  <Switch
                    id="escalation"
                    checked={settings.enableEscalation}
                    onCheckedChange={(checked) => setSettings({ ...settings, enableEscalation: checked })}
                  />
                </div>
                
                {settings.enableEscalation && (
                  <div>
                    <Label htmlFor="escalation-timeout">Timeout para Escalação (minutos)</Label>
                    <Input
                      id="escalation-timeout"
                      type="number"
                      value={settings.escalationTimeout}
                      onChange={(e) => setSettings({ ...settings, escalationTimeout: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Configurações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AlertConfiguration;