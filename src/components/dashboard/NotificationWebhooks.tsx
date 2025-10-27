'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Globe,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  TestTube,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Activity,
  Zap,
  Shield,
  Key,
  Code,
  Send,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tipos para webhooks
interface Webhook {
  id: string;
  name: string;
  url: string;
  method: 'POST' | 'PUT' | 'PATCH';
  headers: Record<string, string>;
  secret?: string;
  events: string[];
  active: boolean;
  retry_count: number;
  timeout: number;
  created_at: string;
  updated_at: string;
  last_triggered?: string;
  success_count: number;
  failure_count: number;
  avg_response_time: number;
}

interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: any;
  response_status: number;
  response_body: string;
  response_time: number;
  error_message?: string;
  created_at: string;
}

interface WebhookTest {
  webhook_id: string;
  test_payload: any;
  response_status?: number;
  response_body?: string;
  response_time?: number;
  error_message?: string;
}

const NotificationWebhooks: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [isLogsDialogOpen, setIsLogsDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTest | null>(null);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'POST' as 'POST' | 'PUT' | 'PATCH',
    headers: '{}',
    secret: '',
    events: [] as string[],
    active: true,
    retry_count: 3,
    timeout: 30
  });

  const [testPayload, setTestPayload] = useState('{}');

  // Eventos disponíveis
  const availableEvents = [
    'notification.sent',
    'notification.delivered',
    'notification.failed',
    'notification.bounced',
    'notification.opened',
    'notification.clicked',
    'recipient.created',
    'recipient.updated',
    'template.created',
    'template.updated',
    'channel.configured',
    'system.maintenance',
    'system.error'
  ];

  // Carregar webhooks
  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/notifications/webhooks');
      if (!response.ok) throw new Error('Erro ao carregar webhooks');
      const data = await response.json();
      setWebhooks(data.webhooks || []);
    } catch (error) {
      console.error('Erro ao carregar webhooks:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os webhooks',
        variant: 'destructive'
      });
    }
  };

  // Carregar logs de webhook
  const fetchWebhookLogs = async (webhookId: string) => {
    try {
      const response = await fetch(`/api/notifications/webhooks/${webhookId}/logs`);
      if (!response.ok) throw new Error('Erro ao carregar logs');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os logs do webhook',
        variant: 'destructive'
      });
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchWebhooks();
      setLoading(false);
    };
    loadData();
  }, []);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      url: '',
      method: 'POST',
      headers: '{}',
      secret: '',
      events: [],
      active: true,
      retry_count: 3,
      timeout: 30
    });
  };

  // Criar webhook
  const handleCreate = async () => {
    try {
      let headers;
      try {
        headers = JSON.parse(formData.headers);
      } catch {
        throw new Error('Headers deve ser um JSON válido');
      }

      const response = await fetch('/api/notifications/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          headers
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao criar webhook');
      }

      toast({
        title: 'Sucesso',
        description: 'Webhook criado com sucesso'
      });

      setIsCreateDialogOpen(false);
      resetForm();
      fetchWebhooks();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Editar webhook
  const handleEdit = async () => {
    if (!selectedWebhook) return;

    try {
      let headers;
      try {
        headers = JSON.parse(formData.headers);
      } catch {
        throw new Error('Headers deve ser um JSON válido');
      }

      const response = await fetch('/api/notifications/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedWebhook.id,
          ...formData,
          headers
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar webhook');
      }

      toast({
        title: 'Sucesso',
        description: 'Webhook atualizado com sucesso'
      });

      setIsEditDialogOpen(false);
      setSelectedWebhook(null);
      resetForm();
      fetchWebhooks();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Deletar webhook
  const handleDelete = async (webhook: Webhook) => {
    try {
      const response = await fetch('/api/notifications/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: webhook.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao deletar webhook');
      }

      toast({
        title: 'Sucesso',
        description: 'Webhook deletado com sucesso'
      });

      fetchWebhooks();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Testar webhook
  const handleTest = async () => {
    if (!selectedWebhook) return;

    setTesting(true);
    try {
      let payload;
      try {
        payload = JSON.parse(testPayload);
      } catch {
        throw new Error('Payload deve ser um JSON válido');
      }

      const response = await fetch('/api/notifications/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhook_id: selectedWebhook.id,
          test_payload: payload
        })
      });

      const result = await response.json();
      setTestResult(result);

      if (response.ok) {
        toast({
          title: 'Teste realizado',
          description: 'Webhook testado com sucesso'
        });
      } else {
        toast({
          title: 'Teste falhou',
          description: result.error_message || 'Erro no teste do webhook',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setTesting(false);
    }
  };

  // Toggle ativo/inativo
  const toggleWebhook = async (webhook: Webhook) => {
    try {
      const response = await fetch('/api/notifications/webhooks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: webhook.id,
          active: !webhook.active
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar webhook');
      }

      toast({
        title: 'Sucesso',
        description: 'Webhook ' + (!webhook.active ? 'ativado' : 'desativado') + ' com sucesso'
      });

      fetchWebhooks();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Abrir dialog de edição
  const openEditDialog = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setFormData({
      name: webhook.name,
      url: webhook.url,
      method: webhook.method,
      headers: JSON.stringify(webhook.headers, null, 2),
      secret: webhook.secret || '',
      events: webhook.events,
      active: webhook.active,
      retry_count: webhook.retry_count,
      timeout: webhook.timeout
    });
    setIsEditDialogOpen(true);
  };

  // Abrir dialog de teste
  const openTestDialog = (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setTestPayload(JSON.stringify({
      event: 'notification.sent',
      timestamp: new Date().toISOString(),
      data: {
        notification_id: 'test-123',
        recipient: 'test@example.com',
        channel: 'email',
        type: 'security',
        subject: 'Test Notification'
      }
    }, null, 2));
    setTestResult(null);
    setIsTestDialogOpen(true);
  };

  // Abrir dialog de logs
  const openLogsDialog = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    await fetchWebhookLogs(webhook.id);
    setIsLogsDialogOpen(true);
  };

  // Copiar para clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado',
      description: 'Texto copiado para a área de transferência'
    });
  };

  // Calcular taxa de sucesso
  const getSuccessRate = (webhook: Webhook): number => {
    const total = webhook.success_count + webhook.failure_count;
    return total > 0 ? (webhook.success_count / total) * 100 : 0;
  };

  // Obter status do webhook
  const getWebhookStatus = (webhook: Webhook) => {
    if (!webhook.active) return { label: 'Inativo', color: 'secondary' };
    
    const successRate = getSuccessRate(webhook);
    if (successRate >= 95) return { label: 'Saudável', color: 'default' };
    if (successRate >= 80) return { label: 'Atenção', color: 'secondary' };
    return { label: 'Crítico', color: 'destructive' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando webhooks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground">
            Gerencie webhooks para receber notificações de eventos
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Webhook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Webhook</DialogTitle>
              <DialogDescription>
                Configure um novo webhook para receber notificações de eventos
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do webhook"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="method">Método</Label>
                  <Select value={formData.method} onValueChange={(value: 'POST' | 'PUT' | 'PATCH') => setFormData(prev => ({ ...prev, method: value }))}>
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
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  placeholder="https://example.com/webhook"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="secret">Secret (opcional)</Label>
                <Input
                  id="secret"
                  type="password"
                  value={formData.secret}
                  onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="Secret para assinatura HMAC"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="headers">Headers (JSON)</Label>
                <Textarea
                  id="headers"
                  value={formData.headers}
                  onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                  placeholder='{"Content-Type": "application/json"}'
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Eventos</Label>
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                  {availableEvents.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={event}
                        checked={formData.events.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, events: [...prev.events, event] }));
                          } else {
                            setFormData(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }));
                          }
                        }}
                      />
                      <Label htmlFor={event} className="text-sm">{event}</Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="retry_count">Tentativas</Label>
                  <Input
                    id="retry_count"
                    type="number"
                    min="0"
                    max="10"
                    value={formData.retry_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, retry_count: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (s)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    min="1"
                    max="300"
                    value={formData.timeout}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="active">Ativo</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    />
                    <span className="text-sm">{formData.active ? 'Sim' : 'Não'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!formData.name || !formData.url}>
                Criar Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de webhooks */}
      {webhooks.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum webhook configurado</h3>
            <p className="text-muted-foreground mb-4">
              Configure webhooks para receber notificações de eventos em tempo real.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Webhook
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {webhooks.map((webhook) => {
            const status = getWebhookStatus(webhook);
            const successRate = getSuccessRate(webhook);
            
            return (
              <Card key={webhook.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-5 w-5" />
                      <CardTitle className="text-lg">{webhook.name}</CardTitle>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={status.color as any}>{status.label}</Badge>
                      <Switch
                        checked={webhook.active}
                        onCheckedChange={() => toggleWebhook(webhook)}
                      />
                    </div>
                  </div>
                  <CardDescription className="flex items-center space-x-2">
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {webhook.method}
                    </span>
                    <span className="truncate">{webhook.url}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(webhook.url)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Estatísticas */}
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-green-600">{webhook.success_count}</p>
                        <p className="text-xs text-muted-foreground">Sucessos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-red-600">{webhook.failure_count}</p>
                        <p className="text-xs text-muted-foreground">Falhas</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{successRate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Taxa de sucesso</p>
                      </div>
                    </div>
                    
                    {/* Informações */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Eventos:</span>
                        <span>{webhook.events.length} configurados</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tempo médio:</span>
                        <span>{webhook.avg_response_time.toFixed(0)}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Última execução:</span>
                        <span>
                          {webhook.last_triggered 
                            ? format(new Date(webhook.last_triggered), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : 'Nunca'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {/* Ações */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openTestDialog(webhook)}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openLogsDialog(webhook)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(webhook)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Deletar webhook</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar o webhook "{webhook.name}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(webhook)}>
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog de edição */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Webhook</DialogTitle>
            <DialogDescription>
              Atualize as configurações do webhook
            </DialogDescription>
          </DialogHeader>
          
          {/* Mesmo conteúdo do dialog de criação */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do webhook"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-method">Método</Label>
                <Select value={formData.method} onValueChange={(value: 'POST' | 'PUT' | 'PATCH') => setFormData(prev => ({ ...prev, method: value }))}>
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-url">URL</Label>
              <Input
                id="edit-url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://example.com/webhook"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-secret">Secret (opcional)</Label>
              <div className="relative">
                <Input
                  id="edit-secret"
                  type={showSecret[selectedWebhook?.id || ''] ? 'text' : 'password'}
                  value={formData.secret}
                  onChange={(e) => setFormData(prev => ({ ...prev, secret: e.target.value }))}
                  placeholder="Secret para assinatura HMAC"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecret(prev => ({ 
                    ...prev, 
                    [selectedWebhook?.id || '']: !prev[selectedWebhook?.id || ''] 
                  }))}
                >
                  {showSecret[selectedWebhook?.id || ''] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-headers">Headers (JSON)</Label>
              <Textarea
                id="edit-headers"
                value={formData.headers}
                onChange={(e) => setFormData(prev => ({ ...prev, headers: e.target.value }))}
                placeholder='{"Content-Type": "application/json"}'
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Eventos</Label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                {availableEvents.map((event) => (
                  <div key={event} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`edit-${event}`}
                      checked={formData.events.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, events: [...prev.events, event] }));
                        } else {
                          setFormData(prev => ({ ...prev, events: prev.events.filter(e => e !== event) }));
                        }
                      }}
                    />
                    <Label htmlFor={`edit-${event}`} className="text-sm">{event}</Label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-retry_count">Tentativas</Label>
                <Input
                  id="edit-retry_count"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.retry_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, retry_count: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-timeout">Timeout (s)</Label>
                <Input
                  id="edit-timeout"
                  type="number"
                  min="1"
                  max="300"
                  value={formData.timeout}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-active">Ativo</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="edit-active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  />
                  <span className="text-sm">{formData.active ? 'Sim' : 'Não'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name || !formData.url}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de teste */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Testar Webhook</DialogTitle>
            <DialogDescription>
              Envie um payload de teste para o webhook
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test-payload">Payload de Teste (JSON)</Label>
              <Textarea
                id="test-payload"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            
            {testResult && (
              <div className="space-y-2">
                <Label>Resultado do Teste</Label>
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    {testResult.response_status && testResult.response_status < 400 ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      Status: {testResult.response_status || 'Erro'}
                    </span>
                    {testResult.response_time && (
                      <span className="text-sm text-muted-foreground">
                        ({testResult.response_time}ms)
                      </span>
                    )}
                  </div>
                  
                  {testResult.error_message && (
                    <div className="text-sm text-red-600">
                      <strong>Erro:</strong> {testResult.error_message}
                    </div>
                  )}
                  
                  {testResult.response_body && (
                    <div className="space-y-1">
                      <Label className="text-sm">Resposta:</Label>
                      <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {testResult.response_body}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={handleTest} disabled={testing || !testPayload}>
              {testing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Testar Webhook
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de logs */}
      <Dialog open={isLogsDialogOpen} onOpenChange={setIsLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Logs do Webhook</DialogTitle>
            <DialogDescription>
              Histórico de execuções do webhook "{selectedWebhook?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {logs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {log.response_status < 400 ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">{log.event_type}</span>
                        <Badge variant={log.response_status < 400 ? 'default' : 'destructive'}>
                          {log.response_status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-xs">Tempo de resposta:</Label>
                        <p>{log.response_time}ms</p>
                      </div>
                      {log.error_message && (
                        <div>
                          <Label className="text-xs">Erro:</Label>
                          <p className="text-red-600">{log.error_message}</p>
                        </div>
                      )}
                    </div>
                    
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                        Ver detalhes
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <Label className="text-xs">Payload:</Label>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(log.payload, null, 2)}
                          </pre>
                        </div>
                        {log.response_body && (
                          <div>
                            <Label className="text-xs">Resposta:</Label>
                            <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                              {log.response_body}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLogsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationWebhooks;
