// src/services/bpix.service.ts
import { supabase } from '@/lib/supabase'
import { ErrorService, ErrorType } from './error.service'
import { LoggerService } from './logger.service'

// Interfaces para a API BPIX
export interface BPIXPayment {
  id?: string
  amount: number
  description: string
  clientMode: 'noNeedToSpecify' | 'fillDataNow' | 'requestCheckout'
  expire_at?: string
  external_reference?: string
  redirect_url?: string
  phoneNumber?: string
  email?: string
  document_type?: 'CPF' | 'CNPJ'
  document_client?: string
  name_client?: string
  status?: 'pending' | 'paid' | 'expired' | 'cancelled'
  created_at?: string
  updated_at?: string
}

export interface BPIXCreatePaymentRequest {
  amount: number
  description: string
  clientMode: 'noNeedToSpecify' | 'fillDataNow' | 'requestCheckout'
  expire_at?: string
  external_reference?: string
  redirect_url?: string
  phoneNumber?: string
  email?: string
  document_type?: 'CPF' | 'CNPJ'
  document_client?: string
  name_client?: string
}

export interface BPIXCreateInvoiceRequest {
  amount: number
  description: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  customer_document?: string
  due_date?: string
  external_reference?: string
}

export interface BPIXPaymentResponse {
  phone_number?: string
  document_type?: string
  expire_at?: string
  document_client?: string
  name_client?: string
  external_reference?: string
  id_transaction: string
  transaction_pix_id: string
  emv: string
  name_receiver: string
  document_receiver: string
  document_type_receiver: string
  qr_image: string
  qr_text: string
  status: string
  checkout_id: string
  createdAt: string
  updatedAt: string
}

export interface BPIXApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface BPIXConfig {
  baseUrl: string
  token: string
  timeout?: number
  endpoints?: {
    createPayment: string
    createInvoice: string
    getPayment: string
    getInvoice: string
    webhook: string
  }
}

export interface BPIXWebhookPayload {
  event: 'payment.created' | 'payment.paid' | 'payment.expired' | 'payment.cancelled'
  payment_id: string
  transaction_id: string
  amount: number
  status: string
  paid_at?: string
  external_reference?: string
}

class BPIXService {
  private config: BPIXConfig | null = null
  private userId: string | null = null

  constructor() {
    // Não carrega configuração automaticamente no constructor
    // Deve ser carregada explicitamente com loadUserConfig(userId)
  }

  // Carrega configuração específica do usuário
  async loadUserConfig(userId: string): Promise<void> {
    try {
      this.userId = userId
      
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('provider', 'bpix')
        .eq('created_by', userId)
        .eq('is_active', true)
        .single()

      if (error) {
        const appError = ErrorService.createError(
          ErrorType.NOT_FOUND,
          'Configuração BPIX não encontrada para este usuário',
          'BPIX_CONFIG_NOT_FOUND',
          { supabaseError: error, userId }
        )
        ErrorService.logError(appError, 'BPIX Service - Load User Config')
        this.config = null
        return
      }

      this.config = {
        baseUrl: data.base_url || '',
        token: data.auth_token || '',
        timeout: (data.config_data as any)?.timeout || 30000,
        endpoints: {
          createPayment: '/invoices/payments',
          createInvoice: '/invoices/invoices',
          getPayment: '/invoices/payments',
          getInvoice: '/invoices/invoices',
          webhook: '/webhook'
        }
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - Load User Config')
      this.config = null
    }
  }

  // Salva configuração específica do usuário
  async saveUserConfig(userId: string, config: BPIXConfig): Promise<void> {
    try {
      this.userId = userId
      
      const configData = {
        provider: 'bpix',
        name: `BPIX API - ${userId}`,
        base_url: config.baseUrl,
        auth_token: config.token,
        auth_type: 'bearer',
        config_data: {
          timeout: config.timeout || 30000,
          endpoints: {
            createPayment: '/invoices/payments',
            createInvoice: '/invoices/invoices',
            getPayment: '/invoices/payments',
            getInvoice: '/invoices/invoices',
            webhook: '/webhook'
          }
        },
        is_active: true,
        is_default: false,
        rate_limit_per_minute: 60,
        created_by: userId
      }

      // Primeiro, desativa configurações antigas do usuário para este provider
      await supabase
        .from('integration_configs')
        .update({ is_active: false })
        .eq('provider', 'bpix')
        .eq('created_by', userId)

      // Insere a nova configuração
      const { error } = await supabase
        .from('integration_configs')
        .insert(configData)

      if (error) throw error

      this.config = config
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - Save User Config')
      throw appError
    }
  }

  // Verifica se o serviço está configurado
  isConfigured(): boolean {
    return this.config !== null && !!this.config.baseUrl && !!this.config.token
  }

  // Método auxiliar para fazer requisições HTTP
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<BPIXApiResponse<T>> {
    if (!this.config) {
      throw ErrorService.createError(
        ErrorType.VALIDATION,
        'Serviço BPIX não configurado',
        'BPIX_NOT_CONFIGURED'
      )
    }

    const startTime = Date.now()
    const url = `${this.config.baseUrl}${endpoint}`

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.token}`,
        'User-Agent': 'Hub-Control-BPIX/1.0'
      }

      const requestOptions: RequestInit = {
        method,
        headers,
        signal: AbortSignal.timeout(this.config.timeout || 30000)
      }

      if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data)
      }

      LoggerService.info('BPIX API Request', 'BPIXService', {
        url,
        method,
        data: method === 'GET' ? undefined : data
      })

      const response = await fetch(url, requestOptions)
      const responseData = await response.json()
      const duration = Date.now() - startTime

      LoggerService.info('BPIX API Response', 'BPIXService', {
        url,
        status: response.status,
        duration,
        success: response.ok
      })

      if (!response.ok) {
        const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`
        throw ErrorService.createError(
          ErrorType.NETWORK,
          `Erro na API BPIX: ${errorMessage}`,
          'BPIX_API_ERROR',
          { status: response.status, response: responseData }
        )
      }

      return {
        success: true,
        message: 'Requisição realizada com sucesso',
        data: responseData
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      LoggerService.error('BPIX API Error', 'BPIXService', {
        url,
        method,
        duration,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      })

      if (error instanceof Error && error.name === 'AbortError') {
        throw ErrorService.createError(
          ErrorType.NETWORK,
          'Timeout na requisição para API BPIX',
          'BPIX_TIMEOUT'
        )
      }

      throw ErrorService.fromNativeError(error)
    }
  }

  // Testa a conexão com a API BPIX
  async testConnection(): Promise<BPIXApiResponse<any>> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'Serviço BPIX não configurado',
          error: 'BPIX_NOT_CONFIGURED'
        }
      }

      // Tenta fazer uma requisição simples para testar a conectividade
      // Como não há endpoint específico de teste, vamos tentar listar pagamentos com limite 1
      const response = await this.makeRequest('/invoices/payments?limit=1', 'GET')
      
      return {
        success: true,
        message: 'Conexão com BPIX estabelecida com sucesso',
        data: { status: 'connected' }
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - Test Connection')
      
      return {
        success: false,
        message: 'Falha ao conectar com BPIX',
        error: appError.code
      }
    }
  }

  // Cria um pagamento PIX
  async createPayment(request: BPIXCreatePaymentRequest): Promise<BPIXApiResponse<BPIXPaymentResponse>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço BPIX não configurado',
          'BPIX_NOT_CONFIGURED'
        )
      }

      // Validações básicas
      if (!request.amount || request.amount <= 0) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Valor do pagamento deve ser maior que zero',
          'INVALID_AMOUNT'
        )
      }

      if (!request.description || request.description.trim().length === 0) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Descrição do pagamento é obrigatória',
          'MISSING_DESCRIPTION'
        )
      }

      const response = await this.makeRequest<BPIXPaymentResponse>(
        this.config!.endpoints!.createPayment,
        'POST',
        request
      )

      LoggerService.info('Pagamento BPIX criado', 'BPIXService', {
        external_reference: request.external_reference,
        amount: request.amount,
        transaction_id: response.data?.id_transaction
      })

      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - Create Payment')
      throw appError
    }
  }

  // Cria uma fatura
  async createInvoice(request: BPIXCreateInvoiceRequest): Promise<BPIXApiResponse<any>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço BPIX não configurado',
          'BPIX_NOT_CONFIGURED'
        )
      }

      // Validações básicas
      if (!request.amount || request.amount <= 0) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Valor da fatura deve ser maior que zero',
          'INVALID_AMOUNT'
        )
      }

      if (!request.description || request.description.trim().length === 0) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Descrição da fatura é obrigatória',
          'MISSING_DESCRIPTION'
        )
      }

      const response = await this.makeRequest<any>(
        this.config!.endpoints!.createInvoice,
        'POST',
        request
      )

      LoggerService.info('Fatura BPIX criada', 'BPIXService', {
        external_reference: request.external_reference,
        amount: request.amount,
        customer_email: request.customer_email
      })

      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - Create Invoice')
      throw appError
    }
  }

  // Busca um pagamento pelo ID
  async getPayment(paymentId: string): Promise<BPIXApiResponse<BPIXPaymentResponse>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço BPIX não configurado',
          'BPIX_NOT_CONFIGURED'
        )
      }

      if (!paymentId || paymentId.trim().length === 0) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'ID do pagamento é obrigatório',
          'MISSING_PAYMENT_ID'
        )
      }

      const response = await this.makeRequest<BPIXPaymentResponse>(
        `${this.config!.endpoints!.getPayment}/${paymentId}`,
        'GET'
      )

      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - Get Payment')
      throw appError
    }
  }

  // Lista pagamentos com filtros opcionais
  async listPayments(filters?: {
    status?: string
    external_reference?: string
    limit?: number
    offset?: number
  }): Promise<BPIXApiResponse<BPIXPaymentResponse[]>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço BPIX não configurado',
          'BPIX_NOT_CONFIGURED'
        )
      }

      let endpoint = this.config!.endpoints!.getPayment
      const params = new URLSearchParams()

      if (filters) {
        if (filters.status) params.append('status', filters.status)
        if (filters.external_reference) params.append('external_reference', filters.external_reference)
        if (filters.limit) params.append('limit', filters.limit.toString())
        if (filters.offset) params.append('offset', filters.offset.toString())
      }

      if (params.toString()) {
        endpoint += `?${params.toString()}`
      }

      const response = await this.makeRequest<BPIXPaymentResponse[]>(endpoint, 'GET')
      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - List Payments')
      throw appError
    }
  }

  // Processa webhook do BPIX
  async processWebhook(payload: BPIXWebhookPayload): Promise<BPIXApiResponse<any>> {
    try {
      LoggerService.info('Webhook BPIX recebido', 'BPIXService', {
        event: payload.event,
        payment_id: payload.payment_id,
        status: payload.status
      })

      // Aqui você pode implementar a lógica específica para cada tipo de evento
      switch (payload.event) {
        case 'payment.paid':
          // Lógica para pagamento confirmado
          await this.handlePaymentPaid(payload)
          break
        case 'payment.expired':
          // Lógica para pagamento expirado
          await this.handlePaymentExpired(payload)
          break
        case 'payment.cancelled':
          // Lógica para pagamento cancelado
          await this.handlePaymentCancelled(payload)
          break
        default:
          LoggerService.warn('Evento de webhook não reconhecido', 'BPIXService', {
            event: payload.event
          })
      }

      return {
        success: true,
        message: 'Webhook processado com sucesso'
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - Process Webhook')
      throw appError
    }
  }

  // Handlers para eventos de webhook
  private async handlePaymentPaid(payload: BPIXWebhookPayload): Promise<void> {
    // Implementar lógica para pagamento confirmado
    // Ex: atualizar status do pedido, ativar serviço, etc.
    LoggerService.info('Pagamento BPIX confirmado', 'BPIXService', {
      payment_id: payload.payment_id,
      amount: payload.amount,
      external_reference: payload.external_reference
    })
  }

  private async handlePaymentExpired(payload: BPIXWebhookPayload): Promise<void> {
    // Implementar lógica para pagamento expirado
    LoggerService.info('Pagamento BPIX expirado', 'BPIXService', {
      payment_id: payload.payment_id,
      external_reference: payload.external_reference
    })
  }

  private async handlePaymentCancelled(payload: BPIXWebhookPayload): Promise<void> {
    // Implementar lógica para pagamento cancelado
    LoggerService.info('Pagamento BPIX cancelado', 'BPIXService', {
      payment_id: payload.payment_id,
      external_reference: payload.external_reference
    })
  }

  // Método para obter estatísticas de pagamentos
  async getPaymentStats(filters?: {
    start_date?: string
    end_date?: string
    status?: string
  }): Promise<BPIXApiResponse<any>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço BPIX não configurado',
          'BPIX_NOT_CONFIGURED'
        )
      }

      // Como não há endpoint específico de estatísticas, vamos simular com base nos pagamentos
      const payments = await this.listPayments({
        limit: 1000, // Limite alto para obter mais dados
        ...filters
      })

      if (!payments.success || !payments.data) {
        return {
          success: false,
          message: 'Erro ao obter dados para estatísticas'
        }
      }

      const stats = {
        total_payments: payments.data.length,
        total_amount: payments.data.reduce((sum, payment) => sum + (payment as any).amount || 0, 0),
        paid_count: payments.data.filter(p => (p as any).status === 'paid').length,
        pending_count: payments.data.filter(p => (p as any).status === 'pending').length,
        expired_count: payments.data.filter(p => (p as any).status === 'expired').length,
        cancelled_count: payments.data.filter(p => (p as any).status === 'cancelled').length
      }

      return {
        success: true,
        message: 'Estatísticas calculadas com sucesso',
        data: stats
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'BPIX Service - Get Payment Stats')
      throw appError
    }
  }
}

// Exporta uma instância singleton
export const bpixService = new BPIXService()
export default BPIXService