// @/app/api/cache/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { memoryCache } from '@/lib/cache';
import { LoggerService } from '@/services/logger.service';
import { requireApiAdmin } from '@/lib/api-auth';

/**
 * API para gerenciar o cache do sistema
 * Permite visualizar estatísticas e limpar o cache
 */

/**
 * GET /api/cache - Retorna estatísticas do cache
 */
export async function GET() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const stats = memoryCache.getStats();
    
    LoggerService.info(
      'Estatísticas do cache solicitadas',
      'api/cache',
      { cacheSize: stats.size }
    );
    
    return NextResponse.json({
      success: true,
      stats: {
        size: stats.size,
        keys: stats.keys,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    LoggerService.error(
      'Erro ao buscar estatísticas do cache',
      'api/cache',
      error
    );
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cache - Limpa todo o cache
 * DELETE /api/cache?key=chave - Remove uma chave específica
 */
export async function DELETE(request: NextRequest) {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (key) {
      // Remover chave específica
      const deleted = memoryCache.delete(key);
      
      LoggerService.info(
        `Cache key ${deleted ? 'removida' : 'não encontrada'}`,
        'api/cache',
        { key, deleted }
      );
      
      return NextResponse.json({
        success: true,
        message: deleted 
          ? `Chave '${key}' removida do cache`
          : `Chave '${key}' não encontrada no cache`,
        deleted
      });
    } else {
      // Limpar todo o cache
      const statsBefore = memoryCache.getStats();
      memoryCache.clear();
      
      LoggerService.info(
        'Cache completamente limpo',
        'api/cache',
        { itemsRemoved: statsBefore.size }
      );
      
      return NextResponse.json({
        success: true,
        message: `Cache limpo. ${statsBefore.size} itens removidos.`,
        itemsRemoved: statsBefore.size
      });
    }
  } catch (error) {
    LoggerService.error(
      'Erro ao limpar cache',
      'api/cache',
      error
    );
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/warmup - Pré-aquece o cache com dados frequentemente acessados
 */
export async function POST() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  try {
    // Fazer algumas chamadas para pré-aquecer o cache
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9010';
    
    const warmupRequests = [
      // Atividades recentes - página 1
      fetch(`${baseUrl}/api/activities/recent?limit=10&page=1`),
      // Atividades recentes - página 2
      fetch(`${baseUrl}/api/activities/recent?limit=10&page=2`),
      // Diferentes limites
      fetch(`${baseUrl}/api/activities/recent?limit=5&page=1`),
      fetch(`${baseUrl}/api/activities/recent?limit=20&page=1`)
    ];
    
    const results = await Promise.allSettled(warmupRequests);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    LoggerService.info(
      'Cache pré-aquecido',
      'api/cache',
      { 
        totalRequests: warmupRequests.length,
        successful,
        failed: warmupRequests.length - successful
      }
    );
    
    return NextResponse.json({
      success: true,
      message: `Cache pré-aquecido com ${successful}/${warmupRequests.length} requisições bem-sucedidas`,
      stats: memoryCache.getStats()
    });
  } catch (error) {
    LoggerService.error(
      'Erro ao pré-aquecer cache',
      'api/cache',
      error
    );
    
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}
