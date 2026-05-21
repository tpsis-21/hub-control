/** @deprecated Use @/services/gates2b.service */
export {
  gates2bService as bpixService,
  Gates2bService as BPIXService,
  default,
} from './gates2b.service'
export type {
  Gates2bPayment as BPIXPayment,
  Gates2bCreatePaymentRequest as BPIXCreatePaymentRequest,
  Gates2bCreateCardPaymentRequest as BPIXCreateCardPaymentRequest,
  Gates2bCardPaymentResponse as BPIXCardPaymentResponse,
  Gates2bCreateInvoiceRequest as BPIXCreateInvoiceRequest,
  Gates2bPaymentResponse as BPIXPaymentResponse,
  Gates2bApiResponse as BPIXApiResponse,
  Gates2bConfig as BPIXConfig,
  Gates2bWebhookPayload as BPIXWebhookPayload,
} from './gates2b.service'
