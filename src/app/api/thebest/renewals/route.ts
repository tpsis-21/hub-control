import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRenewalService } from '@/services/thebest-renewal.service';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * GET /api/thebest/renewals
 * Busca histórico de renovações do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'user_id é obrigatório' },
        { status: 400 }
      );
    }
    
    console.log('📋 Buscando renovações para usuário:', userId);
    
    const renewalService = createRenewalService(supabase);
    const renewals = await renewalService.getRenewalHistory(userId, limit);
    
    return NextResponse.json({
      success: true,
      renewals,
      count: renewals.length
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar renovações:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/thebest/renewals
 * Processa renovação manual (para testes)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, package_id, payment_id, amount, payment_method } = body;
    
    // Validar dados obrigatórios
    if (!user_id || !package_id || !payment_id || !amount || !payment_method) {
      return NextResponse.json(
        { error: 'Dados obrigatórios ausentes' },
        { status: 400 }
      );
    }
    
    console.log('🔄 Processando renovação manual:', {
      user_id,
      package_id,
      payment_id
    });
    
    const renewalService = createRenewalService(supabase);
    
    // Verificar se já foi processado
    const alreadyProcessed = await renewalService.isPaymentProcessed(payment_id);
    if (alreadyProcessed) {
      return NextResponse.json(
        { error: 'Pagamento já processado' },
        { status: 409 }
      );
    }
    
    // Processar renovação
    const result = await renewalService.processAutoRenewal({
      userId: user_id,
      packageId: package_id,
      paymentId: payment_id,
      amount,
      paymentMethod: payment_method
    });
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        renewal_id: result.renewalId,
        package_info: result.packageInfo
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message
        },
        { status: 400 }
      );
    }
    
  } catch (error) {
    console.error('❌ Erro ao processar renovação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}