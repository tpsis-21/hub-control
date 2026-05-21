/**
 * @jest-environment node
 */
import crypto from 'crypto';
import { verifyHmacSha256 } from '@/lib/webhook-auth';

describe('webhook-auth (integração)', () => {
  const secret = 'test-webhook-secret-32chars-min';
  const body = '{"event":"payment.paid","payment_id":"p1"}';

  function sign(payload: string, prefix = 'sha256=') {
    const hex = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return `${prefix}${hex}`;
  }

  it('aceita assinatura HMAC válida com prefixo sha256=', () => {
    expect(verifyHmacSha256(body, sign(body), secret)).toBe(true);
  });

  it('aceita assinatura HMAC válida sem prefixo', () => {
    const hex = crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyHmacSha256(body, hex, secret)).toBe(true);
  });

  it('rejeita assinatura inválida', () => {
    expect(verifyHmacSha256(body, sign(body) + 'ff', secret)).toBe(false);
  });

  it('rejeita quando secret ou signature ausentes', () => {
    expect(verifyHmacSha256(body, null, secret)).toBe(false);
    expect(verifyHmacSha256(body, sign(body), '')).toBe(false);
  });

  it('rejeita tampering do body', () => {
    expect(verifyHmacSha256(body + 'x', sign(body), secret)).toBe(false);
  });
});
