// src/app/api/proxy/tmdb/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitCustom, parseWindowToMs, buildRateLimitHeaders } from '@/lib/security/rate-limit';
import { getExternalApiConfig } from '@/lib/security';

// GET - Proxy para TMDB API
export async function GET(request: NextRequest) {
  try {
    // Aplicar rate limit centralizado (namespace por serviço)
    const { requests, window } = getExternalApiConfig().tmdb.rateLimit;
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs(window),
      max: requests,
      namespace: 'proxy:tmdb'
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em instantes.' },
        { status: 429, headers: buildRateLimitHeaders(rl) }
      );
    }
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const query = searchParams.get('query');
    
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint é obrigatório' },
        { status: 400 }
      );
    }
    
    // Normalizar endpoint com barra inicial
    const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // Validar endpoints permitidos via configuração centralizada (checagem por prefixo)
    const allowed = getExternalApiConfig().tmdb.allowedEndpoints.some((allowedPrefix) => {
      return endpointPath.startsWith(allowedPrefix);
    });

    if (!allowed) {
      return NextResponse.json(
        { error: 'Endpoint não permitido' },
        { status: 403 }
      );
    }
    
    // Construir URL da API TMDB usando baseUrl da configuração
    const tmdbApiKey = process.env.TMDB_API_KEY;
    if (!tmdbApiKey) {
      console.error('TMDB_API_KEY não configurada');
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível' },
        { status: 503 }
      );
    }
    
    const baseUrl = getExternalApiConfig().tmdb.baseUrl.replace(/\/$/, '');
    const tmdbUrl = new URL(`${baseUrl}${endpointPath}`);
    tmdbUrl.searchParams.set('api_key', tmdbApiKey);
    tmdbUrl.searchParams.set('language', 'pt-BR');
    
    if (query) {
      tmdbUrl.searchParams.set('query', query);
    }
    
    // Adicionar outros parâmetros permitidos
    const allowedParams = ['page', 'region', 'year', 'primary_release_year'];
    allowedParams.forEach(param => {
      const value = searchParams.get(param);
      if (value) {
        tmdbUrl.searchParams.set(param, value);
      }
    });
    
    // Fazer requisição para TMDB
    const response = await fetch(tmdbUrl.toString(), {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Hub-Control/1.0'
      },
      next: { revalidate: 300 } // Cache por 5 minutos
    });
    
    if (!response.ok) {
      console.error('Erro na API TMDB:', response.status, response.statusText);
      return NextResponse.json(
        { error: 'Erro ao buscar dados' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    
    // Filtrar dados sensíveis se necessário
    const filteredData = {
      ...data,
      // Remover campos que não devem ser expostos
    };
    
    return NextResponse.json(filteredData, {
      headers: {
        'Cache-Control': 'public, max-age=300',
        ...buildRateLimitHeaders(rl)
      }
    });
    
  } catch (error) {
    console.error('Erro no proxy TMDB:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}