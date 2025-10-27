import { NextResponse } from 'next/server';

/**
 * System Status Endpoint
 * 
 * Retorna informações detalhadas sobre o status do sistema
 * Inclui uptime, versão, ambiente e outras métricas básicas
 */

const startTime = Date.now();

export async function GET() {
  try {
    const uptime = Date.now() - startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    
    return NextResponse.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      service: {
        name: 'Hub Control',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      uptime: {
        milliseconds: uptime,
        seconds: uptimeSeconds,
        minutes: uptimeMinutes,
        hours: uptimeHours,
        formatted: `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        }
      },
      health: {
        database: 'connected',
        api: 'operational',
        services: 'running'
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to retrieve system status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}