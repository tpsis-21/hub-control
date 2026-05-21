import { NextRequest, NextResponse } from 'next/server';
import { systemMonitor, MonitoringUtils } from '@/lib/monitoring';
import { LoggerService } from '@/services/logger.service';
import { requireApiAdmin } from '@/lib/api-auth';

/**
 * API para monitoramento do sistema
 * 
 * GET: Retorna estatísticas de monitoramento
 * POST: Cria um alerta manual
 * DELETE: Limpa métricas de monitoramento
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    
    let response: any = {};
    
    if (type === 'all' || type === 'datasource' || type === 'data-source') {
      response.dataSource = systemMonitor.getDataSourceMetrics();
    }
    
    if (type === 'all' || type === 'performance') {
      response.performance = systemMonitor.getPerformanceMetrics();
    }
    
    if (type === 'all' || type === 'alerts') {
      response.alerts = systemMonitor.getAlerts();
    }
    
    if (type === 'all' || type === 'summary') {
      const dataSourceMetrics = systemMonitor.getDataSourceMetrics();
      const performanceMetrics = systemMonitor.getPerformanceMetrics();
      const alerts = systemMonitor.getAlerts();
      
      response.summary = {
        totalRequests: dataSourceMetrics.realDataUsage + dataSourceMetrics.mockDataUsage,
        realDataPercentage: dataSourceMetrics.realDataUsage > 0 
          ? Math.round((dataSourceMetrics.realDataUsage / (dataSourceMetrics.realDataUsage + dataSourceMetrics.mockDataUsage)) * 100)
          : 0,
        mockDataPercentage: dataSourceMetrics.mockDataUsage > 0
          ? Math.round((dataSourceMetrics.mockDataUsage / (dataSourceMetrics.realDataUsage + dataSourceMetrics.mockDataUsage)) * 100)
          : 0,
        averageResponseTime: performanceMetrics.averageResponseTime,
        cacheHitRate: performanceMetrics.cacheHits > 0
          ? Math.round((performanceMetrics.cacheHits / (performanceMetrics.cacheHits + performanceMetrics.cacheMisses)) * 100)
          : 0,
        activeAlerts: alerts.filter(alert => alert.type === 'ERROR' || alert.type === 'WARNING').length,
        lastUpdated: new Date().toISOString()
      };
    }
    
    LoggerService.info(
      'Métricas de monitoramento consultadas',
      'api/monitoring',
      { type, metricsRequested: Object.keys(response) }
    );
    
    return NextResponse.json({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    LoggerService.error(
      'Erro ao consultar métricas de monitoramento',
      'api/monitoring',
      error
    );
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível consultar as métricas de monitoramento'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { level, message, metadata } = body;
    
    if (!level || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parâmetros inválidos',
          message: 'Level e message são obrigatórios'
        },
        { status: 400 }
      );
    }
    
    if (!['INFO', 'WARNING', 'ERROR'].includes(level)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Level inválido',
          message: 'Level deve ser INFO, WARNING ou ERROR'
        },
        { status: 400 }
      );
    }
    
    const alert = MonitoringUtils.createAlert(level, message, metadata || {});
    
    LoggerService.info(
      'Alerta manual criado',
      'api/monitoring',
      { alertId: alert.id, level, message }
    );
    
    return NextResponse.json({
      success: true,
      alert,
      message: 'Alerta criado com sucesso'
    });
    
  } catch (error) {
    LoggerService.error(
      'Erro ao criar alerta manual',
      'api/monitoring',
      error
    );
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível criar o alerta'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    
    let clearedItems: string[] = [];
    
    if (type === 'all' || type === 'datasource') {
      systemMonitor.clearDataSourceMetrics();
      clearedItems.push('dataSource');
    }
    
    if (type === 'all' || type === 'performance') {
      systemMonitor.clearPerformanceMetrics();
      clearedItems.push('performance');
    }
    
    if (type === 'all' || type === 'alerts') {
      systemMonitor.clearAlerts();
      clearedItems.push('alerts');
    }
    
    LoggerService.info(
      'Métricas de monitoramento limpas',
      'api/monitoring',
      { type, clearedItems }
    );
    
    return NextResponse.json({
      success: true,
      message: `Métricas limpas: ${clearedItems.join(', ')}`,
      clearedItems,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    LoggerService.error(
      'Erro ao limpar métricas de monitoramento',
      'api/monitoring',
      error
    );
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor',
        message: 'Não foi possível limpar as métricas'
      },
      { status: 500 }
    );
  }
}
