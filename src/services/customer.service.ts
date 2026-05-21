/**
 * Dados de cliente para pagamentos (PIX, cartão, faturas).
 * Centraliza validação e normalização — evita repetir regras nas rotas.
 */

export type CustomerDocumentType = 'CPF' | 'CNPJ'

export interface CustomerPayload {
  name?: string
  email?: string
  phone?: string
  document?: string
  document_type?: CustomerDocumentType
}

export interface NormalizedCustomer {
  name_client?: string
  email?: string
  phoneNumber?: string
  document_client?: string
  document_type?: CustomerDocumentType
}

export class CustomerService {
  /**
   * Valida e normaliza campos de cliente para a API Gates2b.
   */
  normalizeForGates2b(input: CustomerPayload): NormalizedCustomer {
    const documentType = input.document_type ?? 'CPF'
    const document = input.document?.replace(/\D/g, '') ?? undefined

    return {
      name_client: input.name?.trim() || undefined,
      email: input.email?.trim().toLowerCase() || undefined,
      phoneNumber: input.phone?.replace(/\D/g, '') || undefined,
      document_client: document,
      document_type: documentType,
    }
  }

  /**
   * Valida documento brasileiro básico (tamanho).
   */
  validateDocument(document: string, type: CustomerDocumentType = 'CPF'): boolean {
    const digits = document.replace(/\D/g, '')
    if (type === 'CPF') return digits.length === 11
    if (type === 'CNPJ') return digits.length === 14
    return false
  }

  /**
   * Valida e-mail simples.
   */
  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }
}

export const customerService = new CustomerService()
