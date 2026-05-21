import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/api-auth';
import { logger } from '@/lib/logger';

/**
 * Endpoint genérico descontinuado (P0 segurança).
 * Use rotas admin específicas em /api/admin/*.
 */
export async function POST() {
  const auth = await requireApiAdmin();
  if (auth.error) return auth.error;

  logger.warn('Tentativa de uso de database-operations descontinuado', {
    userId: auth.user.id,
  });

  return NextResponse.json(
    {
      error:
        'Operação não permitida. Este endpoint foi descontinuado por segurança. Use APIs admin específicas.',
    },
    { status: 403 }
  );
}
