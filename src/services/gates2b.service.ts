// src/services/gates2b.service.ts — integração Gates2b
import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import { ErrorService, ErrorType } from './error.service'
import { LoggerService } from './logger.service'
import { HttpRetry, RetryPresets } from '@/lib/http-retry'
import { isHubControlCheckoutExternalReference } from '@/lib/checkout/external-reference'
import {
  GATES2B_DEFAULT_API_URL,
  GATES2B_DEFAULT_ENDPOINTS,
  GATES2B_CARD_INSTALLMENTS_MAX,
  GATES2B_CARD_INSTALLMENTS_MIN,
  GATES2B_MIN_AMOUNT_BRL,
  defaultPaymentExpireAt,
  normalizeGates2bBaseUrl,
  resolveGates2bEndpoints,
} from '@/config/gates2b-api'

// Interfaces para a API Gates2b
export interface Gates2bPayment {
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

export interface Gates2bCreatePaymentRequest {
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

export interface Gates2bCreateCardPaymentRequest {
  amount: number
  clientMode: 'noNeedToSpecify' | 'fillDataNow' | 'requestCheckout'
  installments: number
  expire_at?: string
  external_reference?: string
  description?: string
  redirect_url?: string
}

export interface Gates2bCardPaymentResponse {
  id: number
  checkout_url: string
  international_status: string
  status: string
  installments: number
}

export interface Gates2bCreateInvoiceRequest {
  amount: number
  description: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
  customer_document?: string
  due_date?: string
  external_reference?: string
}

export interface Gates2bPaymentResponse {
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

export interface Gates2bApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface Gates2bConfig {
  baseUrl: string
  token: string
  timeout?: number
  endpoints?: {
    createPayment: string
    createCardPayment?: string
    createInvoice: string
    getPayment: string
    getInvoice: string
    webhook: string
  }
}

export interface Gates2bWebhookPayload {
  event: 'payment.created' | 'payment.paid' | 'payment.expired' | 'payment.cancelled'
  payment_id: string
  transaction_id: string
  amount: number
  status: string
  paid_at?: string
  external_reference?: string
  /** Status normalizado da Gates2b (ex.: PAYMENT_RECEIVED) */
  international_status?: string
}

const GATES2B_CONFIG_PROVIDERS = ['gates2b', 'bpix'] as const

class Gates2bService {
  private config: Gates2bConfig | null = null
  private userId: string | null = null

  constructor() {
    // Deve ser carregada explicitamente com loadUserConfig(userId)
  }

  private applyConfigFromRow(data: {
    base_url: string | null
    auth_token: string | null
    config_data: unknown
  }): void {
    const savedEndpoints = (data.config_data as { endpoints?: Record<string, string> })?.endpoints
    const gatesEndpoints = resolveGates2bEndpoints(savedEndpoints)

    this.config = {
      baseUrl: normalizeGates2bBaseUrl(data.base_url || GATES2B_DEFAULT_API_URL),
      token: data.auth_token || '',
      timeout: (data.config_data as { timeout?: number })?.timeout || 30000,
      endpoints: {
        createPayment: gatesEndpoints.createPayment,
        createCardPayment: gatesEndpoints.createCardPayment,
        createInvoice: gatesEndpoints.createInvoice,
        getPayment: gatesEndpoints.getPayment,
        getInvoice: gatesEndpoints.getPayment,
        webhook: '/webhook',
      },
    }
  }

  async loadUserConfig(userId: string): Promise<void> {
    try {
      this.userId = userId
      const supabase = createApiSupabaseClient()

      let data: {
        base_url: string | null
        auth_token: string | null
        config_data: unknown
      } | null = null

      for (const provider of GATES2B_CONFIG_PROVIDERS) {
        const result = await supabase
          .from('integration_configs')
          .select('*')
          .eq('provider', provider)
          .eq('created_by', userId)
          .eq('is_active', true)
          .maybeSingle()

        if (result.data) {
          data = result.data
          break
        }
      }

      if (!data) {
        const appError = ErrorService.createError(
          ErrorType.NOT_FOUND,
          'Configuração Gates2b não encontrada para este usuário',
          'GATES2B_CONFIG_NOT_FOUND',
          { userId }
        )
        ErrorService.logError(appError, 'Gates2b Service - Load User Config')
        this.config = null
        return
      }

      this.applyConfigFromRow(data)
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Load User Config')
      this.config = null
    }
  }

  // Salva configuração específica do usuário
  async saveUserConfig(userId: string, config: Gates2bConfig): Promise<void> {
    try {
      this.userId = userId
      
      const configData = {
        provider: 'gates2b',
        name: `Gates2b API - ${userId}`,
        base_url: normalizeGates2bBaseUrl(config.baseUrl || GATES2B_DEFAULT_API_URL),
        auth_token: config.token,
        auth_type: 'bearer',
        config_data: {
          timeout: config.timeout || 30000,
          endpoints: {
            ...GATES2B_DEFAULT_ENDPOINTS,
            ...(config.endpoints ?? {}),
          },
        },
        is_active: true,
        is_default: false,
        rate_limit_per_minute: 60,
        created_by: userId
      }

      const supabase = createApiSupabaseClient()
      // Primeiro, desativa configurações antigas do usuário para este provider
      for (const provider of GATES2B_CONFIG_PROVIDERS) {
        await supabase
          .from('integration_configs')
          .update({ is_active: false })
          .eq('provider', provider)
          .eq('created_by', userId)
      }

      // Insere a nova configuração
      const { error } = await supabase
        .from('integration_configs')
        .insert(configData)

      if (error) throw error

      this.config = config
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Save User Config')
      throw appError
    }
  }

  // Verifica se o serviço está configurado
  isConfigured(): boolean {
    return this.config !== null && !!this.config.baseUrl && !!this.config.token
  }

  /** Desembrulha respostas no formato { status, code, response } da Gates2b */
  private normalizeApiPayload<T>(raw: unknown): T {
    if (
      raw &&
      typeof raw === 'object' &&
      'response' in raw &&
      (raw as { response?: unknown }).response !== undefined
    ) {
      return (raw as { response: T }).response
    }
    return raw as T
  }

  // Método auxiliar para fazer requisições HTTP
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: any
  ): Promise<Gates2bApiResponse<T>> {
    if (!this.config) {
      throw ErrorService.createError(
        ErrorType.VALIDATION,
        'Serviço Gates2b não configurado',
        'GATES2B_NOT_CONFIGURED'
      )
    }

    const url = `${this.config.baseUrl}${endpoint}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.token}`,
      'User-Agent': 'Hub-Control-Gates2b/1.0'
    }

    LoggerService.info('Gates2b API Request', 'gates2bService', {
      url,
      method,
      data: method === 'GET' ? undefined : data
    })

    // Usar retry com configuração específica para APIs de pagamento
    const retryOptions = {
      ...RetryPresets.standard,
      timeout: this.config.timeout || 30000,
      onRetry: (error: any, attempt: number, delay: number) => {
        LoggerService.warn('Gates2b API Retry', 'gates2bService', {
          url,
          attempt,
          delay,
          error: error.message
        })
      }
    }

    const result = await HttpRetry.fetchWithRetry<any>(url, {
      method,
      headers,
      body: data && (method === 'POST' || method === 'PUT') ? JSON.stringify(data) : undefined
    }, retryOptions)

    if (!result.success) {
      // Determinar tipo de erro baseado na mensagem
      let errorCode = 'GATES2B_REQUEST_ERROR'
      let errorType = ErrorType.NETWORK
      
      if (result.error?.includes('timeout') || result.error?.includes('AbortError')) {
        errorCode = 'GATES2B_TIMEOUT'
      } else if (result.error?.includes('422') || result.error?.includes('400')) {
        errorCode = 'GATES2B_VALIDATION_ERROR'
        errorType = ErrorType.VALIDATION
      }

      const appError = ErrorService.createError(
        errorType,
        result.error || 'Erro na requisição Gates2b',
        errorCode,
        { attempts: result.attempts, totalTime: result.totalTime }
      )
      ErrorService.logError(appError, 'Gates2b Service - Request Failed')
      throw appError
    }

    LoggerService.info('Gates2b API Success', 'gates2bService', {
      url,
      attempts: result.attempts,
      totalTime: result.totalTime
    })

    const normalized = this.normalizeApiPayload<T>(result.data)

    return {
      success: true,
      message: 'Requisição realizada com sucesso',
      data: normalized,
    }
  }

  // Valida a chave de API (GET /api-key/validate — Gates2b)
  async testConnection(): Promise<Gates2bApiResponse<{ valid: boolean; expires_at?: string | null }>> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: 'Serviço Gates2b não configurado',
          error: 'GATES2B_NOT_CONFIGURED',
        }
      }

      const response = await this.makeRequest<{ valid: boolean; message?: string; expires_at?: string | null }>(
        GATES2B_DEFAULT_ENDPOINTS.validateKey,
        'GET'
      )

      if (!response.data?.valid) {
        return {
          success: false,
          message: response.data?.message || 'Chave de API inválida ou expirada',
          error: 'GATES2B_INVALID_API_KEY',
        }
      }

      return {
        success: true,
        message: 'Conexão com Gates2b estabelecida com sucesso',
        data: {
          valid: true,
          expires_at: response.data.expires_at ?? null,
        },
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Test Connection')

      return {
        success: false,
        message: 'Falha ao conectar com Gates2b',
        error: appError.code,
      }
    }
  }

  // Cria um pagamento PIX
  async createPayment(request: Gates2bCreatePaymentRequest): Promise<Gates2bApiResponse<Gates2bPaymentResponse>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço Gates2b não configurado',
          'GATES2B_NOT_CONFIGURED'
        )
      }

      // Validações básicas
      if (!request.amount || request.amount < GATES2B_MIN_AMOUNT_BRL) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          `Valor mínimo do pagamento é R$ ${GATES2B_MIN_AMOUNT_BRL.toFixed(2)}`,
          'INVALID_AMOUNT'
        )
      }

      const payload: Gates2bCreatePaymentRequest = {
        ...request,
        expire_at: request.expire_at || defaultPaymentExpireAt(),
      }

      const response = await this.makeRequest<Gates2bPaymentResponse>(
        this.config!.endpoints!.createPayment,
        'POST',
        payload
      )

      LoggerService.info('Pagamento Gates2b criado', 'gates2bService', {
        external_reference: payload.external_reference,
        amount: payload.amount,
        transaction_id: response.data?.id_transaction ?? (response.data as { id?: number })?.id,
      })

      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Create Payment')
      throw appError
    }
  }

  /** Cria cobrança no checkout seguro de cartão (POST /payments/v1/card) */
  async createCardPayment(
    request: Gates2bCreateCardPaymentRequest
  ): Promise<Gates2bApiResponse<Gates2bCardPaymentResponse>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço Gates2b não configurado',
          'GATES2B_NOT_CONFIGURED'
        )
      }

      if (!request.amount || request.amount < GATES2B_MIN_AMOUNT_BRL) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          `Valor mínimo é R$ ${GATES2B_MIN_AMOUNT_BRL.toFixed(2)}`,
          'INVALID_AMOUNT'
        )
      }

      const installments = Number(request.installments)
      if (
        !Number.isInteger(installments) ||
        installments < GATES2B_CARD_INSTALLMENTS_MIN ||
        installments > GATES2B_CARD_INSTALLMENTS_MAX
      ) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          `Parcelas devem ser entre ${GATES2B_CARD_INSTALLMENTS_MIN} e ${GATES2B_CARD_INSTALLMENTS_MAX}`,
          'INVALID_INSTALLMENTS'
        )
      }

      if (
        !request.clientMode ||
        !['noNeedToSpecify', 'fillDataNow', 'requestCheckout'].includes(request.clientMode)
      ) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'clientMode inválido',
          'INVALID_CLIENT_MODE'
        )
      }

      const endpoint =
        this.config!.endpoints?.createCardPayment ?? GATES2B_DEFAULT_ENDPOINTS.createCardPayment

      const payload = {
        clientMode: request.clientMode,
        amount: request.amount,
        expire_at: request.expire_at || defaultPaymentExpireAt(48),
        installments,
      }

      const response = await this.makeRequest<Gates2bCardPaymentResponse>(endpoint, 'POST', payload)

      LoggerService.info('Pagamento cartão Gates2b criado', 'gates2bService', {
        external_reference: request.external_reference,
        amount: request.amount,
        installments,
        payment_id: response.data?.id,
        checkout_url: response.data?.checkout_url ? '(presente)' : '(ausente)',
      })

      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Create Card Payment')
      throw appError
    }
  }

  // Cria uma fatura
  async createInvoice(request: Gates2bCreateInvoiceRequest): Promise<Gates2bApiResponse<any>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço Gates2b não configurado',
          'GATES2B_NOT_CONFIGURED'
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

      const saleBody = {
        amount: request.amount,
        description: request.description,
        external_reference: request.external_reference,
        name_client: request.customer_name,
        document_client: request.customer_document,
      }

      const response = await this.makeRequest<any>(
        this.config!.endpoints!.createInvoice,
        'POST',
        saleBody
      )

      LoggerService.info('Venda Gates2b criada', 'gates2bService', {
        external_reference: request.external_reference,
        amount: request.amount,
        customer_email: request.customer_email
      })

      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Create Invoice')
      throw appError
    }
  }

  // Busca um pagamento pelo ID
  async getPayment(paymentId: string): Promise<Gates2bApiResponse<Gates2bPaymentResponse>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço Gates2b não configurado',
          'GATES2B_NOT_CONFIGURED'
        )
      }

      if (!paymentId || paymentId.trim().length === 0) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'ID do pagamento é obrigatório',
          'MISSING_PAYMENT_ID'
        )
      }

      const response = await this.makeRequest<Gates2bPaymentResponse>(
        `${this.config!.endpoints!.getPayment}/${paymentId}`,
        'GET'
      )

      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Get Payment')
      throw appError
    }
  }

  // Lista pagamentos com filtros opcionais
  async listPayments(filters?: {
    status?: string
    external_reference?: string
    limit?: number
    offset?: number
  }): Promise<Gates2bApiResponse<Gates2bPaymentResponse[]>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço Gates2b não configurado',
          'GATES2B_NOT_CONFIGURED'
        )
      }

      const params = new URLSearchParams()
      params.append('type', 'PAYMENT')
      params.append('page', '1')
      params.append(
        'quantityPerPage',
        String(Math.min(filters?.limit ?? 20, 100))
      )
      params.append('orderBy', 'createdAt.DESC')

      if (filters?.status) params.append('status', filters.status)
      if (filters?.external_reference) params.append('query', filters.external_reference)

      const endpoint = `${this.config!.endpoints!.getPayment}?${params.toString()}`
      const response = await this.makeRequest<{ data?: Gates2bPaymentResponse[] } | Gates2bPaymentResponse[]>(
        endpoint,
        'GET'
      )

      const list = Array.isArray(response.data)
        ? response.data
        : (response.data as { data?: Gates2bPaymentResponse[] })?.data ?? []

      return { ...response, data: list }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - List Payments')
      throw appError
    }
  }

  // Processa webhook do Gates2b
  async processWebhook(payload: Gates2bWebhookPayload): Promise<Gates2bApiResponse<any>> {
    try {
      LoggerService.info('Webhook Gates2b recebido', 'gates2bService', {
        event: payload.event,
        payment_id: payload.payment_id,
        status: payload.status
      })

      // Aqui você pode implementar a lógica específica para cada tipo de evento
      switch (payload.event) {
        case 'payment.paid':
          await this.handlePaymentPaid(payload)
          break
        case 'payment.expired':
          await this.handlePaymentExpired(payload)
          break
        case 'payment.cancelled':
          await this.handlePaymentCancelled(payload)
          break
        case 'payment.created':
          LoggerService.info('Pagamento Gates2b aguardando confirmação', 'gates2bService', {
            payment_id: payload.payment_id,
            international_status: payload.international_status,
          })
          break
        default:
          LoggerService.warn('Evento de webhook não reconhecido', 'gates2bService', {
            event: payload.event,
          })
      }

      return {
        success: true,
        message: 'Webhook processado com sucesso'
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Process Webhook')
      throw appError
    }
  }

  // Handlers para eventos de webhook
  private async handlePaymentPaid(payload: Gates2bWebhookPayload): Promise<void> {
    if (!isHubControlCheckoutExternalReference(payload.external_reference)) {
      LoggerService.debug('Pagamento Gates2b ignorado no Hub (não é checkout hubco_)', 'gates2bService', {
        payment_id: payload.payment_id,
        external_reference: payload.external_reference,
      })
      return
    }

    LoggerService.info('Pagamento Gates2b confirmado (checkout Hub)', 'gates2bService', {
      payment_id: payload.payment_id,
      amount: payload.amount,
      external_reference: payload.external_reference,
    })

    try {
      const { paymentFulfillmentService } = await import('@/services/payment-fulfillment.service')
      const result = await paymentFulfillmentService.handleGates2bPaymentPaid(payload)
      LoggerService.info('Fulfillment Hub Control', 'gates2bService', {
        orderId: result.orderId,
        handled: result.handled,
        status: result.fulfillmentStatus,
        message: result.message,
      })
    } catch (error) {
      LoggerService.error('Erro no fulfillment pós-pagamento', 'gates2bService', {
        error: error instanceof Error ? error.message : String(error),
        payment_id: payload.payment_id,
      })
    }
  }

  private async handlePaymentExpired(payload: Gates2bWebhookPayload): Promise<void> {
    // Implementar lógica para pagamento expirado
    LoggerService.info('Pagamento Gates2b expirado', 'gates2bService', {
      payment_id: payload.payment_id,
      external_reference: payload.external_reference
    })
  }

  private async handlePaymentCancelled(payload: Gates2bWebhookPayload): Promise<void> {
    // Implementar lógica para pagamento cancelado
    LoggerService.info('Pagamento Gates2b cancelado', 'gates2bService', {
      payment_id: payload.payment_id,
      external_reference: payload.external_reference
    })
  }

  // Método para obter estatísticas de pagamentos
  async getPaymentStats(filters?: {
    start_date?: string
    end_date?: string
    status?: string
  }): Promise<Gates2bApiResponse<any>> {
    try {
      if (!this.isConfigured()) {
        throw ErrorService.createError(
          ErrorType.VALIDATION,
          'Serviço Gates2b não configurado',
          'GATES2B_NOT_CONFIGURED'
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
        paid_count: payments.data.filter(p => {
          const s = String((p as { status?: string; international_status?: string }).status ?? '').toLowerCase()
          const i = String((p as { international_status?: string }).international_status ?? '').toUpperCase()
          return s.includes('realizado') || i === 'PAID' || i === 'PAYMENT_RECEIVED'
        }).length,
        pending_count: payments.data.filter(p => {
          const i = String((p as { international_status?: string }).international_status ?? '').toUpperCase()
          return i === 'WAITING_PAYMENT' || String((p as { status?: string }).status ?? '').toLowerCase() === 'pending'
        }).length,
        expired_count: payments.data.filter(p =>
          String((p as { status?: string }).status ?? '').toLowerCase().includes('expir')
        ).length,
        cancelled_count: payments.data.filter(p => {
          const i = String((p as { international_status?: string }).international_status ?? '').toUpperCase()
          return ['CANCELED', 'DENIED', 'REFUNDED'].includes(i)
        }).length,
      }

      return {
        success: true,
        message: 'Estatísticas calculadas com sucesso',
        data: stats
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'Gates2b Service - Get Payment Stats')
      throw appError
    }
  }
}

// Exporta uma instância singleton
export const gates2bService = new Gates2bService()
export { Gates2bService }
export default Gates2bService
