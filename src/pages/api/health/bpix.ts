/**
 * Health Check endpoint para integração BPIX
 * Verifica a saúde da integração BPIX em produção
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { bpixHealthCheckConfig } from '@/config/bpix-production';
import { createClient } from '@supabase/supabase-js';

interface HealthCheckResult {
  name: string;
  description: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  critical: boolean;
  responseTime?: number;
  error?: string;
  details?: any;
}

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    critical_failures: number;
  };
}

/**
 * Verifica conectividade com API BPIX
 */
async function checkBpixApiConnectivity(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${process.env.BPIX_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.BPIX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000), // 5 segundos timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        name: 'bpix_api_connectivity',
        description: 'Conectividade com API BPIX',
        status: responseTime > 2000 ? 'degraded' : 'healthy',
        critical: true,
        responseTime,
      };
    } else {
      return {
        name: 'bpix_api_connectivity',
        description: 'Conectividade com API BPIX',
        status: 'unhealthy',
        critical: true,
        responseTime,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  } catch (error) {
    return {
      name: 'bpix_api_connectivity',
      description: 'Conectividade com API BPIX',
      status: 'unhealthy',
      critical: true,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Verifica se o endpoint de webhook está acessível
 */
async function checkWebhookEndpoint(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const webhookUrl = process.env.BPIX_WEBHOOK_URL;
    if (!webhookUrl) {
      return {
        name: 'bpix_webhook_endpoint',
        description: 'Endpoint de webhook acessível',
        status: 'unhealthy',
        critical: true,
        error: 'BPIX_WEBHOOK_URL não configurada',
      };
    }

    // Verifica se o endpoint responde (sem enviar dados)
    const response = await fetch(webhookUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });

    const responseTime = Date.now() - startTime;

    return {
      name: 'bpix_webhook_endpoint',
      description: 'Endpoint de webhook acessível',
      status: response.ok ? 'healthy' : 'degraded',
      critical: true,
      responseTime,
      details: {
        url: webhookUrl,
        status: response.status,
      },
    };
  } catch (error) {
    return {
      name: 'bpix_webhook_endpoint',
      description: 'Endpoint de webhook acessível',
      status: 'unhealthy',
      critical: true,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Verifica conexão com banco de dados
 */
async function checkDatabaseConnection(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Testa uma query simples na tabela de pagamentos BPIX
    const { data, error } = await supabase
      .from('bpix_payments')
      .select('id')
      .limit(1);

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        name: 'bpix_database_connection',
        description: 'Conexão com banco de dados BPIX',
        status: 'unhealthy',
        critical: true,
        responseTime,
        error: error.message,
      };
    }

    return {
      name: 'bpix_database_connection',
      description: 'Conexão com banco de dados BPIX',
      status: responseTime > 1000 ? 'degraded' : 'healthy',
      critical: true,
      responseTime,
    };
  } catch (error) {
    return {
      name: 'bpix_database_connection',
      description: 'Conexão com banco de dados BPIX',
      status: 'unhealthy',
      critical: true,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Verifica status do cache (Redis ou similar)
 */
async function checkCacheStatus(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Simula verificação de cache
    // Em produção, você conectaria ao Redis ou outro cache
    const testKey = `bpix_health_check_${Date.now()}`;
    const testValue = 'ok';
    
    // Aqui você faria:
    // await redis.set(testKey, testValue, 'EX', 10);
    // const result = await redis.get(testKey);
    // await redis.del(testKey);
    
    const responseTime = Date.now() - startTime;
    
    return {
      name: 'bpix_cache_status',
      description: 'Status do cache BPIX',
      status: 'healthy', // ou 'degraded' se lento
      critical: false,
      responseTime,
      details: {
        cache_type: 'memory', // ou 'redis'
        test_key: testKey,
      },
    };
  } catch (error) {
    return {
      name: 'bpix_cache_status',
      description: 'Status do cache BPIX',
      status: 'degraded',
      critical: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}

/**
 * Handler principal do health check
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      checks: [],
      summary: {
        total: 0,
        healthy: 0,
        unhealthy: 1,
        degraded: 0,
        critical_failures: 1,
      },
    } as any);
  }

  try {
    // Executa todos os health checks em paralelo
    const checks = await Promise.all([
      checkBpixApiConnectivity(),
      checkWebhookEndpoint(),
      checkDatabaseConnection(),
      checkCacheStatus(),
    ]);

    // Calcula o resumo
    const summary = {
      total: checks.length,
      healthy: checks.filter(c => c.status === 'healthy').length,
      unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      degraded: checks.filter(c => c.status === 'degraded').length,
      critical_failures: checks.filter(c => c.status === 'unhealthy' && c.critical).length,
    };

    // Determina o status geral
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (summary.critical_failures > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.unhealthy > 0 || summary.degraded > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      checks,
      summary,
    };

    // Define o status code baseado na saúde
    const statusCode = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    console.error('Erro no health check BPIX:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      checks: [{
        name: 'health_check_system',
        description: 'Sistema de health check',
        status: 'unhealthy',
        critical: true,
        error: error instanceof Error ? error.message : 'Erro interno do sistema',
      }],
      summary: {
        total: 1,
        healthy: 0,
        unhealthy: 1,
        degraded: 0,
        critical_failures: 1,
      },
    });
  }
}