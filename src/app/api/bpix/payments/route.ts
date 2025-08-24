// src/app/api/bpix/payments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { bpixService, BPIXCreatePaymentRequest } from '@/services/bpix.service'
import { ErrorService, ErrorType } from '@/services/error.service'
import { LoggerService } from '@/services/logger.service'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Função auxiliar para obter o usuário autenticado
async function getAuthenticatedUser() {
  try {
    const cookieStore = cookies()
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      throw ErrorService.createError(
        ErrorType.AUTHENTICATION_ERROR,
        'Usuário não autenticado',
        'USER_NOT_AUTHENTICATED'
      )
    }

    return user
  } catch (error) {
    throw ErrorService.fromNativeError(error)
  }
}

// POST /api/bpix/payments - Cria um novo pagamento PIX
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    await bpixService.loadUserConfig(user.id)

    if (!bpixService.isConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Serviço BPIX não configurado. Configure primeiro em /api/bpix/config',
        error: 'BPIX_NOT_CONFIGURED'
      }, { status: 400 })
    }

    const body = await request.json()

    // Validação dos dados obrigatórios
    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Valor do pagamento deve ser um número maior que zero',
        error: 'INVALID_AMOUNT'
      }, { status: 400 })
    }

    if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Descrição do pagamento é obrigatória',
        error: 'MISSING_DESCRIPTION'
      }, { status: 400 })
    }

    if (!body.clientMode || !['noNeedToSpecify', 'fillDataNow', 'requestCheckout'].includes(body.clientMode)) {
      return NextResponse.json({
        success: false,
        message: 'Modo do cliente deve ser: noNeedToSpecify, fillDataNow ou requestCheckout',
        error: 'INVALID_CLIENT_MODE'
      }, { status: 400 })
    }

    // Validação de campos opcionais
    if (body.email && typeof body.email !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Email deve ser uma string válida',
        error: 'INVALID_EMAIL'
      }, { status: 400 })
    }

    if (body.phoneNumber && typeof body.phoneNumber !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Número de telefone deve ser uma string válida',
        error: 'INVALID_PHONE'
      }, { status: 400 })
    }

    if (body.document_type && !['CPF', 'CNPJ'].includes(body.document_type)) {
      return NextResponse.json({
        success: false,
        message: 'Tipo de documento deve ser CPF ou CNPJ',
        error: 'INVALID_DOCUMENT_TYPE'
      }, { status: 400 })
    }

    // Validação de data de expiração
    if (body.expire_at) {
      const expireDate = new Date(body.expire_at)
      if (isNaN(expireDate.getTime()) || expireDate <= new Date()) {
        return NextResponse.json({
          success: false,
          message: 'Data de expiração deve ser uma data válida no futuro',
          error: 'INVALID_EXPIRE_DATE'
        }, { status: 400 })
      }
    }

    // Monta a requisição para o BPIX
    const paymentRequest: BPIXCreatePaymentRequest = {
      amount: body.amount,
      description: body.description.trim(),
      clientMode: body.clientMode,
      expire_at: body.expire_at,
      external_reference: body.external_reference || `payment_${user.id}_${Date.now()}`,
      redirect_url: body.redirect_url,
      phoneNumber: body.phoneNumber,
      email: body.email,
      document_type: body.document_type,
      document_client: body.document_client,
      name_client: body.name_client
    }

    // Cria o pagamento
    const result = await bpixService.createPayment(paymentRequest)

    LoggerService.info('Pagamento BPIX criado via API', 'BPIX Payments API', {
      user_id: user.id,
      amount: paymentRequest.amount,
      external_reference: paymentRequest.external_reference,
      transaction_id: result.data?.id_transaction
    })

    return NextResponse.json(result)
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Payments API - POST')
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: appError.statusCode || 500 })
  }
}

// GET /api/bpix/payments - Lista pagamentos ou obtém um pagamento específico
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    await bpixService.loadUserConfig(user.id)

    if (!bpixService.isConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Serviço BPIX não configurado. Configure primeiro em /api/bpix/config',
        error: 'BPIX_NOT_CONFIGURED'
      }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const paymentId = searchParams.get('id')
    const status = searchParams.get('status')
    const external_reference = searchParams.get('external_reference')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Se foi fornecido um ID específico, busca apenas esse pagamento
    if (paymentId) {
      const result = await bpixService.getPayment(paymentId)
      return NextResponse.json(result)
    }

    // Caso contrário, lista pagamentos com filtros
    const filters: any = {}
    
    if (status) filters.status = status
    if (external_reference) filters.external_reference = external_reference
    if (limit) {
      const limitNum = parseInt(limit)
      if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
        filters.limit = limitNum
      }
    }
    if (offset) {
      const offsetNum = parseInt(offset)
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        filters.offset = offsetNum
      }
    }

    const result = await bpixService.listPayments(filters)

    LoggerService.info('Pagamentos BPIX listados via API', 'BPIX Payments API', {
      user_id: user.id,
      filters,
      count: result.data?.length || 0
    })

    return NextResponse.json(result)
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Payments API - GET')
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: appError.statusCode || 500 })
  }
}