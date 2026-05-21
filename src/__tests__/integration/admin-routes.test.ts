/**
 * @jest-environment node
 *
 * Rotas admin — 403 sem permissão (P0.2 / P1.1)
 */
import { NextResponse } from 'next/server';
import { createRequest, parseResponse } from './helpers/test-request';

const mockRequireApiAdmin = jest.fn();

jest.mock('@/lib/api-auth', () => ({
  requireApiAdmin: (...args: unknown[]) => mockRequireApiAdmin(...args),
}));

function adminDenied(status = 403) {
  return NextResponse.json(
    {
      success: false,
      error: status === 403 ? 'Acesso negado' : 'Não autorizado',
      message: 'Permissão de administrador necessária.',
    },
    { status }
  );
}

describe('Rotas admin — acesso negado sem role admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireApiAdmin.mockResolvedValue({ user: null, error: adminDenied() });
  });

  it('PUT /api/admin/plan-groups retorna 403', async () => {
    const { PUT } = await import('@/app/api/admin/plan-groups/route');
    const res = await PUT(
      createRequest('/api/admin/plan-groups', {
        method: 'PUT',
        body: {
          id: '00000000-0000-4000-8000-000000000001',
          name: 'Grupo Teste',
        },
      })
    );
    expect(res.status).toBe(403);
  });

  it('DELETE /api/admin/plan-groups retorna 403', async () => {
    const { DELETE } = await import('@/app/api/admin/plan-groups/route');
    const res = await DELETE(
      createRequest('/api/admin/plan-groups?id=00000000-0000-4000-8000-000000000001', {
        method: 'DELETE',
      })
    );
    expect(res.status).toBe(403);
  });

  it('POST /api/admin/database-operations retorna 403 (auth)', async () => {
    const { POST } = await import('@/app/api/admin/database-operations/route');
    const res = await POST(
      createRequest('/api/admin/database-operations', {
        method: 'POST',
        body: { table: 'profiles', operation: 'select' },
      })
    );
    expect(res.status).toBe(403);
  });

  it('GET /api/cache retorna 403', async () => {
    const { GET } = await import('@/app/api/cache/route');
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('POST /api/marketing/send-campaign retorna 403', async () => {
    const { POST } = await import('@/app/api/marketing/send-campaign/route');
    const res = await POST(
      createRequest('/api/marketing/send-campaign', {
        method: 'POST',
        body: { campaignId: '00000000-0000-4000-8000-000000000002' },
      })
    );
    expect(res.status).toBe(403);
  });
});

describe('database-operations — descontinuado mesmo para admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireApiAdmin.mockResolvedValue({
      user: { id: 'admin-1', email: 'admin@test.com' },
      error: null,
    });
  });

  it('POST /api/admin/database-operations retorna 403 com mensagem de descontinuação', async () => {
    const { POST } = await import('@/app/api/admin/database-operations/route');
    const res = await POST(
      createRequest('/api/admin/database-operations', { method: 'POST', body: {} })
    );
    const { status, json } = await parseResponse<{ error: string }>(res);

    expect(status).toBe(403);
    expect(json.error).toMatch(/descontinuado/i);
  });
});
