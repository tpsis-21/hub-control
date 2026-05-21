import { NextResponse } from 'next/server';
import {
  buildRateLimitHeaders,
  rateLimitCustom,
  type RateLimitResult,
} from '@/lib/security/rate-limit';
import type { NextRequest } from 'next/server';

export function jsonRateLimited(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { success: false, message: 'Muitas requisições. Aguarde e tente novamente.' },
    { status: 429, headers: buildRateLimitHeaders(result) }
  );
}

/** Rate limit para checkout público (por IP). */
export async function enforcePublicCheckoutRateLimit(
  request: NextRequest
): Promise<RateLimitResult> {
  return rateLimitCustom(request, {
    namespace: 'checkout-public',
    windowMs: 60 * 1000,
    max: 30,
  });
}
