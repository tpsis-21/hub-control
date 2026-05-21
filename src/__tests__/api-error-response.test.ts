import {
  isProductionRuntime,
  stripInternalDetailsForResponse,
} from '@/lib/api-error-response';

describe('api-error-response', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('remove details em 5xx em produção', () => {
    process.env.NODE_ENV = 'production';
    const body = stripInternalDetailsForResponse(
      { error: 'INTERNAL', details: 'stack trace aqui' },
      500
    );
    expect(body).toEqual({ error: 'INTERNAL' });
    expect('details' in body).toBe(false);
  });

  it('mantém details em desenvolvimento', () => {
    process.env.NODE_ENV = 'development';
    const body = stripInternalDetailsForResponse(
      { error: 'INTERNAL', details: 'debug' },
      500
    );
    expect(body.details).toBe('debug');
  });

  it('mantém details em 4xx em produção', () => {
    process.env.NODE_ENV = 'production';
    const body = stripInternalDetailsForResponse(
      { error: 'VALIDATION', details: [{ field: 'x' }] },
      400
    );
    expect(body.details).toBeDefined();
  });

  it('isProductionRuntime reflete NODE_ENV', () => {
    process.env.NODE_ENV = 'production';
    expect(isProductionRuntime()).toBe(true);
    process.env.NODE_ENV = 'test';
    expect(isProductionRuntime()).toBe(false);
  });
});
