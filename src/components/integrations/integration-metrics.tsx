'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Activity, Zap, Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { NATVService } from '@/services/natv.service';
import Gates2bService from '@/services/gates2b.service';

interface IntegrationMetric {
  id: string;
  name: string;
  value: string | number;
  status: 'success' | 'warning' | 'error' | 'info';
  lastUpdate: Date;
  description?: string;
}

interface IntegrationMetricsProps {
  className?: string;
}

export function IntegrationMetrics({ className }: IntegrationMetricsProps) {
  const [metrics, setMetrics] = useState<IntegrationMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refreshMetrics = async () => {
    setLoading(true);
    
    try {
      const natvService = new NATVService();
      const gates2bService = new Gates2bService();
      const newMetrics: IntegrationMetric[] = [];

      // Verificar conectividade NATV
      if (natvService.isConfigured()) {
        try {
          const testResponse = await natvService.testConnection();
          newMetrics.push({
            id: 'natv-connectivity',
            name: 'NATV API',
            value: testResponse.success ? 'Online' : 'Offline',
            status: testResponse.success ? 'success' : 'error',
            lastUpdate: new Date(),
            description: 'Status da conectividade com a API NATV'
          });

          // Obter informações do revendedor
          if (testResponse.success) {
            const ownerResponse = await natvService.getOwnerInfo();
            if (ownerResponse.success && ownerResponse.data) {
              newMetrics.push({
                id: 'natv-owner',
                name: 'Revendedor NATV',
                value: ownerResponse.data.username,
                status: 'info',
                lastUpdate: new Date(),
                description: 'Nome do revendedor NATV'
              });
            }
          }
        } catch (error) {
          newMetrics.push({
            id: 'natv-connectivity',
            name: 'NATV API',
            value: 'Erro',
            status: 'error',
            lastUpdate: new Date(),
            description: 'Erro ao conectar com a API NATV'
          });
        }
      }

      // Verificar conectividade Gates2b
      if (gates2bService.isConfigured()) {
        try {
          const testResponse = await gates2bService.testConnection();
          newMetrics.push({
            id: 'gates2b-connectivity',
            name: 'Gates2b API',
            value: testResponse.success ? 'Online' : 'Offline',
            status: testResponse.success ? 'success' : 'error',
            lastUpdate: new Date(),
            description: 'Status da conectividade com a API Gates2b'
          });

          // Obter estatísticas Gates2b
          if (testResponse.success) {
            try {
              const statsResponse = await gates2bService.getPaymentStats();
              if (statsResponse.success && statsResponse.data) {
                newMetrics.push({
                  id: 'gates2b-payments',
                  name: 'Pagamentos Gates2b',
                  value: statsResponse.data.total_payments || 0,
                  status: 'info',
                  lastUpdate: new Date(),
                  description: 'Total de pagamentos processados'
                });
              }
            } catch (error) {
              console.error('Erro ao obter estatísticas Gates2b:', error);
            }
          }
        } catch (error) {
          newMetrics.push({
            id: 'gates2b-connectivity',
            name: 'Gates2b API',
            value: 'Erro',
            status: 'error',
            lastUpdate: new Date(),
            description: 'Erro ao conectar com a API Gates2b'
          });
        }
      }

      // Adicionar métricas de rate limiting
      const rateLimitInfo = {
        id: 'natv-rate-limit',
        name: 'Rate Limit NATV',
        value: '1 req/150ms',
        status: 'info' as const,
        lastUpdate: new Date(),
        description: 'Limite de requisições da API NATV'
      };
      newMetrics.push(rateLimitInfo);

      setMetrics(newMetrics);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Erro ao atualizar métricas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, []);

  const getStatusIcon = (status: IntegrationMetric['status'], metricId?: string) => {
    // Ícones específicos para certas métricas
    if (metricId?.includes('gates2b')) {
      switch (status) {
        case 'success':
          return <CreditCard className="h-4 w-4 text-green-500" />;
        case 'error':
          return <CreditCard className="h-4 w-4 text-red-500" />;
        default:
          return <CreditCard className="h-4 w-4 text-blue-500" />;
      }
    }

    switch (status) {
      case 'success':
        return <Activity className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'info':
      default:
        return <Zap className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: IntegrationMetric['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'info':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatLastRefresh = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (metrics.length === 0 && !loading) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Status das Integrações
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshMetrics}
          disabled={loading}
          className="px-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {metrics.map((metric) => (
            <div key={metric.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(metric.status, metric.id)}
                <div>
                  <p className="text-sm font-medium">{metric.name}</p>
                  {metric.description && (
                    <p className="text-xs text-muted-foreground">{metric.description}</p>
                  )}
                </div>
              </div>
              <Badge className={getStatusColor(metric.status)} variant="outline">
                {metric.value}
              </Badge>
            </div>
          ))}
          
          {lastRefresh && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Atualizado às {formatLastRefresh(lastRefresh)}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default IntegrationMetrics;
