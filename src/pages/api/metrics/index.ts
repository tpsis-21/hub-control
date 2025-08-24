/**
 * Endpoint de métricas centralizadas para monitoramento em produção
 * Coleta e expõe métricas do sistema, BPIX e performance
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  requests: {
    total: number;
    errors: number;
    rate: number;
  };
}

interface BpixMetrics {
  payments: {
    total: number;
    successful: number;
    failed: number;
    pending: number;
    total_amount: number;
  };
  webhooks: {
    received: number;
    processed: number;
    failed: number;
  };
  api_calls: {
    total: number;
    successful: number;
    failed: number;
    avg_response_time: number;
  };
}

interface ApplicationMetrics {
  users: {
    total: number;
    active_today: number;
    active_this_week: number;
  };
  channels: {
    total: number;
    active: number;
  };
  streams: {
    total: number;
    live: number;
  };
}

interface MetricsResponse {
  status: 'success' | 'error';
  timestamp: string;
  system: SystemMetrics;
  bpix: BpixMetrics;
  application: ApplicationMetrics;
  alerts: Array<{
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: string;
  }>;
}

/**
 * Coleta métricas do sistema
 */
function getSystemMetrics(): SystemMetrics {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal + memUsage.external;
  const usedMemory = memUsage.heapUsed;
  
  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: usedMemory,
      total: totalMemory,
      percentage: (usedMemory / totalMemory) * 100,
    },
    cpu: {
      usage: process.cpuUsage().user / 1000000, // Convert to seconds
    },
    requests: {
      total: 0, // Implementar contador de requisições
      errors: 0, // Implementar contador de erros
      rate: 0, // Implementar taxa de requisições
    },
  };
}

/**
 * Coleta métricas do BPIX
 */
async function getBpixMetrics(): Promise<BpixMetrics> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Métricas de pagamentos (últimas 24h)
    const { data: payments, error: paymentsError } = await supabase
      .from('bpix_payments')
      .select('status, amount')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (paymentsError) {
      console.error('Erro ao buscar métricas de pagamentos:', paymentsError);
    }

    // Métricas de webhooks (últimas 24h)
    const { data: webhooks, error: webhooksError } = await supabase
      .from('bpix_webhooks')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (webhooksError) {
      console.error('Erro ao buscar métricas de webhooks:', webhooksError);
    }

    // Calcular métricas de pagamentos
    const paymentMetrics = {
      total: payments?.length || 0,
      successful: payments?.filter(p => p.status === 'completed').length || 0,
      failed: payments?.filter(p => p.status === 'failed').length || 0,
      pending: payments?.filter(p => p.status === 'pending').length || 0,
      total_amount: payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0,
    };

    // Calcular métricas de webhooks
    const webhookMetrics = {
      received: webhooks?.length || 0,
      processed: webhooks?.filter(w => w.status === 'processed').length || 0,
      failed: webhooks?.filter(w => w.status === 'failed').length || 0,
    };

    return {
      payments: paymentMetrics,
      webhooks: webhookMetrics,
      api_calls: {
        total: 0, // Implementar contador de chamadas API
        successful: 0,
        failed: 0,
        avg_response_time: 0,
      },
    };
  } catch (error) {
    console.error('Erro ao coletar métricas BPIX:', error);
    return {
      payments: {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0,
        total_amount: 0,
      },
      webhooks: {
        received: 0,
        processed: 0,
        failed: 0,
      },
      api_calls: {
        total: 0,
        successful: 0,
        failed: 0,
        avg_response_time: 0,
      },
    };
  }
}

/**
 * Coleta métricas da aplicação
 */
async function getApplicationMetrics(): Promise<ApplicationMetrics> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Métricas de usuários
    const { data: users } = await supabase
      .from('profiles')
      .select('id, last_sign_in_at');

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const activeToday = users?.filter(u => 
      u.last_sign_in_at && new Date(u.last_sign_in_at) >= today
    ).length || 0;

    const activeThisWeek = users?.filter(u => 
      u.last_sign_in_at && new Date(u.last_sign_in_at) >= weekAgo
    ).length || 0;

    // Métricas de canais
    const { data: channels } = await supabase
      .from('channels')
      .select('id, status');

    // Métricas de streams
    const { data: streams } = await supabase
      .from('streams')
      .select('id, status');

    return {
      users: {
        total: users?.length || 0,
        active_today: activeToday,
        active_this_week: activeThisWeek,
      },
      channels: {
        total: channels?.length || 0,
        active: channels?.filter(c => c.status === 'active').length || 0,
      },
      streams: {
        total: streams?.length || 0,
        live: streams?.filter(s => s.status === 'live').length || 0,
      },
    };
  } catch (error) {
    console.error('Erro ao coletar métricas da aplicação:', error);
    return {
      users: {
        total: 0,
        active_today: 0,
        active_this_week: 0,
      },
      channels: {
        total: 0,
        active: 0,
      },
      streams: {
        total: 0,
        live: 0,
      },
    };
  }
}

/**
 * Gera alertas baseados nas métricas
 */
function generateAlerts(
  system: SystemMetrics,
  bpix: BpixMetrics,
  application: ApplicationMetrics
) {
  const alerts = [];

  // Alertas de sistema
  if (system.memory.percentage > 90) {
    alerts.push({
      level: 'critical' as const,
      message: `Uso de memória crítico: ${system.memory.percentage.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  } else if (system.memory.percentage > 80) {
    alerts.push({
      level: 'warning' as const,
      message: `Uso de memória alto: ${system.memory.percentage.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  // Alertas BPIX
  const bpixErrorRate = bpix.payments.total > 0 ? 
    (bpix.payments.failed / bpix.payments.total) * 100 : 0;

  if (bpixErrorRate > 10) {
    alerts.push({
      level: 'critical' as const,
      message: `Taxa de erro BPIX crítica: ${bpixErrorRate.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  } else if (bpixErrorRate > 5) {
    alerts.push({
      level: 'warning' as const,
      message: `Taxa de erro BPIX elevada: ${bpixErrorRate.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  // Alertas de webhook
  const webhookErrorRate = bpix.webhooks.received > 0 ? 
    (bpix.webhooks.failed / bpix.webhooks.received) * 100 : 0;

  if (webhookErrorRate > 20) {
    alerts.push({
      level: 'warning' as const,
      message: `Taxa de erro de webhooks alta: ${webhookErrorRate.toFixed(1)}%`,
      timestamp: new Date().toISOString(),
    });
  }

  // Alertas informativos
  if (bpix.payments.total > 100) {
    alerts.push({
      level: 'info' as const,
      message: `Alto volume de transações: ${bpix.payments.total} nas últimas 24h`,
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * Handler principal
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<MetricsResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Coleta todas as métricas em paralelo
    const [systemMetrics, bpixMetrics, applicationMetrics] = await Promise.all([
      Promise.resolve(getSystemMetrics()),
      getBpixMetrics(),
      getApplicationMetrics(),
    ]);

    // Gera alertas
    const alerts = generateAlerts(systemMetrics, bpixMetrics, applicationMetrics);

    const response: MetricsResponse = {
      status: 'success',
      timestamp: new Date().toISOString(),
      system: systemMetrics,
      bpix: bpixMetrics,
      application: applicationMetrics,
      alerts,
    };

    // Cache por 30 segundos
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.status(200).json(response);
  } catch (error) {
    console.error('Erro ao coletar métricas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor ao coletar métricas',
    });
  }
}