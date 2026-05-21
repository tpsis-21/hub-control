import { getTheBestBaseUrl } from '@/lib/integrations/server-base-urls'

/** @deprecated Use getTheBestBaseUrl() — API em api.painel.best */
export const THEBEST_DEFAULT_BASE_URL = 'https://api.painel.best'

export const THEBEST_DEFAULT_TIMEOUT_MS = 30_000

/** Ações expostas pelo proxy `/api/proxy/thebest` (mapeadas para REST Painel Best). */
export const THEBEST_PROXY_ACTIONS = [
  'get_packages',
  'sync_packages',
  'create_renewal',
  'renew_line',
  'create_trial',
  'get_renew_cost',
  'list_lines',
  'get_user_renewals',
  'get_renewal_status',
  'cancel_renewal',
  'test_connection',
] as const

export type TheBestProxyAction = (typeof THEBEST_PROXY_ACTIONS)[number]

export { getTheBestBaseUrl }

export function normalizeTheBestBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '')
  const legacyHosts = [
    'https://api.thebest.com',
    'https://api.thebest.com.br',
    'http://api.thebest.com',
    'http://api.thebest.com.br',
    'https://iejuf.one',
    'http://iejuf.one',
  ]
  if (legacyHosts.includes(trimmed)) {
    return getTheBestBaseUrl()
  }
  return trimmed || getTheBestBaseUrl()
}
