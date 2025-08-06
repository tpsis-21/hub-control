'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Settings, X, Check, AlertCircle, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { InAppNotifications } from '@/components/app/notifications/in-app-notifications';
import { PushNotificationSettings } from '@/components/app/PushNotificationSettings';
import { useToast } from '@/hooks/use-toast';
import { createClientSupabaseClient } from '@/lib/supabase-client';

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  payment_alerts: boolean;
  client_updates: boolean;
  system_notifications: boolean;
  marketing_emails: boolean;
}

interface NotificationCenterProps {
  className?: string;
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    in_app_notifications: true,
    payment_alerts: true,
    client_updates: true,
    system_notifications: true,
    marketing_emails: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClientSupabaseClient();

  // Carregar preferências do usuário
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setIsLoading(true);
    // Por enquanto, usar apenas preferências padrão
    // TODO: Implementar persistência de preferências quando a coluna for adicionada
    setIsLoading(false);
  };

  const savePreferences = async () => {
    setIsSaving(true);
    try {
      // Por enquanto, apenas salvar no estado local
      // TODO: Implementar persistência quando a coluna for adicionada
      
      toast({
        title: 'Preferências salvas',
        description: 'Suas configurações de notificação foram atualizadas'
      });
    } catch (error) {
      console.error('Erro ao salvar preferências:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as preferências',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const testNotification = async () => {
    try {
      const response = await fetch('/api/push-notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'user',
          targets: {
            userId: (await supabase.auth.getUser()).data.user?.id
          },
          payload: {
            title: 'Teste de Notificação',
            body: 'Esta é uma notificação de teste do Hub Control',
            tag: 'test',
            data: { type: 'test' },
            url: '/'
          }
        })
      });

      if (response.ok) {
        toast({
          title: 'Notificação enviada',
          description: 'Verifique se recebeu a notificação de teste'
        });
      } else {
        throw new Error('Falha ao enviar notificação');
      }
    } catch (error) {
      console.error('Erro ao testar notificação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a notificação de teste',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Central de Notificações
          </CardTitle>
          <CardDescription>
            Gerencie suas notificações e preferências de comunicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="notifications">Notificações</TabsTrigger>
              <TabsTrigger value="push">Push</TabsTrigger>
              <TabsTrigger value="preferences">Preferências</TabsTrigger>
            </TabsList>

            <TabsContent value="notifications" className="space-y-4">
              <InAppNotifications userId="" />
            </TabsContent>

            <TabsContent value="push" className="space-y-4">
              <PushNotificationSettings />
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Teste de Notificação</CardTitle>
                  <CardDescription>
                    Envie uma notificação de teste para verificar se está funcionando
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={testNotification} variant="outline">
                    <Smartphone className="h-4 w-4 mr-2" />
                    Enviar Teste
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-4">Tipos de Notificação</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="in-app">Notificações no App</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receber notificações dentro da aplicação
                        </p>
                      </div>
                      <Switch
                        id="in-app"
                        checked={preferences.in_app_notifications}
                        onCheckedChange={(checked) => updatePreference('in_app_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push">Notificações Push</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receber notificações push no navegador
                        </p>
                      </div>
                      <Switch
                        id="push"
                        checked={preferences.push_notifications}
                        onCheckedChange={(checked) => updatePreference('push_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email">Notificações por E-mail</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receber notificações importantes por e-mail
                        </p>
                      </div>
                      <Switch
                        id="email"
                        checked={preferences.email_notifications}
                        onCheckedChange={(checked) => updatePreference('email_notifications', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Categorias</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="payments">Alertas de Pagamento</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Notificações sobre pagamentos recebidos
                        </p>
                      </div>
                      <Switch
                        id="payments"
                        checked={preferences.payment_alerts}
                        onCheckedChange={(checked) => updatePreference('payment_alerts', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="clients">Atualizações de Clientes</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Notificações sobre novos clientes e atualizações
                        </p>
                      </div>
                      <Switch
                        id="clients"
                        checked={preferences.client_updates}
                        onCheckedChange={(checked) => updatePreference('client_updates', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="system">Notificações do Sistema</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Atualizações importantes do sistema
                        </p>
                      </div>
                      <Switch
                        id="system"
                        checked={preferences.system_notifications}
                        onCheckedChange={(checked) => updatePreference('system_notifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="marketing">E-mails de Marketing</Label>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Novidades, dicas e promoções
                        </p>
                      </div>
                      <Switch
                        id="marketing"
                        checked={preferences.marketing_emails}
                        onCheckedChange={(checked) => updatePreference('marketing_emails', checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={savePreferences} 
                    disabled={isSaving}
                    className="min-w-[120px]"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Salvar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}