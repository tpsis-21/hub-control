// src/app/api/bpix/invoices/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { bpixService, BPIXCreateInvoiceRequest } from '@/services/bpix.service'
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

// POST /api/bpix/invoices - Cria uma nova fatura
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
        message: 'Valor da fatura deve ser um número maior que zero',
        error: 'INVALID_AMOUNT'
      }, { status: 400 })
    }

    if (!body.description || typeof body.description !== 'string' || body.description.trim().length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Descrição da fatura é obrigatória',
        error: 'MISSING_DESCRIPTION'
      }, { status: 400 })
    }

    // Validação de campos opcionais
    if (body.customer_email && typeof body.customer_email !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Email do cliente deve ser uma string válida',
        error: 'INVALID_CUSTOMER_EMAIL'
      }, { status: 400 })
    }

    if (body.customer_phone && typeof body.customer_phone !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Telefone do cliente deve ser uma string válida',
        error: 'INVALID_CUSTOMER_PHONE'
      }, { status: 400 })
    }

    if (body.customer_name && typeof body.customer_name !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Nome do cliente deve ser uma string válida',
        error: 'INVALID_CUSTOMER_NAME'
      }, { status: 400 })
    }

    if (body.customer_document && typeof body.customer_document !== 'string') {
      return NextResponse.json({
        success: false,
        message: 'Documento do cliente deve ser uma string válida',
        error: 'INVALID_CUSTOMER_DOCUMENT'
      }, { status: 400 })
    }

    // Validação de data de vencimento
    if (body.due_date) {
      const dueDate = new Date(body.due_date)
      if (isNaN(dueDate.getTime()) || dueDate <= new Date()) {
        return NextResponse.json({
          success: false,
          message: 'Data de vencimento deve ser uma data válida no futuro',
          error: 'INVALID_DUE_DATE'
        }, { status: 400 })
      }
    }

    // Validação de email se fornecido
    if (body.customer_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.customer_email)) {
        return NextResponse.json({
          success: false,
          message: 'Email do cliente deve ter um formato válido',
          error: 'INVALID_EMAIL_FORMAT'
        }, { status: 400 })
      }
    }

    // Monta a requisição para o BPIX
    const invoiceRequest: BPIXCreateInvoiceRequest = {
      amount: body.amount,
      description: body.description.trim(),
      customer_name: body.customer_name?.trim(),
      customer_email: body.customer_email?.trim(),
      customer_phone: body.customer_phone?.trim(),
      customer_document: body.customer_document?.trim(),
      due_date: body.due_date,
      external_reference: body.external_reference || `invoice_${user.id}_${Date.now()}`
    }

    // Cria a fatura
    const result = await bpixService.createInvoice(invoiceRequest)

    LoggerService.info('Fatura BPIX criada via API', 'BPIX Invoices API', {
      user_id: user.id,
      amount: invoiceRequest.amount,
      external_reference: invoiceRequest.external_reference,
      customer_email: invoiceRequest.customer_email
    })

    return NextResponse.json(result)
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Invoices API - POST')
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: appError.statusCode || 500 })
  }
}

// GET /api/bpix/invoices - Lista faturas (funcionalidade básica)
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
    const invoiceId = searchParams.get('id')
    const external_reference = searchParams.get('external_reference')
    const limit = searchParams.get('limit')
    const offset = searchParams.get('offset')

    // Se foi fornecido um ID específico, busca apenas essa fatura
    if (invoiceId) {
      try {
        // Como não temos método específico para buscar fatura, vamos usar o endpoint genérico
        const result = await bpixService.getPayment(invoiceId) // Reutiliza método de pagamento
        return NextResponse.json(result)
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'Fatura não encontrada ou erro ao buscar',
          error: 'INVOICE_NOT_FOUND'
        }, { status: 404 })
      }
    }

    // Para listagem de faturas, como não há endpoint específico na documentação,
    // vamos retornar uma resposta indicando que a funcionalidade está limitada
    LoggerService.info('Tentativa de listar faturas BPIX', 'BPIX Invoices API', {
      user_id: user.id,
      external_reference,
      limit,
      offset
    })

    return NextResponse.json({
      success: true,
      message: 'Listagem de faturas não implementada na API BPIX. Use pagamentos para consultas.',
      data: {
        invoices: [],
        total: 0,
        note: 'A API BPIX não fornece endpoint específico para listagem de faturas. Use /api/bpix/payments para consultar transações.'
      }
    })
  } catch (error) {
    const appError = ErrorService.fromNativeError(error)
    ErrorService.logError(appError, 'BPIX Invoices API - GET')
    
    return NextResponse.json({
      success: false,
      message: appError.message,
      error: appError.code
    }, { status: appError.statusCode || 500 })
  }
}