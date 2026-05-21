// src/app/api/gates2b/payments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { gates2bService, Gates2bCreatePaymentRequest } from '@/services/gates2b.service'
import { ErrorService, ErrorType } from '@/services/error.service'
import { LoggerService } from '@/services/logger.service'
import { paymentService, PaymentServiceError } from '@/services/payment.service'
import { userService, UserServiceError } from '@/services/user.service'
import { cookies } from 'next/headers'

async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies()
    const supabase = userService.createAuthClient(cookieStore)
    return await userService.getAuthenticatedUser(supabase)
  } catch (error) {
    if (error instanceof UserServiceError) {
      throw ErrorService.createError(
        ErrorType.AUTHENTICATION,
        error.message,
        error.code
      )
    }
    throw ErrorService.fromNativeError(error)
  }
}

// POST /api/gates2b/payments - Cria um novo pagamento PIX
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    const body = await request.json()

    // Validação dos dados obrigatórios
    if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
      return NextResponse.json({
        success: false,
        message: 'Valor do pagamento deve ser um número maior que zero',
        error: 'INVALID_AMOUNT'
      }, { status: 400 })
    }

    if (body.amount < 3) {
      return NextResponse.json({
        success: false,
        message: 'Valor mínimo do pagamento é R$ 3,00 (Gates2b)',
        error: 'INVALID_AMOUNT'
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

    // expire_at é obrigatório na Gates2b; padrão: 24h se omitido
    let expireAt = body.expire_at
    if (!expireAt) {
      const defaultExpire = new Date()
      defaultExpire.setHours(defaultExpire.getHours() + 24)
      expireAt = defaultExpire.toISOString()
    } else {
      const expireDate = new Date(expireAt)
      if (isNaN(expireDate.getTime()) || expireDate <= new Date()) {
        return NextResponse.json({
          success: false,
          message: 'Data de expiração deve ser uma data válida no futuro',
          error: 'INVALID_EXPIRE_DATE'
        }, { status: 400 })
      }
    }

    const description =
      typeof body.description === 'string' && body.description.trim().length > 0
        ? body.description.trim()
        : `Pagamento ${body.external_reference || ''}`.trim()

    const paymentRequest: Gates2bCreatePaymentRequest = {
      amount: body.amount,
      description,
      clientMode: body.clientMode,
      expire_at: expireAt,
      external_reference: body.external_reference || `payment_${user.id}_${Date.now()}`,
      redirect_url: body.redirect_url,
      phoneNumber: body.phoneNumber,
      email: body.email,
      document_type: body.document_type,
      document_client: body.document_client,
      name_client: body.name_client
    }

    const result = await paymentService.createPixPayment(user.id, paymentRequest)

    LoggerService.info('Pagamento Gates2b criado via API', 'Gates2b Payments API', {
      user_id: user.id,
      amount: paymentRequest.amount,
      external_reference: paymentRequest.external_reference,
      transaction_id: result.data?.id_transaction
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({
        success: false,
        message: error.message,
        error: error.code,
      }, { status: error.httpStatus })
    }
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Payments API - POST')
    let statusCode = 500
    if (appError.type === 'AUTHENTICATION') statusCode = 401
    else if (appError.type === 'AUTHORIZATION') statusCode = 403
    else if (appError.type === 'VALIDATION') statusCode = 400
    else if (appError.type === 'NOT_FOUND') statusCode = 404
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code,
    }, { status: statusCode })
  }
}

// GET /api/gates2b/payments - Lista pagamentos ou obtém um pagamento específico
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    await gates2bService.loadUserConfig(user.id)

    if (!gates2bService.isConfigured()) {
      return NextResponse.json({
        success: false,
        message: 'Serviço Gates2b não configurado. Configure primeiro em /api/gates2b/config',
        error: 'GATES2B_NOT_CONFIGURED'
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
      const result = await gates2bService.getPayment(paymentId)
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

    const result = await gates2bService.listPayments(filters)

    LoggerService.info('Pagamentos Gates2b listados via API', 'Gates2b Payments API', {
      user_id: user.id,
      filters,
      count: result.data?.length || 0
    })

    return NextResponse.json(result)
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'Gates2b Payments API - GET')
    
    // Mapeia tipo de erro para status HTTP
    let statusCode = 500
    if (appError.type === 'AUTHENTICATION') statusCode = 401
    else if (appError.type === 'AUTHORIZATION') statusCode = 403
    else if (appError.type === 'VALIDATION') statusCode = 400
    else if (appError.type === 'NOT_FOUND') statusCode = 404
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: statusCode })
  }
}
