import type { User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { requireApiAdmin } from '@/lib/api-auth';
import {
  attachSecurityHeaders,
  createStandardErrorResponse,
} from '@/middleware/shared/helpers';

type AdminRouteAuth =
  | { user: User; error: null }
  | { user: null; error: NextResponse };

/** Auth admin para rotas que usam createStandardErrorResponse + attachSecurityHeaders. */
export async function requireAdminForStandardRoute(): Promise<AdminRouteAuth> {
  const auth = await requireApiAdmin();
  if (auth.error) {
    const status = auth.error.status ?? 401;
    const forbidden = status === 403;
    return {
      user: null,
      error: attachSecurityHeaders(
        createStandardErrorResponse(
          forbidden ? 'FORBIDDEN' : 'UNAUTHORIZED',
          forbidden ? 'Acesso negado - apenas administradores' : 'Não autorizado',
          status
        )
      ),
    };
  }
  return { user: auth.user, error: null };
}
