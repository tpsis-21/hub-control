import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * 
 * Endpoint simples para verificar se a aplicação está funcionando
 * Usado para monitoramento e load balancers
 */

export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Hub Control',
      version: '1.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}