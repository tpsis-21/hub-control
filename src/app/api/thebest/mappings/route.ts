import { NextRequest, NextResponse } from 'next/server';
import { requireApiUser, createAuthenticatedApiClient } from '@/lib/api-auth';
import {
  loadTheBestMappingBundle,
  resolveActiveTheBestConfigId,
  toMappingInsertPayload,
  toMappingUpdatePayload,
  type MappingWriteInput,
} from '@/lib/thebest-mapping-server';
import { logger } from '@/lib/logger';

export async function GET() {
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
          message: 'Configure a integração TheBest antes de gerenciar mapeamentos.',
        },
        { status: 404 }
      );
    }

    const data = await loadTheBestMappingBundle(supabase, configId);

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        config: {
          auto_sync_enabled: false,
          sync_interval: 300,
          notification_enabled: true,
          backup_enabled: true,
        },
      },
    });
  } catch (error) {
    logger.error(
      'Erro ao carregar mapeamentos TheBest',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Erro ao carregar mapeamentos.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const body = await request.json();
    const mapping = body?.mapping as MappingWriteInput | undefined;

    if (!mapping?.thebest_package_id || !mapping?.hubcontrol_plan_id) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD', message: 'Pacote e plano são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = await createAuthenticatedApiClient();
    const configId = await resolveActiveTheBestConfigId(supabase, auth.user.id);

    if (!configId) {
      return NextResponse.json(
        { success: false, error: 'NO_THEBEST_CONFIG', message: 'Configuração TheBest não encontrada.' },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from('thebest_plan_mappings')
      .insert(toMappingInsertPayload(configId, auth.user.id, mapping))
      .select('id')
      .single();

    if (error) {
      logger.error('Erro ao criar mapeamento', error);
      return NextResponse.json(
        { success: false, error: 'CREATE_FAILED', message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data: { id: data.id } }, { status: 201 });
  } catch (error) {
    logger.error(
      'Erro POST mapeamentos TheBest',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Erro ao criar mapeamento.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const body = await request.json();
    const id = body?.id as string | undefined;
    const mapping = body?.mapping as MappingWriteInput | undefined;

    if (!id || !mapping) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD', message: 'ID e dados do mapeamento são obrigatórios.' },
        { status: 400 }
      );
    }

    const supabase = await createAuthenticatedApiClient();
    const configId = await resolveActiveTheBestConfigId(supabase, auth.user.id);

    if (!configId) {
      return NextResponse.json(
        { success: false, error: 'NO_THEBEST_CONFIG', message: 'Configuração TheBest não encontrada.' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('thebest_plan_mappings')
      .update(toMappingUpdatePayload(auth.user.id, mapping))
      .eq('id', id)
      .eq('config_id', configId);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'UPDATE_FAILED', message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Erro PUT mapeamentos TheBest',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Erro ao atualizar mapeamento.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireApiUser();
    if (auth.error) return auth.error;

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PAYLOAD', message: 'Parâmetro id é obrigatório.' },
        { status: 400 }
      );
    }

    const supabase = await createAuthenticatedApiClient();
    const configId = await resolveActiveTheBestConfigId(supabase, auth.user.id);

    if (!configId) {
      return NextResponse.json(
        { success: false, error: 'NO_THEBEST_CONFIG', message: 'Configuração TheBest não encontrada.' },
        { status: 404 }
      );
    }

    const { error } = await supabase
      .from('thebest_plan_mappings')
      .delete()
      .eq('id', id)
      .eq('config_id', configId);

    if (error) {
      return NextResponse.json(
        { success: false, error: 'DELETE_FAILED', message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      'Erro DELETE mapeamentos TheBest',
      error instanceof Error ? error : new Error(String(error))
    );
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Erro ao remover mapeamento.' },
      { status: 500 }
    );
  }
}
