'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Mail,
  MessageSquare,
  Smartphone,
  Bell,
  Globe,
  Webhook,
  Users,
  Send,
  Settings,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Key,
  Server,
  Database,
  Zap,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  TestTube,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos para configurações
interface ChannelConfig {
  id: string;
  channel: string;
  name: string;
  config: {
    [key: string]: any;
  };
  rate_limit: {
    max_requests: number;
    window_minutes: number;
  };
  retry_policy: {
    max_attempts: number;
    backoff_multiplier: number;
    max_delay_minutes: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Recipient {
  id: string;
  type: 'user' | 'group' | 'role' | 'email' | 'phone' | 'webhook';
  identifier: string;
  name?: string;
  preferences: {
    channels: string[];
    types: string[];
    priority_threshold: string;
    quiet_hours?: {
      start: string;
      end: string;
      timezone: string;
    };
    frequency_limit?: {
      max_per_hour: number;
      max_per_day: number;
    };
  };
  metadata?: {
    [key: string]: any;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface GlobalSettings {
  default_channel: string;
  fallback_channels: string[];
  rate_limiting: {
    global_max_per_minute: number;
    per_user_max_per_hour: number;
  };
  retry_settings: {
    default_max_attempts: number;
    default_backoff_multiplier: number;
  };
  security: {
    require_encryption: boolean;
    webhook_signature_required: boolean;
    audit_all_notifications: boolean;
  };
  maintenance: {
    auto_cleanup_days: number;
    max_queue_size: number;
  };
}

const NotificationSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('channels');
  const [channels, setChannels] = useState<ChannelConfig[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChannelDialogOpen, setIsChannelDialogOpen] = useState(false);
  const [isRecipientDialogOpen, setIsRecipientDialogOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState<ChannelConfig | null>(null);
  const [editingRecipient, setEditingRecipient] = useState<Recipient | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const { toast } = useToast();

  // Configurações de canal por tipo
  const channelConfigs = {
    email: {
      fields: [
        { key: 'smtp_host', label: 'Servidor SMTP', type: 'text', required: true },
        { key: 'smtp_port', label: 'Porta', type: 'number', required: true },
        { key: 'smtp_user', label: 'Usuário', type: 'text', required: true },
        { key: 'smtp_password', label: 'Senha', type: 'password', required: true },
        { key: 'from_email', label: 'Email Remetente', type: 'email', required: true },
        { key: 'from_name', label: 'Nome Remetente', type: 'text', required: false },
        { key: 'use_tls', label: 'Usar TLS', type: 'boolean', required: false }
      ]
    },
    sms: {
      fields: [
        { key: 'provider', label: 'Provedor', type: 'select', options: ['twilio', 'aws_sns', 'nexmo'], required: true },
        { key: 'api_key', label: 'API Key', type: 'password', required: true },
        { key: 'api_secret', label: 'API Secret', type: 'password', required: true },
        { key: 'from_number', label: 'Número Remetente', type: 'text', required: true }
      ]
    },
    webhook: {
      fields: [
        { key: 'url', label: 'URL do Webhook', type: 'url', required: true },
        { key: 'method', label: 'Método HTTP', type: 'select', options: ['POST', 'PUT', 'PATCH'], required: true },
        { key: 'headers', label: 'Headers (JSON)', type: 'textarea', required: false },
        { key: 'timeout_seconds', label: 'Timeout (segundos)', type: 'number', required: false },
        { key: 'verify_ssl', label: 'Verificar SSL', type: 'boolean', required: false }
      ]
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchChannels(),
          fetchRecipients(),
          fetchGlobalSettings()
        ]);
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar as configurações',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Função para buscar canais
  const fetchChannels = async () => {
    const response = await fetch('/api/notifications/config?type=channels');
    if (!response.ok) throw new Error('Erro ao carregar canais');
    const data = await response.json();
    setChannels(data.channels || []);
  };

  // Função para buscar destinatários
  const fetchRecipients = async () => {
    const response = await fetch('/api/notifications/config?type=recipients');
    if (!response.ok) throw new Error('Erro ao carregar destinatários');
    const data = await response.json();
    setRecipients(data.recipients || []);
  };

  // Função para buscar configurações globais
  const fetchGlobalSettings = async () => {
    const response = await fetch('/api/notifications/config?type=global');
    if (!response.ok) throw new Error('Erro ao carregar configurações globais');
    const data = await response.json();
    setGlobalSettings(data.settings || null);
  };

  // Função para salvar canal
  const saveChannel = async (channelData: Partial<ChannelConfig>) => {
    try {
      const method = editingChannel ? 'PUT' : 'POST';
      const body = editingChannel 
        ? { id: editingChannel.id, ...channelData }
        : channelData;
      
      const response = await fetch('/api/notifications/config', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'channel', data: body })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar canal');
      }
      
      toast({
        title: 'Sucesso',
        description: `Canal ${editingChannel ? 'atualizado' : 'criado'} com sucesso`
      });
      
      setIsChannelDialogOpen(false);
      setEditingChannel(null);
      await fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Função para testar canal
  const testChannel = async (channelId: string) => {
    setTestingChannel(channelId);
    try {
      const response = await fetch('/api/notifications/config/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel_id: channelId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao testar canal');
      }
      
      toast({
        title: 'Sucesso',
        description: 'Canal testado com sucesso'
      });
    } catch (error: any) {
      toast({
        title: 'Erro no teste',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTestingChannel(null);
    }
  };

  // Função para deletar canal
  const deleteChannel = async (channelId: string) => {
    if (!confirm('Tem certeza que deseja deletar este canal?')) return;
    
    try {
      const response = await fetch('/api/notifications/config', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'channel', id: channelId })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar canal');
      }
      
      toast({
        title: 'Sucesso',
        description: 'Canal deletado com sucesso'
      });
      
      await fetchChannels();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Função para salvar configurações globais
  const saveGlobalSettings = async (settings: GlobalSettings) => {
    try {
      const response = await fetch('/api/notifications/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'global', data: settings })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao salvar configurações');
      }
      
      toast({
        title: 'Sucesso',
        description: 'Configurações salvas com sucesso'
      });
      
      await fetchGlobalSettings();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Função para obter ícone do canal
  const getChannelIcon = (channel: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      email: Mail,
      sms: Smartphone,
  
      teams: Users,
      discord: MessageSquare,
      telegram: Send,
      webhook: Webhook,
      push: Bell,
      in_app: Bell
    };
    
    const Icon = icons[channel] || Globe;
    return <Icon className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configurações de Notificação</h1>
          <p className="text-muted-foreground">
            Configure canais, destinatários e preferências do sistema
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Canais</TabsTrigger>
          <TabsTrigger value="recipients">Destinatários</TabsTrigger>
          <TabsTrigger value="global">Configurações Globais</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
        </TabsList>

        {/* Tab: Canais */}
        <TabsContent value="channels" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Canais de Notificação</h2>
            <Dialog open={isChannelDialogOpen} onOpenChange={setIsChannelDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingChannel(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Canal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingChannel ? 'Editar Canal' : 'Novo Canal'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure um canal para envio de notificações
                  </DialogDescription>
                </DialogHeader>
                <ChannelForm
                  channel={editingChannel}
                  onSave={saveChannel}
                  onCancel={() => setIsChannelDialogOpen(false)}
                  channelConfigs={channelConfigs}
                />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {channels.map((channel) => (
              <Card key={channel.id} className={`${!channel.is_active ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      {getChannelIcon(channel.channel)}
                      <div>
                        <CardTitle className="text-lg">{channel.name}</CardTitle>
                        <CardDescription className="capitalize">
                          {channel.channel}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={channel.is_active ? 'default' : 'secondary'}>
                      {channel.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Rate Limit */}
                    <div className="text-sm">
                      <span className="font-medium">Rate Limit:</span>
                      <p className="text-muted-foreground">
                        {channel.rate_limit.max_requests} req/{channel.rate_limit.window_minutes}min
                      </p>
                    </div>
                    
                    {/* Retry Policy */}
                    <div className="text-sm">
                      <span className="font-medium">Tentativas:</span>
                      <p className="text-muted-foreground">
                        Máx. {channel.retry_policy.max_attempts} tentativas
                      </p>
                    </div>
                    
                    {/* Ações */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testChannel(channel.id)}
                        disabled={testingChannel === channel.id}
                      >
                        {testingChannel === channel.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current" />
                        ) : (
                          <TestTube className="h-3 w-3" />
                        )}
                        <span className="ml-1">Testar</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingChannel(channel);
                          setIsChannelDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteChannel(channel.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    {/* Data de criação */}
                    <div className="text-xs text-muted-foreground pt-2 border-t">
                      Criado {formatDistanceToNow(new Date(channel.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {channels.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum canal configurado</h3>
                <p className="text-muted-foreground mb-4">
                  Configure canais para começar a enviar notificações.
                </p>
                <Button onClick={() => setIsChannelDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Configurar Primeiro Canal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Destinatários */}
        <TabsContent value="recipients" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Destinatários</h2>
            <Button onClick={() => setIsRecipientDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Destinatário
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipients.map((recipient) => (
              <Card key={recipient.id} className={`${!recipient.is_active ? 'opacity-60' : ''}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {recipient.name || recipient.identifier}
                      </CardTitle>
                      <CardDescription className="capitalize">
                        {recipient.type}
                      </CardDescription>
                    </div>
                    <Badge variant={recipient.is_active ? 'default' : 'secondary'}>
                      {recipient.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Canais preferidos */}
                    <div>
                      <span className="text-sm font-medium">Canais:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recipient.preferences.channels.map(channel => (
                          <Badge key={channel} variant="outline" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {/* Tipos de notificação */}
                    <div>
                      <span className="text-sm font-medium">Tipos:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recipient.preferences.types.slice(0, 3).map(type => (
                          <Badge key={type} variant="secondary" className="text-xs">
                            {type}
                          </Badge>
                        ))}
                        {recipient.preferences.types.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{recipient.preferences.types.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Prioridade mínima */}
                    <div className="text-sm">
                      <span className="font-medium">Prioridade mínima:</span>
                      <p className="text-muted-foreground capitalize">
                        {recipient.preferences.priority_threshold}
                      </p>
                    </div>
                    
                    {/* Ações */}
                    <div className="flex items-center space-x-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingRecipient(recipient);
                          setIsRecipientDialogOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Implementar delete recipient
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab: Configurações Globais */}
        <TabsContent value="global" className="space-y-6">
          <h2 className="text-xl font-semibold">Configurações Globais</h2>
          
          {globalSettings && (
            <GlobalSettingsForm
              settings={globalSettings}
              onSave={saveGlobalSettings}
            />
          )}
        </TabsContent>

        {/* Tab: Monitoramento */}
        <TabsContent value="monitoring" className="space-y-6">
          <h2 className="text-xl font-semibold">Monitoramento do Sistema</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Status dos canais */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Canais Ativos</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {channels.filter(c => c.is_active).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  de {channels.length} configurados
                </p>
              </CardContent>
            </Card>
            
            {/* Destinatários ativos */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Destinatários</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {recipients.filter(r => r.is_active).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  ativos
                </p>
              </CardContent>
            </Card>
            
            {/* Status de segurança */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Segurança</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {globalSettings?.security.require_encryption ? 'ON' : 'OFF'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Criptografia
                </p>
              </CardContent>
            </Card>
            
            {/* Rate limiting */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {globalSettings?.rate_limiting.global_max_per_minute || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  req/min global
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Alertas do sistema */}
          <Card>
            <CardHeader>
              <CardTitle>Status do Sistema</CardTitle>
              <CardDescription>
                Monitoramento em tempo real dos componentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Sistema de Notificações</span>
                  </div>
                  <Badge variant="default">Operacional</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Fila de Processamento</span>
                  </div>
                  <Badge variant="default">Operacional</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    <span>Rate Limiting</span>
                  </div>
                  <Badge variant="secondary">Atenção</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Componente para formulário de canal
interface ChannelFormProps {
  channel: ChannelConfig | null;
  onSave: (data: Partial<ChannelConfig>) => void;
  onCancel: () => void;
  channelConfigs: any;
}

const ChannelForm: React.FC<ChannelFormProps> = ({ channel, onSave, onCancel, channelConfigs }) => {
  const [formData, setFormData] = useState({
    name: channel?.name || '',
    channel: channel?.channel || '',
    config: channel?.config || {},
    rate_limit: channel?.rate_limit || { max_requests: 100, window_minutes: 60 },
    retry_policy: channel?.retry_policy || { max_attempts: 3, backoff_multiplier: 2, max_delay_minutes: 30 },
    is_active: channel?.is_active ?? true
  });
  
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  
  const selectedChannelConfig = channelConfigs[formData.channel];
  
  const handleConfigChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      config: {
        ...prev.config,
        [key]: value
      }
    }));
  };
  
  const handleSubmit = () => {
    onSave(formData);
  };
  
  return (
    <div className="space-y-6">
      {/* Informações básicas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Canal</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Email Principal"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="channel">Tipo de Canal</Label>
          <Select value={formData.channel} onValueChange={(value) => setFormData(prev => ({ ...prev, channel: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              
              <SelectItem value="webhook">Webhook</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Configurações específicas do canal */}
      {selectedChannelConfig && (
        <div className="space-y-4">
          <h4 className="font-medium">Configurações do {formData.channel}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedChannelConfig.fields.map((field: any) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                
                {field.type === 'select' ? (
                  <Select 
                    value={formData.config[field.key] || ''} 
                    onValueChange={(value) => handleConfigChange(field.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === 'textarea' ? (
                  <Textarea
                    id={field.key}
                    value={formData.config[field.key] || ''}
                    onChange={(e) => handleConfigChange(field.key, e.target.value)}
                    placeholder={field.label}
                    rows={3}
                  />
                ) : field.type === 'boolean' ? (
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={formData.config[field.key] || false}
                      onCheckedChange={(checked) => handleConfigChange(field.key, checked)}
                    />
                    <span className="text-sm">{field.label}</span>
                  </div>
                ) : field.type === 'password' ? (
                  <div className="relative">
                    <Input
                      id={field.key}
                      type={showPassword[field.key] ? 'text' : 'password'}
                      value={formData.config[field.key] || ''}
                      onChange={(e) => handleConfigChange(field.key, e.target.value)}
                      placeholder={field.label}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(prev => ({ ...prev, [field.key]: !prev[field.key] }))}
                    >
                      {showPassword[field.key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                ) : (
                  <Input
                    id={field.key}
                    type={field.type}
                    value={formData.config[field.key] || ''}
                    onChange={(e) => handleConfigChange(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                    placeholder={field.label}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Rate limiting e retry policy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-medium">Rate Limiting</h4>
          <div className="space-y-2">
            <Label>Máximo de requisições</Label>
            <Input
              type="number"
              value={formData.rate_limit.max_requests}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                rate_limit: { ...prev.rate_limit, max_requests: Number(e.target.value) }
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Janela de tempo (minutos)</Label>
            <Input
              type="number"
              value={formData.rate_limit.window_minutes}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                rate_limit: { ...prev.rate_limit, window_minutes: Number(e.target.value) }
              }))}
            />
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-medium">Política de Retry</h4>
          <div className="space-y-2">
            <Label>Máximo de tentativas</Label>
            <Input
              type="number"
              value={formData.retry_policy.max_attempts}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                retry_policy: { ...prev.retry_policy, max_attempts: Number(e.target.value) }
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Multiplicador de backoff</Label>
            <Input
              type="number"
              step="0.1"
              value={formData.retry_policy.backoff_multiplier}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                retry_policy: { ...prev.retry_policy, backoff_multiplier: Number(e.target.value) }
              }))}
            />
          </div>
        </div>
      </div>
      
      {/* Status */}
      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label>Canal ativo</Label>
      </div>
      
      {/* Ações */}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-2" />
          {channel ? 'Atualizar' : 'Criar'} Canal
        </Button>
      </DialogFooter>
    </div>
  );
};

// Componente para configurações globais
interface GlobalSettingsFormProps {
  settings: GlobalSettings;
  onSave: (settings: GlobalSettings) => void;
}

const GlobalSettingsForm: React.FC<GlobalSettingsFormProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<GlobalSettings>(settings);
  
  const handleSubmit = () => {
    onSave(formData);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Padrão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Canal Padrão</Label>
              <Select 
                value={formData.default_channel} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, default_channel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Push</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting Global</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Máximo global por minuto</Label>
              <Input
                type="number"
                value={formData.rate_limiting.global_max_per_minute}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rate_limiting: {
                    ...prev.rate_limiting,
                    global_max_per_minute: Number(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Máximo por usuário por hora</Label>
              <Input
                type="number"
                value={formData.rate_limiting.per_user_max_per_hour}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rate_limiting: {
                    ...prev.rate_limiting,
                    per_user_max_per_hour: Number(e.target.value)
                  }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Exigir criptografia</Label>
                <p className="text-sm text-muted-foreground">Criptografar todas as notificações</p>
              </div>
              <Switch
                checked={formData.security.require_encryption}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  security: { ...prev.security, require_encryption: checked }
                }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Assinatura de webhook obrigatória</Label>
                <p className="text-sm text-muted-foreground">Verificar assinatura em webhooks</p>
              </div>
              <Switch
                checked={formData.security.webhook_signature_required}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  security: { ...prev.security, webhook_signature_required: checked }
                }))}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Auditoria completa</Label>
                <p className="text-sm text-muted-foreground">Registrar todas as notificações</p>
              </div>
              <Switch
                checked={formData.security.audit_all_notifications}
                onCheckedChange={(checked) => setFormData(prev => ({
                  ...prev,
                  security: { ...prev.security, audit_all_notifications: checked }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Manutenção</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Limpeza automática (dias)</Label>
              <Input
                type="number"
                value={formData.maintenance.auto_cleanup_days}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  maintenance: {
                    ...prev.maintenance,
                    auto_cleanup_days: Number(e.target.value)
                  }
                }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tamanho máximo da fila</Label>
              <Input
                type="number"
                value={formData.maintenance.max_queue_size}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  maintenance: {
                    ...prev.maintenance,
                    max_queue_size: Number(e.target.value)
                  }
                }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettings;
