/**
 * Orquestração de pagamentos (PIX, cartão, faturas).
 * Rotas devem delegar aqui — não chamar Gates2b diretamente.
 */

import {
  gates2bService,
  type Gates2bCreatePaymentRequest,
  type Gates2bCreateCardPaymentRequest,
  type Gates2bCreateInvoiceRequest,
} from './gates2b.service'
import { LoggerService } from './logger.service'

export class PaymentService {
  /**
   * Carrega configuração do usuário antes de criar cobranças.
   */
  async ensureConfigured(userId: string): Promise<void> {
    await gates2bService.loadUserConfig(userId)
    if (!gates2bService.isConfigured()) {
      throw new PaymentServiceError(
        'Gates2b não configurado para este usuário',
        'GATES2B_NOT_CONFIGURED',
        400
      )
    }
  }

  async createPixPayment(userId: string, body: Gates2bCreatePaymentRequest) {
    await this.ensureConfigured(userId)
    LoggerService.info('Criando pagamento PIX', 'PaymentService', { userId })
    return gates2bService.createPayment(body)
  }

  async createCardPayment(userId: string, body: Gates2bCreateCardPaymentRequest) {
    await this.ensureConfigured(userId)
    return gates2bService.createCardPayment(body)
  }

  async createInvoice(userId: string, body: Gates2bCreateInvoiceRequest) {
    await this.ensureConfigured(userId)
    return gates2bService.createInvoice(body)
  }

  /**
   * Processa webhook de status de pagamento (Gates2b).
   */
  async processGates2bWebhook(payload: Parameters<typeof gates2bService.processWebhook>[0]) {
    return gates2bService.processWebhook(payload)
  }
}

export class PaymentServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus = 400
  ) {
    super(message)
    this.name = 'PaymentServiceError'
  }
}

export const paymentService = new PaymentService()
