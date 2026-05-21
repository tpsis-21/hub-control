import type { SupabaseClient } from '@supabase/supabase-js'
import {
  getTheBestBaseUrl,
  THEBEST_DEFAULT_TIMEOUT_MS,
} from '@/lib/integrations/thebest-constants'

export type TheBestStoredConfig = {
  id: string
  user_id: string
  api_url: string
  api_key: string
  api_secret: string | null
  name: string
  description: string | null
  is_active: boolean
  is_default: boolean | null
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export type TheBestConfigPayload = {
  apiKey: string
  apiSecret?: string
  name?: string
  timeoutMs?: number
}

export async function getActiveTheBestConfig(
  supabase: SupabaseClient,
  userId: string
): Promise<TheBestStoredConfig | null> {
  const { data, error } = await supabase
    .from('thebest_configs')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  return (data as TheBestStoredConfig | null) ?? null
}

export async function upsertTheBestConfig(
  supabase: SupabaseClient,
  userId: string,
  payload: TheBestConfigPayload
): Promise<TheBestStoredConfig> {
  const apiKey = payload.apiKey.trim()
  if (!apiKey) {
    throw new Error('Chave da API TheBest é obrigatória')
  }

  const existing = await getActiveTheBestConfig(supabase, userId)
  const now = new Date().toISOString()
  const row = {
    user_id: userId,
    api_url: getTheBestBaseUrl(),
    api_key: apiKey,
    api_secret: payload.apiSecret?.trim() || null,
    name: payload.name?.trim() || 'TheBest',
    description: 'Integração Hub Control',
    is_active: true,
    is_default: true,
    updated_at: now,
    updated_by: userId,
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('thebest_configs')
      .update(row)
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error) throw error
    return data as TheBestStoredConfig
  }

  const { data, error } = await supabase
    .from('thebest_configs')
    .insert({
      ...row,
      created_at: now,
      created_by: userId,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as TheBestStoredConfig
}

export async function deactivateTheBestConfig(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('thebest_configs')
    .update({
      is_active: false,
      is_default: false,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) throw error
}

/** Migra registro legado de integration_configs → thebest_configs (uma vez). */
export async function migrateLegacyIntegrationConfig(
  supabase: SupabaseClient,
  userId: string
): Promise<TheBestStoredConfig | null> {
  const active = await getActiveTheBestConfig(supabase, userId)
  if (active) return active

  const { data: legacy, error } = await supabase
    .from('integration_configs')
    .select('auth_token, auth_type, config_data')
    .eq('provider', 'thebest')
    .eq('created_by', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  if (!legacy?.auth_token) return null

  const configData = (legacy.config_data as Record<string, unknown> | null) ?? {}
  const timeoutMs =
    typeof configData.timeout === 'number' ? configData.timeout : undefined

  return upsertTheBestConfig(supabase, userId, {
    apiKey: String(legacy.auth_token),
    timeoutMs,
  })
}
