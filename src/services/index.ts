/**
 * Serviços de domínio — use estes em rotas e jobs, não lógica inline.
 *
 * PaymentService      → PIX, cartão, faturas (Gates2b)
 * UserService         → registro, perfil, auth
 * SubscriptionService → renovações / pacotes The Best
 * NotificationService → in-app e alertas
 * WebhookService      → assinatura e processamento de webhooks
 * CustomerService     → dados de cliente em cobranças
 */

export { PaymentService, paymentService, PaymentServiceError } from './payment.service'
export { UserService, userService, UserServiceError, registerUserSchema } from './user.service'
export type { RegisterUserInput, UserProfile } from './user.service'
export { SubscriptionService, subscriptionService } from './subscription.service'
export type { TheBestPaymentWebhookPayload } from './subscription.service'
export { NotificationService, notificationService } from './notification.service'
export { WebhookService, webhookService } from './webhook.service'
export type { WebhookHandleResult } from './webhook.service'
export { CustomerService, customerService } from './customer.service'
export type { CustomerPayload, NormalizedCustomer } from './customer.service'

// Integrações existentes (mantidas para compatibilidade)
export { gates2bService } from './gates2b.service'
export { createRenewalService } from './thebest-renewal.service'
export { TheBestService } from './thebest.service'
export { LoggerService } from './logger.service'
