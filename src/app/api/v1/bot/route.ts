// src/app/api/v1/bot/route.ts
import { NextResponse } from 'next/server';
import { addTestAction } from '@/app/(app)/testes/supabase-actions';
import { getPlans } from '@/app/(app)/planos/actions';
import { getSettings } from '@/app/(app)/configuracoes/actions';
import { z } from 'zod';
import { addTestSchema } from '@/lib/schemas';


export async function POST(request: Request) {
  try {
    // 1. Busca a API Key das configurações do Firestore
    const settings = await getSettings();
    const API_KEY = settings.bot_api_key;

    if (!API_KEY) {
        return NextResponse.json({ error: 'API Key not configured in the system.' }, { status: 500 });
    }

    // 2. Validação do Header de Autenticação
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header is missing or invalid.' }, { status: 401 });
    }

    const providedKey = authHeader.split(' ')[1];
    if (providedKey !== API_KEY) {
      return NextResponse.json({ error: 'Invalid API Key.' }, { status: 403 });
    }

    // 3. Validação do Corpo da Requisição
    const body = await request.json();
    const { action, data } = body;

    if (!action) {
      return NextResponse.json({ error: 'The "action" field is required.' }, { status: 400 });
    }

    // Busca todos os planos para usar nas actions
    const allPlans = await getPlans();

    // 4. Roteamento da Ação
    switch (action) {
      case 'ping':
        return NextResponse.json({ success: true, message: 'pong' });
      
      case 'create_test':
        try {
          // Valida os dados recebidos com o schema de adicionar teste.
          const validatedData = addTestSchema.parse(data);
          const result = await addTestAction(validatedData, allPlans);

          if (result.success) {
            return NextResponse.json({ success: true, test: result.customer }, { status: 201 });
          } else {
            return NextResponse.json({ success: false, error: result.error }, { status: 400 });
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data provided.', details: error.errors }, { status: 400 });
          }
          console.error('[CREATE_TEST_API_ERROR]', error);
          return NextResponse.json({ error: 'Failed to create test.' }, { status: 500 });
        }

      default:
        return NextResponse.json({ error: `Action "${action}" is not recognized.` }, { status: 400 });
    }

  } catch (error) {
    console.error('[BOT_API_ERROR]', error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ error: 'Invalid JSON in request body.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}
