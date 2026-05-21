// @/app/api/initialize-services/route.ts
import { NextResponse } from 'next/server';
import { initializeServices } from '@/lib/startup';
import { LoggerService } from '@/services/logger.service';
import { requireApiAdmin } from '@/lib/api-auth';

/**
 * API route para inicializar serviços do servidor de forma segura
 * Evita problemas de webpack ao executar código Node.js no lado cliente
 */
export async function POST() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    await initializeServices();
    LoggerService.info('Serviços inicializados via API', 'InitializeServicesAPI');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Serviços inicializados com sucesso' 
    });
  } catch (error) {
    LoggerService.error('Erro ao inicializar serviços via API', 'InitializeServicesAPI', {
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      },
      { status: 500 }
    );
  }
}

/**
 * Endpoint GET para verificar status dos serviços
 */
export async function GET() {
  return NextResponse.json({ 
    status: 'API de inicialização disponível',
    timestamp: new Date().toISOString()
  });
}
