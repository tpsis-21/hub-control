'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserSupabaseClient } from "@/lib/supabase/clients/browser";
import { useToast } from '@/hooks/use-toast';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<NotificationPermission>;
}

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();
  const supabase = createBrowserSupabaseClient();

  // Verificar suporte a notificações push
  useEffect(() => {
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        checkSubscription();
      }
    };

    checkSupport();
  }, []);

  // Verificar se já está inscrito
  const checkSubscription = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Erro ao verificar subscription:', error);
      setIsSubscribed(false);
    }
  }, []);

  // Registrar service worker
  const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', registration);
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar o service worker',
        variant: 'destructive'
      });
      return null;
    }
  }, [toast]);

  // Solicitar permissão
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast({
          title: 'Permissão concedida',
          description: 'Você receberá notificações push'
        });
      } else if (result === 'denied') {
        toast({
          title: 'Permissão negada',
          description: 'Você não receberá notificações push',
          variant: 'destructive'
        });
      }
      
      return result;
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível solicitar permissão para notificações',
        variant: 'destructive'
      });
      return 'denied';
    }
  }, [toast]);

  // Converter VAPID key para Uint8Array
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  // Inscrever-se para notificações push
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push',
        variant: 'destructive'
      });
      return false;
    }

    if (!VAPID_PUBLIC_KEY) {
      toast({
        title: 'Configuração incompleta',
        description: 'Chave VAPID não configurada',
        variant: 'destructive'
      });
      return false;
    }

    setIsLoading(true);

    try {
      // Solicitar permissão se necessário
      if (permission !== 'granted') {
        const newPermission = await requestPermission();
        if (newPermission !== 'granted') {
          setIsLoading(false);
          return false;
        }
      }

      // Registrar service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        setIsLoading(false);
        return false;
      }

      // Criar subscription
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Salvar subscription no banco de dados
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
        }
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh_key: subscriptionData.keys.p256dh,
          auth_key: subscriptionData.keys.auth,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      setIsSubscribed(true);
      toast({
        title: 'Sucesso',
        description: 'Notificações push ativadas com sucesso!'
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao inscrever-se:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível ativar as notificações push',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestPermission, registerServiceWorker, urlBase64ToUint8Array, supabase, toast]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remover do banco de dados
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id);

        if (error) {
          console.error('Erro ao remover subscription do banco:', error);
        }
      }

      setIsSubscribed(false);
      toast({
        title: 'Sucesso',
        description: 'Notificações push desativadas'
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível desativar as notificações push',
        variant: 'destructive'
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission
  };
}