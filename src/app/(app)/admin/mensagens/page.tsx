// @/app/(app)/admin/mensagens/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Send, Play, Square, CheckCircle, AlertCircle, Clock, Users } from "lucide-react";
import { appToast } from "@/lib/app-toast";

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  isProcessing: boolean;
}

interface ReminderStats {
  service: {
    isRunning: boolean;
    hasInterval: boolean;
  };
  statistics: {
    expiringClients: number;
    expiredClients: number;
    expiringClientsList: Array<{
      id: string;
      name: string;
      expiration_date: string;
    }>;
    expiredClientsList: Array<{
      id: string;
      name: string;
      expiration_date: string;
    }>;
  };
}

interface MessageConnectivity {
  email: {
    status: 'connected' | 'error' | 'not_configured';
    message: string;
  };
  whatsapp: {
    status: 'connected' | 'error' | 'not_configured';
    message: string;
  };
}

export default function AdminMensagensPage() {
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);
  const [connectivity, setConnectivity] = useState<MessageConnectivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(300); // 5 minutos

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar estatísticas da fila
      const queueResponse = await fetch('/api/message-queue');
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        setQueueStats(queueData.stats);
      }

      // Buscar estatísticas dos lembretes
      const reminderResponse = await fetch('/api/reminders');
      if (reminderResponse.ok) {
        const reminderData = await reminderResponse.json();
        setReminderStats(reminderData);
      }

      // Buscar conectividade dos serviços
      const connectivityResponse = await fetch('/api/messages?action=test');
      if (connectivityResponse.ok) {
        const connectivityData = await connectivityResponse.json();
        setConnectivity(connectivityData);
      }

    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      appToast.error('Erro ao carregar dados do sistema');
    } finally {
      setLoading(false);
    }
  };

  // Carregamento inicial
  useEffect(() => {
    fetchData();
  }, []);

  // Auto-refresh apenas se habilitado
  useEffect(() => {
    if (!autoRefresh || refreshInterval < 60) return;
    
    const interval = setInterval(fetchData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const handleQueueAction = async (action: string) => {
    try {
      setActionLoading(action);
      
      const response = await fetch('/api/message-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      
      if (response.ok) {
        appToast.success(data.message);
        await fetchData();
      } else {
        appToast.error(data.error || 'Erro na operação');
      }
    } catch (error) {
      console.error('Erro na ação da fila:', error);
      appToast.error('Erro ao executar ação');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReminderAction = async (action: string) => {
    try {
      setActionLoading(action);
      
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      
      if (response.ok) {
        appToast.success(data.message);
        await fetchData();
      } else {
        appToast.error(data.error || 'Erro na operação');
      }
    } catch (error) {
      console.error('Erro na ação dos lembretes:', error);
      appToast.error('Erro ao executar ação');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'not_configured':
        return <Badge variant="secondary">Não Configurado</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            {autoRefresh && (
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="text-sm border rounded px-2 py-1"
              >
                <option value={60}>1 min</option>
                <option value={300}>5 min</option>
                <option value={600}>10 min</option>
                <option value={1800}>30 min</option>
              </select>
            )}
          </div>
          <Button onClick={fetchData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="queue">Fila de Mensagens</TabsTrigger>
          <TabsTrigger value="reminders">Lembretes</TabsTrigger>
          <TabsTrigger value="connectivity">Conectividade</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Fila de Mensagens
              </CardTitle>
              <CardDescription>
                Status e estatísticas da fila de processamento de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queueStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{queueStats.total}</div>
                      <div className="text-sm text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{queueStats.pending}</div>
                      <div className="text-sm text-muted-foreground">Pendentes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{queueStats.processing}</div>
                      <div className="text-sm text-muted-foreground">Processando</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
                      <div className="text-sm text-muted-foreground">Concluídas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
                      <div className="text-sm text-muted-foreground">Falharam</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {queueStats.isProcessing ? (
                        <Badge variant="default" className="bg-green-500">
                          <Play className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Square className="h-3 w-3 mr-1" />
                          Parado
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleQueueAction(queueStats.isProcessing ? 'stop' : 'start')}
                        variant={queueStats.isProcessing ? 'destructive' : 'default'}
                        size="sm"
                        disabled={actionLoading === 'queue-toggle'}
                      >
                        {queueStats.isProcessing ? 'Parar' : 'Iniciar'} Fila
                      </Button>
                      <Button
                        onClick={() => handleQueueAction('reprocess-failed')}
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === 'reprocess-failed'}
                      >
                        Reprocessar Falhas
                      </Button>
                      <Button
                        onClick={() => handleQueueAction('cleanup')}
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === 'cleanup'}
                      >
                        Limpar Antigas
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Não foi possível carregar as estatísticas da fila</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reminders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Serviço de Lembretes
              </CardTitle>
              <CardDescription>
                Status e estatísticas do sistema de lembretes automáticos
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reminderStats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{reminderStats.statistics.expiringClients}</div>
                      <div className="text-sm text-muted-foreground">Vencendo em 3 dias</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{reminderStats.statistics.expiredClients}</div>
                      <div className="text-sm text-muted-foreground">Vencidos</div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {reminderStats.service.isRunning ? (
                        <Badge variant="default" className="bg-green-500">
                          <Play className="h-3 w-3 mr-1" />
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Square className="h-3 w-3 mr-1" />
                          Parado
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleReminderAction(reminderStats.service.isRunning ? 'stop' : 'start')}
                        variant={reminderStats.service.isRunning ? 'destructive' : 'default'}
                        size="sm"
                        disabled={actionLoading === 'reminder-toggle'}
                      >
                        {reminderStats.service.isRunning ? 'Parar' : 'Iniciar'} Serviço
                      </Button>
                      <Button
                        onClick={() => handleReminderAction('check')}
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === 'check'}
                      >
                        Verificar Agora
                      </Button>
                      <Button
                        onClick={() => handleReminderAction('check-expired')}
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === 'check-expired'}
                      >
                        Verificar Vencidos
                      </Button>
                    </div>
                  </div>
                  
                  {(reminderStats.statistics.expiringClientsList.length > 0 || reminderStats.statistics.expiredClientsList.length > 0) && (
                    <>
                      <Separator />
                      <div className="space-y-4">
                        {reminderStats.statistics.expiringClientsList.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Clientes Vencendo:</h4>
                            <div className="space-y-1">
                              {reminderStats.statistics.expiringClientsList.slice(0, 5).map((client) => (
                                <div key={client.id} className="flex justify-between text-sm">
                                  <span>{client.name}</span>
                                  <span className="text-muted-foreground">
                                    {new Date(client.expiration_date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              ))}
                              {reminderStats.statistics.expiringClientsList.length > 5 && (
                                <div className="text-sm text-muted-foreground">
                                  +{reminderStats.statistics.expiringClientsList.length - 5} mais...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {reminderStats.statistics.expiredClientsList.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Clientes Vencidos:</h4>
                            <div className="space-y-1">
                              {reminderStats.statistics.expiredClientsList.slice(0, 5).map((client) => (
                                <div key={client.id} className="flex justify-between text-sm">
                                  <span>{client.name}</span>
                                  <span className="text-red-600">
                                    {new Date(client.expiration_date).toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              ))}
                              {reminderStats.statistics.expiredClientsList.length > 5 && (
                                <div className="text-sm text-muted-foreground">
                                  +{reminderStats.statistics.expiredClientsList.length - 5} mais...
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Não foi possível carregar as estatísticas dos lembretes</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="connectivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Conectividade dos Serviços
              </CardTitle>
              <CardDescription>
                Status da conexão com os serviços de e-mail e WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              {connectivity ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">E-mail (SMTP)</h4>
                        {getStatusBadge(connectivity.email.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{connectivity.email.message}</p>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">WhatsApp</h4>
                        {getStatusBadge(connectivity.whatsapp.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">{connectivity.whatsapp.message}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Não foi possível verificar a conectividade dos serviços</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Ações Rápidas
              </CardTitle>
              <CardDescription>
                Execute ações manuais no sistema de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => handleQueueAction('reprocess-failed')}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  disabled={actionLoading === 'reprocess-failed'}
                >
                  <div className="font-medium">Reprocessar Mensagens Falhas</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Tenta enviar novamente as mensagens que falharam
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleReminderAction('check')}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  disabled={actionLoading === 'check'}
                >
                  <div className="font-medium">Verificar Lembretes</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Executa verificação manual de clientes próximos ao vencimento
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleReminderAction('check-expired')}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  disabled={actionLoading === 'check-expired'}
                >
                  <div className="font-medium">Processar Vencidos</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Atualiza status e envia notificações para clientes vencidos
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleQueueAction('cleanup')}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  disabled={actionLoading === 'cleanup'}
                >
                  <div className="font-medium">Limpar Mensagens Antigas</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Remove mensagens antigas da fila para otimizar performance
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
