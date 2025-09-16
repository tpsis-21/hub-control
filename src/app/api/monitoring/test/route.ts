import { NextRequest, NextResponse } from 'next/server';
import { systemMonitor } from '@/lib/monitoring';

/**
 * Endpoint de teste para debug do sistema de monitoramento
 */
export async function GET(request: NextRequest) {
  try {
    // Teste básico de inicialização
    const testResult: any = {
      systemMonitorExists: !!systemMonitor,
      systemMonitorType: typeof systemMonitor,
      systemMonitorKeys: Object.getOwnPropertyNames(systemMonitor),
      systemMonitorMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(systemMonitor)),
      timestamp: new Date().toISOString()
    };

    // Teste de métodos básicos primeiro
    try {
      // Teste método simples
      systemMonitor.recordMockDataUsage('/test', 100);
      testResult.recordMockDataUsage = { success: true };
    } catch (error) {
      testResult.recordMockDataUsage = {
        success: false,
        error: (error as Error).message
      };
    }

    // Teste de métodos individuais
    try {
      const hasMethod = typeof systemMonitor.getDataSourceMetrics === 'function';
      if (hasMethod) {
        const dataSourceMetrics = systemMonitor.getDataSourceMetrics();
        testResult.dataSourceMetrics = {
          success: true,
          data: dataSourceMetrics
        };
      } else {
        testResult.dataSourceMetrics = {
          success: false,
          error: 'Method getDataSourceMetrics is not a function'
        };
      }
    } catch (error) {
      testResult.dataSourceMetrics = {
        success: false,
        error: (error as Error).message
      };
    }

    return NextResponse.json({
      success: true,
      test: testResult
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack
      },
      { status: 500 }
    );
  }
}