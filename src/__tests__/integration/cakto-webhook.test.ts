/**
 * @jest-environment node
 */
import crypto from 'crypto';
import { buildCheckoutExternalReference } from '@/lib/checkout/external-reference';
import { createRequest, parseResponse } from './helpers/test-request';

const secret = 'test-cakto-webhook-secret-32';
const mockGetById = jest.fn();
const mockHandlePaid = jest.fn();

jest.mock('@/services/checkout-order.service', () => ({
  checkoutOrderService: {
    getById: (...args: unknown[]) => mockGetById(...args),
  },
}));

jest.mock('@/services/payment-fulfillment.service', () => ({
  paymentFulfillmentService: {
    handleOrderPaidById: (...args: unknown[]) => mockHandlePaid(...args),
  },
}));

function sign(body: string) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('POST /api/webhooks/cakto', () => {
  const orderId = 'a1b2c3d4-e5f6-4789-90ab-ccddeeff0000';
  const paidBody = JSON.stringify({
    status: 'paid',
    external_reference: buildCheckoutExternalReference(orderId),
    payment_id: 'pay_1',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CAKTO_WEBHOOK_SECRET = secret;
    process.env.NODE_ENV = 'test';
    mockGetById.mockResolvedValue({
      id: orderId,
      amount: 99.9,
      payment_method: 'pix',
    });
    mockHandlePaid.mockResolvedValue({ ok: true });
  });

  it('rejeita POST sem assinatura quando secret está configurado', async () => {
    const { POST } = await import('@/app/api/webhooks/cakto/route');
    const req = createRequest('/api/webhooks/cakto', {
      method: 'POST',
      body: paidBody,
    });
    const res = await POST(req);
    const { status, json } = await parseResponse(res);
    expect(status).toBe(401);
    expect(json).toMatchObject({ success: false, message: 'Assinatura inválida' });
    expect(mockHandlePaid).not.toHaveBeenCalled();
  });

  it('rejeita assinatura inválida', async () => {
    const { POST } = await import('@/app/api/webhooks/cakto/route');
    const req = createRequest('/api/webhooks/cakto', {
      method: 'POST',
      body: paidBody,
      headers: { 'x-cakto-signature': 'deadbeef' },
    });
    const res = await POST(req);
    const { status } = await parseResponse(res);
    expect(status).toBe(401);
    expect(mockHandlePaid).not.toHaveBeenCalled();
  });

  it('aceita POST com HMAC válido', async () => {
    const { POST } = await import('@/app/api/webhooks/cakto/route');
    const req = createRequest('/api/webhooks/cakto', {
      method: 'POST',
      body: paidBody,
      headers: { 'x-cakto-signature': sign(paidBody) },
    });
    const res = await POST(req);
    const { status, json } = await parseResponse<{ success: boolean; paid?: boolean }>(res);
    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.paid).toBe(true);
    expect(mockHandlePaid).toHaveBeenCalled();
  });
});
