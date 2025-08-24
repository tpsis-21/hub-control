// src/app/api/proxy/bot/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { rateLimitCustom, parseWindowToMs, buildRateLimitHeaders } from '@/lib/security/rate-limit';
import { getExternalApiConfig } from '@/lib/security';

// Função para verificar autenticação
async function isAuthenticated(request: NextRequest): Promise<{ authenticated: boolean; user?: any }> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return { authenticated: false };
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    // Criar cliente Supabase com token do usuário
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );
    
    // Verificar se o token é válido
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { authenticated: false };
    }
    
    return { authenticated: true, user };
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return { authenticated: false };
  }
}

// POST - Proxy para API Bot
export async function POST(request: NextRequest) {
  try {
    // Rate limit para Bot
    const { requests, window } = getExternalApiConfig().bot.rateLimit;
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs(window),
      max: requests,
      namespace: 'proxy:bot'
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em instantes.' },
        { status: 429, headers: buildRateLimitHeaders(rl) }
      );
    }

    // Verificar autenticação
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Você precisa estar autenticado para acessar esta API.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action é obrigatória' },
        { status: 400 }
      );
    }
    
    // Validar actions permitidas
    const allowedActions = [
      'create_test',
      'get_test_status',
      'delete_test',
      'get_server_info',
      'check_credits'
    ];
    
    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        { error: 'Action não permitida' },
        { status: 403 }
      );
    }
    
    // Obter dados do corpo da requisição
    const body = await request.json();
    
    // Validar dados básicos
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Dados inválidos' },
        { status: 400 }
      );
    }
    
    // Construir URL da API Bot
    const botApiUrl = process.env.BOT_API_URL;
    const botApiKey = process.env.BOT_API_KEY;
    
    if (!botApiUrl || !botApiKey) {
      console.error('BOT_API_URL ou BOT_API_KEY não configuradas');
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível' },
        { status: 503 }
      );
    }
    
    // Fazer requisição para API Bot
    const botResponse = await fetch(`${botApiUrl}/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${botApiKey}`,
        'User-Agent': 'Hub-Control/1.0'
      },
      body: JSON.stringify(body)
    });
    
    if (!botResponse.ok) {
      console.error('Erro na API Bot:', botResponse.status, botResponse.statusText);
      
      // Não expor detalhes do erro da API externa
      return NextResponse.json(
        { error: 'Erro ao processar solicitação' },
        { status: botResponse.status >= 500 ? 503 : 400 }
      );
    }
    
    const data = await botResponse.json();
    
    // Filtrar dados sensíveis
    const filteredData = {
      ...data,
      // Remover campos sensíveis se necessário
      api_key: undefined,
      internal_id: undefined
    };
    
    return NextResponse.json(filteredData, {
      headers: {
        ...buildRateLimitHeaders(rl)
      }
    });
    
  } catch (error) {
    console.error('Erro no proxy Bot API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET - Proxy para consultas da API Bot
export async function GET(request: NextRequest) {
  try {
    // Rate limit para Bot
    const { requests, window } = getExternalApiConfig().bot.rateLimit;
    const rl = await rateLimitCustom(request, {
      windowMs: parseWindowToMs(window),
      max: requests,
      namespace: 'proxy:bot'
    });
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Muitas requisições. Tente novamente em instantes.' },
        { status: 429, headers: buildRateLimitHeaders(rl) }
      );
    }

    // Verificar autenticação
    const authResult = await isAuthenticated(request);
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: 'Você precisa estar autenticado para acessar esta API.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const testId = searchParams.get('test_id');
    
    if (!action) {
      return NextResponse.json(
        { error: 'Action é obrigatória' },
        { status: 400 }
      );
    }
    
    // Validar actions permitidas para GET
    const allowedGetActions = [
      'get_test_status',
      'get_server_info',
      'check_credits',
      'list_tests'
    ];
    
    if (!allowedGetActions.includes(action)) {
      return NextResponse.json(
        { error: 'Action não permitida para GET' },
        { status: 403 }
      );
    }
    
    // Construir URL da API Bot
    const botApiUrl = process.env.BOT_API_URL;
    const botApiKey = process.env.BOT_API_KEY;
    
    if (!botApiUrl || !botApiKey) {
      console.error('BOT_API_URL ou BOT_API_KEY não configuradas');
      return NextResponse.json(
        { error: 'Serviço temporariamente indisponível' },
        { status: 503 }
      );
    }
    
    const botUrl = new URL(`${botApiUrl}/${action}`);
    if (testId) {
      botUrl.searchParams.set('test_id', testId);
    }
    
    // Fazer requisição para API Bot
    const botResponse = await fetch(botUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${botApiKey}`,
        'User-Agent': 'Hub-Control/1.0'
      }
    });
    
    if (!botResponse.ok) {
      console.error('Erro na API Bot:', botResponse.status, botResponse.statusText);
      return NextResponse.json(
        { error: 'Erro ao consultar dados' },
        { status: botResponse.status >= 500 ? 503 : 400 }
      );
    }
    
    const data = await botResponse.json();
    
    // Filtrar dados sensíveis
    const filteredData = {
      ...data,
      api_key: undefined,
      internal_id: undefined
    };
    
    return NextResponse.json(filteredData, {
      headers: {
        ...buildRateLimitHeaders(rl)
      }
    });
    
  } catch (error) {
    console.error('Erro no proxy Bot API:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}