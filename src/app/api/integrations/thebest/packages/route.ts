import { NextRequest, NextResponse } from 'next/server'
import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import {
  getActiveTheBestConfig,
  migrateLegacyIntegrationConfig,
} from '@/lib/integrations/thebest-config-store'
import {
  listPainelBestPackages,
  type PainelBestPaginated,
  type PainelBestPackage,
} from '@/lib/integrations/thebest-panel-client'
import { THEBEST_DEFAULT_TIMEOUT_MS } from '@/lib/integrations/thebest-constants'
import {
  mapPainelBestPackageToDb,
  mapPainelBestPackageToUi,
} from '@/lib/integrations/painel-best-package-sync'

function extractResults(
  data: PainelBestPaginated<PainelBestPackage> | PainelBestPackage[] | null
): PainelBestPackage[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  return data.results ?? []
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createApiSupabaseClient(false)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    let config = await getActiveTheBestConfig(supabase, user.id)
    if (!config) {
      config = await migrateLegacyIntegrationConfig(supabase, user.id)
    }

    if (!config?.api_key) {
      return NextResponse.json(
        {
          success: false,
          error: 'NO_THEBEST_CONFIG',
          message: 'Configure a chave Api-Key do Painel Best em Integrações.',
        },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const isTrial = searchParams.get('is_trial')
    const sync = searchParams.get('sync') === 'true'

    const panelResult = await listPainelBestPackages(
      {
        apiKey: config.api_key,
        apiSecret: config.api_secret ?? undefined,
        baseUrl: config.api_url,
        timeoutMs: THEBEST_DEFAULT_TIMEOUT_MS,
      },
      {
        is_trial: isTrial === 'true' ? true : isTrial === 'false' ? false : undefined,
        per_page: 200,
      }
    )

    if (!panelResult.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAINEL_BEST_API_ERROR',
          message: 'Falha ao listar pacotes no Painel Best',
          status: panelResult.status,
          details: panelResult.data,
        },
        { status: panelResult.status >= 400 ? panelResult.status : 502 }
      )
    }

    const packages = extractResults(
      panelResult.data as
        | PainelBestPaginated<PainelBestPackage>
        | PainelBestPackage[]
    )

    if (sync) {
      const now = new Date().toISOString()
      for (const pkg of packages) {
        const row = mapPainelBestPackageToDb(pkg)
        await supabase.from('thebest_packages').upsert(
          {
            config_id: config.id,
            external_id: row.external_id,
            name: row.name,
            classificacao: row.classificacao,
            duracao: row.duracao,
            telas: row.telas,
            creditos: row.creditos,
            description: row.description ?? null,
            is_active: true,
            is_available: true,
            last_sync_at: now,
            updated_at: now,
          },
          { onConflict: 'config_id,external_id' }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: packages.map(mapPainelBestPackageToUi),
      count: packages.length,
      synced: sync,
    })
  } catch (error) {
    console.error('Erro ao listar pacotes Painel Best:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
