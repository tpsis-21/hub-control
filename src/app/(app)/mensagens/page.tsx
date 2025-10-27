"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/app/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Trash2,
  Filter,
  Search,
  MessageSquare,
  Mail,
  Users,
  Bell
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QueuedMessage {
  id: string;
  type: 'email' | 'whatsapp' | 'welcome' | 'reminder';
  priority: 'low' | 'normal' | 'high';
  scheduledFor?: string;
  attempts: number;
  maxAttempts: number;
  data: any;
  createdAt: string;
  lastAttempt?: string;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  isProcessing: boolean;
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800'
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-800',
  normal: 'bg-blue-100 text-blue-800',
  high: 'bg-red-100 text-red-800'
};

const typeIcons = {
  email: Mail,
  whatsapp: MessageSquare,
  welcome: Users,
  reminder: Bell
};

export default function FilaMensagensPage() {
  const [messages, setMessages] = useState<QueuedMessage[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    search: ''
  });
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Buscar estatísticas da fila
      const statsResponse = await fetch('/api/message-queue');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Buscar mensagens da fila
      const messagesResponse = await fetch('/api/message-queue/messages');
      if (messagesResponse.ok) {
        const messagesData = await messagesResponse.json();
        setMessages(messagesData.messages || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da fila.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQueueAction = async (action: string) => {
    try {
      setActionLoading(action);
      
      const response = await fetch('/api/message-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: data.message
        });
        await fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao executar ação",
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  const retryMessage = async (messageId: string) => {
    try {
      const response = await fetch('/api/message-queue/retry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messageId })
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Mensagem adicionada novamente à fila"
        });
        await fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao reprocessar mensagem",
        variant: "destructive"
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/message-queue/messages/${messageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Mensagem removida da fila"
        });
        await fetchData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao remover mensagem",
        variant: "destructive"
      });
    }
  };

  const filteredMessages = messages.filter(message => {
    if (filters.status && filters.status !== 'all' && message.status !== filters.status) return false;
    if (filters.type && filters.type !== 'all' && message.type !== filters.type) return false;
    if (filters.priority && filters.priority !== 'all' && message.priority !== filters.priority) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        message.id.toLowerCase().includes(searchLower) ||
        message.type.toLowerCase().includes(searchLower) ||
        (message.data?.to && message.data.to.toLowerCase().includes(searchLower)) ||
        (message.data?.subject && message.data.subject.toLowerCase().includes(searchLower))
      );
    }
    return true;
  });

  useEffect(() => {
    fetchData();
    
    // Atualizar dados a cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fila de Mensagens</h1>
          <p className="text-muted-foreground">
            Gerencie e monitore o processamento de mensagens WhatsApp e e-mail
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
              <div className="text-sm text-muted-foreground">Processando</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Concluídas</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
              <div className="text-sm text-muted-foreground">Falhas</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="messages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="messages">Mensagens</TabsTrigger>
          <TabsTrigger value="actions">Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="search">Buscar</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="ID, tipo, destinatário..."
                      className="pl-8"
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="processing">Processando</SelectItem>
                      <SelectItem value="completed">Concluída</SelectItem>
                      <SelectItem value="failed">Falha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="welcome">Boas-vindas</SelectItem>
                      <SelectItem value="reminder">Lembrete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({ status: 'all', type: 'all', priority: 'all', search: '' })}
                    className="w-full"
                  >
                    Limpar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Mensagens */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Mensagens na Fila
                <Badge variant="outline">{filteredMessages.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredMessages.length === 0 ? (
                <div className="text-center py-8">
                  <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma mensagem encontrada</h3>
                  <p className="text-muted-foreground">
                    {messages.length === 0 
                      ? 'A fila está vazia no momento.'
                      : 'Nenhuma mensagem corresponde aos filtros aplicados.'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead>Tentativas</TableHead>
                        <TableHead>Criado</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMessages.map((message) => {
                        const TypeIcon = typeIcons[message.type];
                        return (
                          <TableRow key={message.id}>
                            <TableCell className="font-mono text-xs">
                              {message.id.substring(0, 12)}...
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TypeIcon className="h-4 w-4" />
                                <span className="capitalize">{message.type}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("capitalize", statusColors[message.status])}>
                                {message.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                {message.status === 'processing' && <RefreshCw className="h-3 w-3 mr-1 animate-spin" />}
                                {message.status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
                                {message.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                                {message.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("capitalize", priorityColors[message.priority])}>
                                {message.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {message.data?.to || message.data?.email || message.data?.whatsapp || '-'}
                            </TableCell>
                            <TableCell>
                              <span className={cn(
                                message.attempts >= message.maxAttempts ? 'text-red-600' : 'text-muted-foreground'
                              )}>
                                {message.attempts}/{message.maxAttempts}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(message.createdAt), {
                                addSuffix: true,
                                locale: ptBR
                              })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {message.status === 'failed' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => retryMessage(message.id)}
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                )}
                                {(message.status === 'completed' || message.status === 'failed') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => deleteMessage(message.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Controle da Fila
              </CardTitle>
              <CardDescription>
                Execute ações de controle e manutenção da fila de mensagens
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
                  <div className="font-medium">Reprocessar Falhas</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Tenta enviar novamente as mensagens que falharam
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
                    Remove mensagens antigas para otimizar performance
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleQueueAction('pause')}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  disabled={actionLoading === 'pause'}
                >
                  <div className="font-medium">Pausar Processamento</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Para temporariamente o processamento da fila
                  </div>
                </Button>
                
                <Button
                  onClick={() => handleQueueAction('resume')}
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-start"
                  disabled={actionLoading === 'resume'}
                >
                  <div className="font-medium">Retomar Processamento</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Retoma o processamento da fila de mensagens
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alertas de Segurança */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> Para evitar banimento do WhatsApp, mantenha intervalos adequados entre envios.
              O sistema já implementa controles de rate limiting, mas monitore sempre a performance.
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
