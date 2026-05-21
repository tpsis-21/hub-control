import { NextResponse } from 'next/server';
import { requireApiUser, createAuthenticatedApiClient } from '@/lib/api-auth';
import { resolveActiveTheBestConfigId } from '@/lib/thebest-mapping-server';
import { logger } from '@/lib/logger';

export async function POST() {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const supabase = await createAuthenticatedApiClient();
    const configId = await resolveActiveTheBestConfigId(supabase, auth.user.id);

    if (!configId) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_THEBEST_CONFIG',
          message: 'Configure a integração TheBest antes do auto-mapeamento.',
        },
        { status: 404 }
      );
    }

    const { data, error } = await supabase.rpc('auto_map_thebest_packages', {
      p_config_id: configId,
    });

    if (error) {
      logger.error('Erro auto_map_thebest_packages', error);
      return NextResponse.json(
        {
          success: false,
          error: 'AUTO_MAP_FAILED',
          message: error.message,
        },
        { status: 400 }
      );
    }

    const mappedCount = typeof data === 'number' ? data : Number(data ?? 0);

    return NextResponse.json({
      success: true,
      data: { mapped_count: mappedCount },
      message:
        mappedCount > 0
          ? `${mappedCount} pacote(s) mapeado(s) automaticamente.`
          : 'Nenhum pacote novo para mapear.',
    });
  } catch (error) {
    logger.error(
      'Erro auto-mapeamento TheBest',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Erro no auto-mapeamento.' },
      { status: 500 }
    );
  }
}
