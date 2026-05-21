import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  buildRateLimitHeaders,
  getClientIP,
  rateLimitCustom,
  type RateLimitResult,
} from '@/lib/security/rate-limit';
import { LoggerService } from '@/services/logger.service';

/** Limite mais restrito para enumeração de links inválidos (por IP). */
export async function enforceInvalidUniqueLinkRateLimit(
  request: NextRequest
): Promise<RateLimitResult> {
  return rateLimitCustom(request, {
    namespace: 'checkout-invalid-link',
    windowMs: 60 * 1000,
    max: 10,
  });
}

export function jsonInvalidLinkRateLimited(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { success: false, message: 'Muitas tentativas inválidas. Aguarde e tente novamente.' },
    { status: 429, headers: buildRateLimitHeaders(result) }
  );
}

/**
 * Aplica rate limit dedicado quando o cliente não existe para o unique_link.
 * Retorna resposta 429 ou null (caller segue com 404 genérico).
 */
export async function guardInvalidCheckoutUniqueLink(
  request: NextRequest,
  uniqueLink: string
): Promise<NextResponse | null> {
  const result = await enforceInvalidUniqueLinkRateLimit(request);
  if (!result.success) {
    LoggerService.warn('Rate limit: tentativas com unique_link inválido', 'CheckoutPublic', {
      ip: getClientIP(request),
      uniqueLinkPrefix: uniqueLink.slice(0, 32),
    });
    return jsonInvalidLinkRateLimited(result);
  }

  LoggerService.warn('Cliente não encontrado para unique_link', 'CheckoutPublic', {
    ip: getClientIP(request),
    uniqueLinkPrefix: uniqueLink.slice(0, 32),
  });
  return null;
}
