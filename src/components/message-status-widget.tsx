// @/components/message-status-widget.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Mail, Phone, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface MessageStats {
  queue: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  reminders: {
    isRunning: boolean;
    expiringClients: number;
    expiredClients: number;
  };
  connectivity: {
    email: boolean;
    whatsapp: boolean;
  };
}

export function MessageStatusWidget({ autoRefresh = false, refreshInterval = 300 }: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}) {
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/messages/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregamento inicial
  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-refresh apenas se habilitado e com intervalo mínimo de 5 minutos
  useEffect(() => {
    if (!autoRefresh || refreshInterval < 300) return;
    
    const interval = setInterval(fetchStats, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sistema de Mensagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Sistema de Mensagens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">
            Erro ao carregar estatísticas
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Sistema de Mensagens
        </CardTitle>
        <CardDescription>
          Status dos serviços de comunicação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conectividade dos Serviços */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Conectividade:</span>
          <div className="flex gap-2">
            <Badge variant={stats.connectivity.email ? "default" : "destructive"} className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              E-mail {stats.connectivity.email ? 'OK' : 'Erro'}
            </Badge>
            <Badge variant={stats.connectivity.whatsapp ? "default" : "destructive"} className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              WhatsApp {stats.connectivity.whatsapp ? 'OK' : 'Erro'}
            </Badge>
          </div>
        </div>

        {/* Fila de Mensagens */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Fila de Mensagens:</span>
            <Badge variant="outline">{stats.queue.total} total</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-yellow-500" />
              {stats.queue.pending} pendentes
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              {stats.queue.completed} concluídas
            </div>
            {stats.queue.failed > 0 && (
              <div className="flex items-center gap-1 col-span-2">
                <XCircle className="h-3 w-3 text-red-500" />
                {stats.queue.failed} falhas
              </div>
            )}
          </div>
        </div>

        {/* Serviço de Lembretes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Lembretes:</span>
            <Badge variant={stats.reminders.isRunning ? "default" : "destructive"}>
              {stats.reminders.isRunning ? 'Ativo' : 'Inativo'}
            </Badge>
          </div>
          {(stats.reminders.expiringClients > 0 || stats.reminders.expiredClients > 0) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {stats.reminders.expiringClients > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 text-yellow-500" />
                  {stats.reminders.expiringClients} vencendo
                </div>
              )}
              {stats.reminders.expiredClients > 0 && (
                <div className="flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  {stats.reminders.expiredClients} vencidos
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botão para Administração */}
        <div className="pt-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/admin/mensagens">
              Gerenciar Sistema
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
