/**
 * URLs base dos provedores integrados ao Hub Control.
 * Configure no `.env` / `.env.local` — evita alterar código quando o host mudar.
 *
 * Bpix é o nome legado do mesmo gateway **Gates2b** (mesma API e mesma URL).
 *
 * @see .env.example
 * @see docs/INTEGRACOES_URLS_ENV.md
 */

export type IntegrationProvider = 'natv' | 'thebest' | 'gates2b' | 'pixbot'

/** Alias legado — mesmo host que `gates2b`. */
export type IntegrationProviderLegacy = IntegrationProvider | 'bpix'

const DEFAULT_BASE_URLS: Record<IntegrationProvider, string> = {
  natv: 'https://revenda.pixbot.link',
  /** Painel Best — API REST oficial (painel web do revendedor pode ser outro host) */
  thebest: 'https://api.painel.best',
  /** Gates2b (Bpix é a mesma API; nome antigo mantido em webhooks/DB) */
  gates2b: 'https://api.gates2b.com',
  pixbot: '',
}

const ENV_KEYS: Record<IntegrationProvider, readonly string[]> = {
  natv: ['NATV_API_BASE_URL'],
  thebest: ['THEBEST_API_BASE_URL', 'NEXT_PUBLIC_THEBEST_API_BASE_URL'],
  gates2b: [
    'GATES2B_API_BASE_URL',
    'GATES2B_API_URL',
    'BPIX_API_BASE_URL',
    'BPIX_API_URL',
  ],
  pixbot: ['PIXBOT_API_BASE_URL'],
}

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/$/, '')
}

function readEnvUrl(keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return normalizeBaseUrl(value)
  }
  return undefined
}

function resolveProvider(
  provider: IntegrationProviderLegacy
): IntegrationProvider {
  return provider === 'bpix' ? 'gates2b' : provider
}

export function getIntegrationBaseUrl(
  provider: IntegrationProviderLegacy
): string {
  const resolved = resolveProvider(provider)
  return readEnvUrl(ENV_KEYS[resolved]) || DEFAULT_BASE_URLS[resolved]
}

export function getNatvBaseUrl(): string {
  return getIntegrationBaseUrl('natv')
}

export function getTheBestBaseUrl(): string {
  return getIntegrationBaseUrl('thebest')
}

/** URL da API Gates2b (Bpix usa o mesmo endpoint). */
export function getGates2bBaseUrl(): string {
  return getIntegrationBaseUrl('gates2b')
}

/** @deprecated Bpix = Gates2b — use `getGates2bBaseUrl`. */
export function getBpixBaseUrl(): string {
  return getGates2bBaseUrl()
}

export function getPixbotBaseUrl(): string {
  return getIntegrationBaseUrl('pixbot')
}

export function buildIntegrationUrl(
  provider: IntegrationProviderLegacy,
  path: string
): string {
  const base = getIntegrationBaseUrl(provider)
  if (!base) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}
