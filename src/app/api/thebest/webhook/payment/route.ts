import { NextRequest, NextResponse } from 'next/server';
import { createApiSupabaseClient } from '@/lib/supabase/clients/api';
import { createRenewalService } from '@/services/thebest-renewal.service';
import { headers } from 'next/headers';
import crypto from 'crypto';

// Usar cliente Supabase consolidado
const supabase = createApiSupabaseClient();

// Chave secreta para validar webhooks (configure no .env)
const WEBHOOK_SECRET = process.env.THEBEST_WEBHOOK_SECRET || 'your-webhook-secret';

/**
 * Webhook para processar pagamentos confirmados e acionar renovação automática
 * POST /api/thebest/webhook/payment
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Webhook de pagamento recebido');
    
    // Validar assinatura do webhook (segurança)
    const headersList = await headers();
    const signature = headersList.get('x-webhook-signature');
    const body = await request.text();
    
    if (!validateWebhookSignature(body, signature)) {
      console.error('❌ Assinatura do webhook inválida');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }
    
    // Parse do payload
    const payload = JSON.parse(body);
    console.log('📦 Payload do webhook:', payload);
    
    // Validar estrutura do payload
    const validationResult = validatePaymentPayload(payload);
    if (!validationResult.valid) {
      console.error('❌ Payload inválido:', validationResult.errors);
      return NextResponse.json(
        { error: 'Invalid payload', details: validationResult.errors },
        { status: 400 }
      );
    }
    
    // Extrair dados do pagamento
    const paymentData = {
      userId: payload.user_id,
      packageId: payload.package_id,
      paymentId: payload.payment_id,
      amount: payload.amount,
      paymentMethod: payload.payment_method,
      transactionId: payload.transaction_id
    };
    
    console.log('💳 Dados do pagamento:', paymentData);
    
    // Verificar se o pagamento já foi processado
    const renewalService = createRenewalService(supabase);
    const alreadyProcessed = await renewalService.isPaymentProcessed(paymentData.paymentId);
    
    if (alreadyProcessed) {
      console.log('⚠️ Pagamento já processado:', paymentData.paymentId);
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        payment_id: paymentData.paymentId
      });
    }
    
    // Processar renovação automática
    console.log('🔄 Iniciando renovação automática...');
    const renewalResult = await renewalService.processAutoRenewal(paymentData);
    
    if (renewalResult.success) {
      console.log('✅ Renovação automática concluída:', renewalResult.renewalId);
      
      // Resposta de sucesso
      return NextResponse.json({
        success: true,
        message: renewalResult.message,
        renewal_id: renewalResult.renewalId,
        package_info: {
          id: renewalResult.packageInfo?.package_id,
          name: renewalResult.packageInfo?.name,
          credits: renewalResult.packageInfo?.credits
        }
      });
    } else {
      console.error('❌ Falha na renovação automática:', renewalResult.error);
      
      // Log do erro para análise
      await logWebhookError({
        paymentId: paymentData.paymentId,
        userId: paymentData.userId,
        error: renewalResult.error || 'Unknown error',
        message: renewalResult.message,
        payload
      });
      
      // Resposta de erro (mas HTTP 200 para não reenviar webhook)
      return NextResponse.json({
        success: false,
        message: renewalResult.message,
        error: renewalResult.error
      });
    }
    
  } catch (error) {
    console.error('💥 Erro no webhook de pagamento:', error);
    
    // Log do erro crítico
    await logWebhookError({
      error: error instanceof Error ? error.message : 'Critical webhook error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Retornar erro 500 para reenvio do webhook
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Valida assinatura do webhook para segurança
 */
function validateWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) {
    console.warn('⚠️ Webhook sem assinatura (modo desenvolvimento)');
    return process.env.NODE_ENV === 'development'; // Permitir em dev
  }
  
  try {
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    console.error('Erro na validação da assinatura:', error);
    return false;
  }
}

/**
 * Valida estrutura do payload do webhook
 */
function validatePaymentPayload(payload: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  // Campos obrigatórios
  const requiredFields = [
    'user_id',
    'package_id', 
    'payment_id',
    'amount',
    'payment_method'
  ];
  
  for (const field of requiredFields) {
    if (!payload[field]) {
      errors.push(`Campo obrigatório ausente: ${field}`);
    }
  }
  
  // Validações específicas
  if (payload.package_id && !Number.isInteger(payload.package_id)) {
    errors.push('package_id deve ser um número inteiro');
  }
  
  if (payload.amount && (typeof payload.amount !== 'number' || payload.amount <= 0)) {
    errors.push('amount deve ser um número positivo');
  }
  
  if (payload.user_id && typeof payload.user_id !== 'string') {
    errors.push('user_id deve ser uma string');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Registra erros do webhook para análise
 */
async function logWebhookError(errorData: any) {
  try {
    await supabase
      .from('thebest_api_logs')
      .insert({
        user_id: errorData.userId || 'webhook',
        operation_type: 'webhook_payment',
        request_data: errorData.payload || {},
        response_data: {
          error: errorData.error,
          message: errorData.message,
          stack: errorData.stack
        },
        status_code: 500,
        error_message: errorData.error
      });
  } catch (logError) {
    console.error('Erro ao registrar log do webhook:', logError);
  }
}

/**
 * Endpoint para testar webhook (apenas desenvolvimento)
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    message: 'The Best Payment Webhook Endpoint',
    status: 'active',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
}
