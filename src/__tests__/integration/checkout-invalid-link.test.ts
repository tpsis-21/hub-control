/**
 * @jest-environment node
 */
import { createRequest, parseResponse } from './helpers/test-request';

const mockFrom = jest.fn();
const mockGuardInvalid = jest.fn();
const mockEnforceCheckoutRateLimit = jest.fn();

jest.mock('@/lib/supabase/unified-client', () => ({
  createApiSupabaseClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

jest.mock('@/lib/checkout-invalid-link-rate-limit', () => ({
  guardInvalidCheckoutUniqueLink: (...args: unknown[]) => mockGuardInvalid(...args),
}));

jest.mock('@/lib/rate-limit-response', () => {
  const actual = jest.requireActual('@/lib/rate-limit-response');
  return {
    ...actual,
    enforcePublicCheckoutRateLimit: (...args: unknown[]) =>
      mockEnforceCheckoutRateLimit(...args),
  };
});

function mockClientNotFound() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'clients') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      };
    }
    return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) };
  });
}

describe('Checkout público — unique_link inválido', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuardInvalid.mockResolvedValue(null);
    mockEnforceCheckoutRateLimit.mockResolvedValue({ success: true, remaining: 29 });
    mockClientNotFound();
  });

  it('GET /api/public/checkout/options retorna 404 para link inexistente', async () => {
    const { GET } = await import('@/app/api/public/checkout/options/route');
    const req = createRequest(
      'http://localhost/api/public/checkout/options?uniqueLink=link_inexistente_xyz'
    );
    const res = await GET(req);
    const { status, json } = await parseResponse<{ success: boolean }>(res);
    expect(status).toBe(404);
    expect(json.success).toBe(false);
    expect(mockGuardInvalid).toHaveBeenCalled();
  });

  it('POST /api/public/checkout/create retorna 429 quando rate limit excedido', async () => {
    mockEnforceCheckoutRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 60_000,
    });

    const { POST } = await import('@/app/api/public/checkout/create/route');
    const res = await POST(
      createRequest('/api/public/checkout/create', {
        method: 'POST',
        body: { uniqueLink: '/cliente/link_test', planId: '00000000-0000-4000-8000-000000000099' },
      })
    );
    const { status, json } = await parseResponse<{ success: boolean }>(res);

    expect(status).toBe(429);
    expect(json.success).toBe(false);
  });
});
