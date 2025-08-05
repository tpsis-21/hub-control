'use client';

import React, { useState } from 'react';
import { Bell, Send, Users, Building, Globe, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificationCenter } from '@/components/app/NotificationCenter';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';

/**
 * Exemplo de implementação completa do sistema de notificações push
 * Este componente demonstra como usar todas as funcionalidades disponíveis
 */
export function PushNotificationsExample() {
  const [notificationData, setNotificationData] = useState({
    type: 'user',
    title: '',
    body: '',
    userId: '',
    userIds: '',
    empresaId: '',
    tag: '',
    url: '',
    requireInteraction: false
  });
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe
  } = usePushNotifications();

  const sendNotification = async () => {
    if (!notificationData.title || !notificationData.body) {
      toast({
        title: 'Erro',
        description: 'Título e corpo são obrigatórios',
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);

    try {
      let targets = {};

      switch (notificationData.type) {
        case 'user':
          if (!notificationData.userId) {
            throw new Error('ID do usuário é obrigatório');
          }
          targets = { userId: notificationData.userId };
          break;
        case 'users':
          if (!notificationData.userIds) {
            throw new Error('IDs dos usuários são obrigatórios');
          }
          targets = { userIds: notificationData.userIds.split(',').map(id => id.trim()) };
          break;
        case 'company':
          if (!notificationData.empresaId) {
            throw new Error('ID da empresa é obrigatório');
          }
          targets = { empresaId: notificationData.empresaId };
          break;
        case 'all':
          targets = {};
          break;
      }

      const response = await fetch('/api/push-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: notificationData.type,
          targets,
          payload: {
            title: notificationData.title,
            body: notificationData.body,
            tag: notificationData.tag || 'general',
            url: notificationData.url || '/',
            requireInteraction: notificationData.requireInteraction,
            data: {
              timestamp: new Date().toISOString(),
              source: 'admin-panel'
            }
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao enviar notificação');
      }

      const result = await response.json();
      
      toast({
        title: 'Notificação enviada',
        description: `Resultado: ${JSON.stringify(result.result)}`
      });

      // Limpar formulário
      setNotificationData({
        ...notificationData,
        title: '',
        body: '',
        userId: '',
        userIds: '',
        empresaId: ''
      });

    } catch (error: any) {
      console.error('Erro ao enviar notificação:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível enviar a notificação',
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const sendTestNotifications = async () => {
    const testNotifications = [
      {
        title: 'Pagamento Recebido',
        body: 'Você recebeu um pagamento de R$ 150,00',
        tag: 'payment',
        url: '/pagamentos'
      },
      {
        title: 'Novo Cliente',
        body: 'João Silva foi adicionado como cliente',
        tag: 'client',
        url: '/clientes'
      },
      {
        title: 'Atualização do Sistema',
        body: 'Nova versão disponível com melhorias',
        tag: 'system',
        requireInteraction: true
      }
    ];

    for (const notification of testNotifications) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Delay entre notificações
      
      try {
        await fetch('/api/push-notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'user',
            targets: { userId: 'current-user' }, // Será substituído pelo ID real no backend
            payload: notification
          })
        });
      } catch (error) {
        console.error('Erro ao enviar notificação de teste:', error);
      }
    }

    toast({
      title: 'Testes enviados',
      description: 'Série de notificações de teste enviadas'
    });
  };

  return (
    <div className="space-y-6">
      {/* Status das Notificações Push */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Status das Notificações Push
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <Badge variant={isSupported ? 'default' : 'destructive'}>
                {isSupported ? 'Suportado' : 'Não Suportado'}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Suporte do Navegador</p>
            </div>
            <div className="text-center">
              <Badge variant={permission === 'granted' ? 'default' : permission === 'denied' ? 'destructive' : 'secondary'}>
                {permission === 'granted' ? 'Permitido' : permission === 'denied' ? 'Negado' : 'Pendente'}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Permissão</p>
            </div>
            <div className="text-center">
              <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                {isSubscribed ? 'Inscrito' : 'Não Inscrito'}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">Subscription</p>
            </div>
            <div className="text-center">
              <div className="flex gap-2 justify-center">
                {!isSubscribed ? (
                  <Button size="sm" onClick={subscribe}>
                    Ativar
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={unsubscribe}>
                    Desativar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="send" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="send">Enviar Notificação</TabsTrigger>
          <TabsTrigger value="center">Central de Notificações</TabsTrigger>
        </TabsList>

        <TabsContent value="send" className="space-y-4">
          {/* Formulário de Envio */}
          <Card>
            <CardHeader>
              <CardTitle>Enviar Notificação Push</CardTitle>
              <CardDescription>
                Teste o sistema de notificações enviando mensagens personalizadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo de Notificação */}
              <div className="space-y-2">
                <Label htmlFor="type">Tipo de Notificação</Label>
                <Select
                  value={notificationData.type}
                  onValueChange={(value) => setNotificationData({ ...notificationData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Usuário Específico
                      </div>
                    </SelectItem>
                    <SelectItem value="users">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Múltiplos Usuários
                      </div>
                    </SelectItem>
                    <SelectItem value="company">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Empresa
                      </div>
                    </SelectItem>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Todos os Usuários
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Campos condicionais baseados no tipo */}
              {notificationData.type === 'user' && (
                <div className="space-y-2">
                  <Label htmlFor="userId">ID do Usuário</Label>
                  <Input
                    id="userId"
                    value={notificationData.userId}
                    onChange={(e) => setNotificationData({ ...notificationData, userId: e.target.value })}
                    placeholder="UUID do usuário"
                  />
                </div>
              )}

              {notificationData.type === 'users' && (
                <div className="space-y-2">
                  <Label htmlFor="userIds">IDs dos Usuários</Label>
                  <Input
                    id="userIds"
                    value={notificationData.userIds}
                    onChange={(e) => setNotificationData({ ...notificationData, userIds: e.target.value })}
                    placeholder="UUID1, UUID2, UUID3..."
                  />
                  <p className="text-sm text-gray-600">Separe múltiplos IDs com vírgula</p>
                </div>
              )}

              {notificationData.type === 'company' && (
                <div className="space-y-2">
                  <Label htmlFor="empresaId">ID da Empresa</Label>
                  <Input
                    id="empresaId"
                    value={notificationData.empresaId}
                    onChange={(e) => setNotificationData({ ...notificationData, empresaId: e.target.value })}
                    placeholder="UUID da empresa"
                  />
                </div>
              )}

              {/* Conteúdo da Notificação */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={notificationData.title}
                    onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                    placeholder="Título da notificação"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tag">Tag</Label>
                  <Input
                    id="tag"
                    value={notificationData.tag}
                    onChange={(e) => setNotificationData({ ...notificationData, tag: e.target.value })}
                    placeholder="payment, client, system..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Mensagem *</Label>
                <Textarea
                  id="body"
                  value={notificationData.body}
                  onChange={(e) => setNotificationData({ ...notificationData, body: e.target.value })}
                  placeholder="Corpo da mensagem"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">URL (opcional)</Label>
                <Input
                  id="url"
                  value={notificationData.url}
                  onChange={(e) => setNotificationData({ ...notificationData, url: e.target.value })}
                  placeholder="/pagamentos, /clientes..."
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={sendNotification} 
                  disabled={isSending || !notificationData.title || !notificationData.body}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSending ? 'Enviando...' : 'Enviar Notificação'}
                </Button>
                <Button 
                  onClick={sendTestNotifications} 
                  variant="outline"
                >
                  <TestTube className="h-4 w-4 mr-2" />
                  Testes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="center">
          <NotificationCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}