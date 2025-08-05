'use client';

import React from 'react';
import { Bell, BellOff, Smartphone, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface PushNotificationSettingsProps {
  className?: string;
}

export function PushNotificationSettings({ className }: PushNotificationSettingsProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission
  } = usePushNotifications();

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted':
        return <Badge variant="default" className="bg-green-500">Permitido</Badge>;
      case 'denied':
        return <Badge variant="destructive">Negado</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (isSubscribed) {
      return <Bell className="h-5 w-5 text-green-500" />;
    }
    return <BellOff className="h-5 w-5 text-gray-400" />;
  };

  if (!isSupported) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Configure as notificações push para receber alertas em tempo real
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Seu navegador não suporta notificações push. Considere atualizar para uma versão mais recente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Notificações Push
        </CardTitle>
        <CardDescription>
          Configure as notificações push para receber alertas em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status atual */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div>
            <p className="font-medium">Status das Notificações</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSubscribed ? 'Ativadas e funcionando' : 'Desativadas'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getPermissionBadge()}
            {isSubscribed && (
              <Badge variant="default" className="bg-blue-500">
                Ativo
              </Badge>
            )}
          </div>
        </div>

        {/* Informações sobre permissões */}
        {permission === 'denied' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              As notificações foram bloqueadas. Para ativá-las, você precisa permitir notificações nas configurações do seu navegador.
            </AlertDescription>
          </Alert>
        )}

        {permission === 'default' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Clique em "Ativar Notificações" para permitir que o Hub Control envie notificações push.
            </AlertDescription>
          </Alert>
        )}

        {/* Benefícios das notificações push */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Benefícios das Notificações Push:</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Receba alertas de pagamentos em tempo real</li>
            <li>• Notificações de novos clientes e atualizações</li>
            <li>• Alertas de sistema e manutenção</li>
            <li>• Funciona mesmo com o navegador fechado</li>
          </ul>
        </div>

        {/* Botões de ação */}
        <div className="flex gap-2">
          {!isSubscribed ? (
            <>
              {permission === 'default' && (
                <Button
                  onClick={requestPermission}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Permitir Notificações
                </Button>
              )}
              {permission === 'granted' && (
                <Button
                  onClick={subscribe}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isLoading ? 'Ativando...' : 'Ativar Notificações'}
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={unsubscribe}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <BellOff className="h-4 w-4 mr-2" />
              {isLoading ? 'Desativando...' : 'Desativar Notificações'}
            </Button>
          )}
        </div>

        {/* Informações técnicas */}
        <div className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t">
          <p>As notificações push funcionam através de Service Workers e são seguras.</p>
          <p>Você pode desativar a qualquer momento.</p>
        </div>
      </CardContent>
    </Card>
  );
}