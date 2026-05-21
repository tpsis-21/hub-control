/**
 * @jest-environment node
 *
 * Testes de integração — handlers das APIs críticas (Fase 3)
 * Invoca route handlers diretamente (sem servidor HTTP).
 */
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createRequest, parseResponse } from './helpers/test-request';

const mockRequireApiUser = jest.fn();
const mockRequireApiAdmin = jest.fn();
const mockCreateAuthenticatedApiClient = jest.fn();
const mockHeaders = jest.fn();
const mockGetUser = jest.fn();
const mockProcessWebhook = jest.fn();
const mockIsPaymentProcessed = jest.fn();
const mockProcessAutoRenewal = jest.fn();

jest.mock('@/lib/api-auth', () => ({
  requireApiUser: (...args) => mockRequireApiUser(...args),
  requireApiAdmin: (...args) => mockRequireApiAdmin(...args),
  createAuthenticatedApiClient: (...args) => mockCreateAuthenticatedApiClient(...args),
}));

jest.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}));

jest.mock('@/lib/supabase/unified-client', () => ({
  createApiSupabaseClient: jest.fn(() => ({
    auth: { getUser: mockGetUser },
    from: jest.fn(),
  })),
}));

jest.mock('@/services/gates2b.service', () => ({
  gates2bService: {
    processWebhook: (...args) => mockProcessWebhook(...args),
  },
}));

jest.mock('@/services/thebest-renewal.service', () => ({
  createRenewalService: () => ({
    isPaymentProcessed: mockIsPaymentProcessed,
    processAutoRenewal: mockProcessAutoRenewal,
  }),
}));

jest.mock('@/lib/supabase/clients/api', () => ({
  createApiSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
    })),
  })),
}));

jest.mock('@/lib/startup', () => ({
  initializeServices: jest.fn().mockResolvedValue(undefined),
}));

function adminDenied() {
  return NextResponse.json(
    { success: false, error: 'Acesso negado', message: 'Permissão de administrador necessária.' },
    { status: 403 }
  );
}

function userDenied() {
  return NextResponse.json(
    { success: false, error: 'Não autorizado', message: 'Autenticação necessária.' },
    { status: 401 }
  );
}

describe('APIs críticas — públicas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/health retorna 200 e status ok', async () => {
    const { GET } = await import('@/app/api/health/route');
    const res = await GET();
    const { status, json } = await parseResponse(res);

    expect(status).toBe(200);
    expect(json).toMatchObject({ status: 'ok', service: 'Hub Control' });
  });

  it('GET /api/status retorna operational', async () => {
    const { GET } = await import('@/app/api/status/route');
    const res = await GET();
    const { status, json } = await parseResponse(res);

    expect(status).toBe(200);
    expect(json).toMatchObject({ status: 'operational' });
    expect(json).toHaveProperty('service.name', 'Hub Control');
  });
});

describe('APIs críticas — autenticação', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/auth/user retorna 401 sem sessão', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'no session' } });

    const { GET } = await import('@/app/api/auth/user/route');
    const res = await GET(createRequest('/api/auth/user'));
    const { status, json } = await parseResponse(res);

    expect(status).toBe(401);
    expect(json).toMatchObject({ success: false, user: null });
  });

  it('GET /api/notifications/in-app retorna 401 sem usuário', async () => {
    mockRequireApiUser.mockResolvedValue({ user: null, error: userDenied() });

    const { GET } = await import('@/app/api/notifications/in-app/route');
    const res = await GET(createRequest('/api/notifications/in-app'));
    expect(res.status).toBe(401);
  });

  it('GET /api/notifications/in-app bloqueia IDOR (userId de outro usuário)', async () => {
    mockRequireApiUser.mockResolvedValue({
      user: { id: 'user-a', email: 'a@test.com' },
      error: null,
    });

    const { GET } = await import('@/app/api/notifications/in-app/route');
    const res = await GET(
      createRequest('/api/notifications/in-app?userId=user-b')
    );
    const { status, json } = await parseResponse(res);

    expect(status).toBe(403);
    expect(json).toMatchObject({ error: 'Acesso negado' });
    expect(mockCreateAuthenticatedApiClient).not.toHaveBeenCalled();
  });

  it('GET /api/notifications/in-app consulta apenas o usuário autenticado', async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [{ id: 'n1', user_id: 'user-a' }],
      error: null,
    });
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit,
    };
    mockRequireApiUser.mockResolvedValue({
      user: { id: 'user-a', email: 'a@test.com' },
      error: null,
    });
    mockCreateAuthenticatedApiClient.mockResolvedValue({
      from: jest.fn(() => chain),
    });

    const { GET } = await import('@/app/api/notifications/in-app/route');
    const res = await GET(createRequest('/api/notifications/in-app'));
    const { status, json } = await parseResponse<{ notifications: unknown[]; success: boolean }>(
      res
    );

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-a');
  });

  it('POST /api/notifications/mark-read retorna 400 sem notificationId', async () => {
    mockRequireApiUser.mockResolvedValue({
      user: { id: 'user-a' },
      error: null,
    });

    const { POST } = await import('@/app/api/notifications/mark-read/route');
    const res = await POST(createRequest('/api/notifications/mark-read', { method: 'POST', body: {} }));
    const { status, json } = await parseResponse(res);

    expect(status).toBe(400);
    expect(json).toMatchObject({ error: 'notificationId é obrigatório' });
  });
});

describe('APIs críticas — admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('DELETE /api/cache exige admin', async () => {
    mockRequireApiAdmin.mockResolvedValue({ user: null, error: adminDenied() });

    const { DELETE } = await import('@/app/api/cache/route');
    const res = await DELETE(createRequest('/api/cache', { method: 'DELETE' }));
    expect(res.status).toBe(403);
  });

  it('POST /api/cache exige admin', async () => {
    mockRequireApiAdmin.mockResolvedValue({ user: null, error: adminDenied() });

    const { POST } = await import('@/app/api/cache/route');
    const res = await POST(createRequest('/api/cache', { method: 'POST' }));
    expect(res.status).toBe(403);
  });

  it('POST /api/initialize-services exige admin', async () => {
    mockRequireApiAdmin.mockResolvedValue({ user: null, error: adminDenied() });

    const { POST } = await import('@/app/api/initialize-services/route');
    const res = await POST(createRequest('/api/initialize-services', { method: 'POST' }));
    expect(res.status).toBe(403);
  });

  it('POST /api/initialize-services retorna sucesso para admin', async () => {
    mockRequireApiAdmin.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@test.com' },
      error: null,
    });

    const { POST } = await import('@/app/api/initialize-services/route');
    const res = await POST(createRequest('/api/initialize-services', { method: 'POST' }));
    const { status, json } = await parseResponse(res);

    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true });
  });
});

describe('APIs críticas — webhooks', () => {
  const thebestSecret = 'thebest-test-secret-16';
  const gates2bSecret = 'gates2b-test-secret-16';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
    process.env.THEBEST_WEBHOOK_SECRET = thebestSecret;
    process.env.GATES2B_WEBHOOK_SECRET = gates2bSecret;
    process.env.BPIX_WEBHOOK_SECRET = gates2bSecret;
    mockIsPaymentProcessed.mockResolvedValue(false);
    mockProcessAutoRenewal.mockResolvedValue({ success: true, renewal_id: 'r1' });
    mockProcessWebhook.mockResolvedValue({ success: true });
  });

  function hmacHex(body: string, secret: string) {
    return crypto.createHmac('sha256', secret).update(body).digest('hex');
  }

  it('POST /api/thebest/webhook/payment rejeita sem assinatura', async () => {
    mockHeaders.mockResolvedValue({
      get: (name: string) => (name === 'x-webhook-signature' ? null : null),
    });

    const payload = JSON.stringify({
      user_id: 'u1',
      package_id: 'pkg1',
      payment_id: 'pay1',
      amount: 10,
      payment_method: 'pix',
      transaction_id: 'tx1',
    });

    const { POST } = await import('@/app/api/thebest/webhook/payment/route');
    const res = await POST(
      createRequest('/api/thebest/webhook/payment', {
        method: 'POST',
        body: payload,
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(res.status).toBe(401);
  });

  it('POST /api/thebest/webhook/payment rejeita payload inválido com assinatura válida', async () => {
    const payload = JSON.stringify({ foo: 'bar' });
    mockHeaders.mockResolvedValue({
      get: (name: string) =>
        name === 'x-webhook-signature' ? `sha256=${hmacHex(payload, thebestSecret)}` : null,
    });

    const { POST } = await import('@/app/api/thebest/webhook/payment/route');
    const res = await POST(
      createRequest('/api/thebest/webhook/payment', {
        method: 'POST',
        body: payload,
        headers: { 'content-type': 'application/json' },
      })
    );

    expect(res.status).toBe(400);
  });

  it('POST /api/gates2b/webhook rejeita assinatura inválida', async () => {
    const payload = JSON.stringify({
      event: 'payment.paid',
      payment_id: 'p1',
      transaction_id: 't1',
      status: 'paid',
      amount: 99,
    });

    mockHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'x-gates2b-signature') return 'sha256=deadbeef';
        if (name === 'content-type') return 'application/json';
        return null;
      },
    });

    const { POST } = await import('@/app/api/gates2b/webhook/route');
    const res = await POST(
      createRequest('/api/gates2b/webhook', {
        method: 'POST',
        body: payload,
        headers: { 'content-type': 'application/json' },
      })
    );
    const { status, json } = await parseResponse(res);

    expect(status).toBe(401);
    expect(json).toMatchObject({ error: 'INVALID_SIGNATURE' });
  });

  it('POST /api/gates2b/webhook rejeita Content-Type não-JSON', async () => {
    const body = 'not-json';
    const sig = `sha256=${hmacHex(body, gates2bSecret)}`;

    mockHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'x-gates2b-signature') return sig;
        if (name === 'content-type') return 'text/plain';
        return null;
      },
    });

    const { POST } = await import('@/app/api/gates2b/webhook/route');
    const res = await POST(
      createRequest('/api/gates2b/webhook', {
        method: 'POST',
        body,
        headers: { 'content-type': 'text/plain' },
      })
    );
    const { status, json } = await parseResponse(res);

    expect(status).toBe(400);
    expect(json).toMatchObject({ error: 'INVALID_CONTENT_TYPE' });
  });

  it('POST /api/gates2b/webhook aceita payload válido com HMAC correto', async () => {
    const payload = JSON.stringify({
      event: 'payment.paid',
      payment_id: 'p1',
      transaction_id: 't1',
      status: 'paid',
      amount: 99,
    });
    const sig = `sha256=${hmacHex(payload, gates2bSecret)}`;

    mockHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'x-gates2b-signature') return sig;
        if (name === 'content-type') return 'application/json';
        return null;
      },
    });

    const { POST } = await import('@/app/api/gates2b/webhook/route');
    const res = await POST(
      createRequest('/api/gates2b/webhook', {
        method: 'POST',
        body: payload,
        headers: { 'content-type': 'application/json' },
      })
    );
    const { status, json } = await parseResponse(res);

    expect(status).toBe(200);
    expect(json).toMatchObject({ success: true });
    expect(mockProcessWebhook).toHaveBeenCalled();
  });
});
