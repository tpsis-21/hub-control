/**
 * Validação de assinatura para webhooks externos (Fase 1 — Segurança)
 */

import crypto from 'crypto';

export function verifyHmacSha256(
  body: string,
  signature: string | null,
  secret: string,
  prefix = 'sha256='
): boolean {
  if (!signature || !secret) return false;

  try {
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const received = signature.startsWith(prefix)
      ? signature.slice(prefix.length)
      : signature;

    if (expected.length !== received.length) return false;

    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(received, 'hex')
    );
  } catch {
    return false;
  }
}

export function requireWebhookSecret(
  envKey: string,
  fallbackForbidden = true
): string | null {
  const secret = process.env[envKey];
  if (secret && secret.length >= 16) return secret;

  if (fallbackForbidden && process.env.NODE_ENV === 'production') {
    return null;
  }

  return null;
}
