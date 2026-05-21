/**
 * Notificações in-app (pagamentos, alertas).
 * Fachada sobre NotificationsService.
 */

import { NotificationsService } from '@/lib/notifications.service'

export type PaymentNotificationType =
  | 'payment_activated'
  | 'payment_pending'
  | 'payment_confirmed'
  | 'system'

export class NotificationService {
  private readonly inApp = new NotificationsService()

  async notifyPaymentStatus(
    userId: string,
    type: PaymentNotificationType,
    title: string,
    message: string,
    data: Record<string, unknown> = {}
  ) {
    await this.inApp.createInAppNotification({
      userId,
      type,
      title,
      message,
      data,
    })
  }

  async notifyAdminAlert(title: string, message: string, data?: Record<string, unknown>) {
    await this.inApp.createInAppNotification({
      userId: 'system',
      type: 'system',
      title,
      message,
      data: data ?? {},
    })
  }

  async notifySecurityAlert(title: string, message: string, data?: Record<string, unknown>) {
    await this.inApp.createInAppNotification({
      userId: 'system',
      type: 'system',
      title,
      message,
      data: { ...data, category: 'security' },
    })
  }

  getInApp() {
    return this.inApp
  }
}

export const notificationService = new NotificationService()
