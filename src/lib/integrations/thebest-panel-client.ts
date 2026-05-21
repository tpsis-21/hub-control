import {
  getTheBestBaseUrl,
  THEBEST_DEFAULT_TIMEOUT_MS,
  type TheBestProxyAction,
} from '@/lib/integrations/thebest-constants'
import { PAINEL_BEST_PATHS } from '@/config/thebest-api'

export type TheBestPanelCredentials = {
  apiKey: string
  apiSecret?: string
  baseUrl?: string
  timeoutMs?: number
}

export type PainelBestPackage = {
  id: number
  name: string
  is_trial: boolean
  is_official: boolean
  trial_credits: number
  official_credits: number
  trial_duration_in?: string
  trial_duration?: number
  official_duration_in?: string
  official_duration?: number
}

export type PainelBestPaginated<T> = {
  count: number
  results: T[]
  current_page?: number
  per_page?: number
}

export type PainelBestRequestResult<T = unknown> = {
  ok: boolean
  status: number
  data: T | string | null
}

function buildAuthHeaders(credentials: TheBestPanelCredentials): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'Hub-Control/1.0',
    'Api-Key': credentials.apiKey,
    Authorization: `Bearer ${credentials.apiKey}`,
  }
  if (credentials.apiSecret?.trim()) {
    headers['X-API-Secret'] = credentials.apiSecret.trim()
  }
  return headers
}

function resolveBaseUrl(credentials: TheBestPanelCredentials): string {
  return (credentials.baseUrl || getTheBestBaseUrl()).replace(/\/$/, '')
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const url = new URL(`${baseUrl}${normalizedPath}`)
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

export async function painelBestRequest<T = unknown>(
  credentials: TheBestPanelCredentials,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    path: string
    body?: Record<string, unknown>
    query?: Record<string, string | number | boolean | undefined>
  }
): Promise<PainelBestRequestResult<T>> {
  const baseUrl = resolveBaseUrl(credentials)
  const timeout = credentials.timeoutMs ?? THEBEST_DEFAULT_TIMEOUT_MS
  const url = buildUrl(baseUrl, options.path, options.query)

  const init: RequestInit = {
    method: options.method,
    headers: buildAuthHeaders(credentials),
    signal: AbortSignal.timeout(timeout),
  }

  if (options.body && options.method !== 'GET') {
    init.body = JSON.stringify(options.body)
  }

  const response = await fetch(url, init)
  const text = await response.text()

  let data: T | string | null = text
  if (text) {
    try {
      data = JSON.parse(text) as T
    } catch {
      data = text
    }
  } else {
    data = null
  }

  return { ok: response.ok, status: response.status, data }
}

export async function getPainelBestCurrentUser(
  credentials: TheBestPanelCredentials
) {
  return painelBestRequest(credentials, {
    method: 'GET',
    path: PAINEL_BEST_PATHS.user,
  })
}

export async function listPainelBestPackages(
  credentials: TheBestPanelCredentials,
  query?: { is_trial?: boolean; per_page?: number; page?: number }
) {
  return painelBestRequest<PainelBestPaginated<PainelBestPackage>>(credentials, {
    method: 'GET',
    path: PAINEL_BEST_PATHS.packages,
    query: {
      per_page: query?.per_page ?? 200,
      page: query?.page ?? 1,
      is_trial: query?.is_trial,
    },
  })
}

export async function renewPainelBestLine(
  credentials: TheBestPanelCredentials,
  lineId: number | string,
  months: number
) {
  return painelBestRequest(credentials, {
    method: 'POST',
    path: PAINEL_BEST_PATHS.lineRenew(lineId),
    body: { months },
  })
}

export async function getPainelBestRenewCost(
  credentials: TheBestPanelCredentials,
  lineId: number | string,
  months: number
) {
  return painelBestRequest(credentials, {
    method: 'GET',
    path: PAINEL_BEST_PATHS.lineRenewCost(lineId),
    query: { months },
  })
}

export async function createPainelBestTrialLine(
  credentials: TheBestPanelCredentials,
  payload: {
    package_id: number
    username?: string
    password?: string
    notes?: string
    email?: string
    phone?: string
  }
) {
  return painelBestRequest(credentials, {
    method: 'POST',
    path: PAINEL_BEST_PATHS.createTrial,
    body: payload,
  })
}

export async function listPainelBestLines(
  credentials: TheBestPanelCredentials,
  query?: { search?: string; per_page?: number; page?: number }
) {
  return painelBestRequest(credentials, {
    method: 'GET',
    path: PAINEL_BEST_PATHS.lines,
    query: {
      per_page: query?.per_page ?? 50,
      page: query?.page ?? 1,
      search: query?.search,
    },
  })
}

function resolveRenewMonths(body: Record<string, unknown>): number {
  if (typeof body.months === 'number' && body.months >= 1) return body.months
  const duration = body.duration
  if (typeof duration === 'number' && duration >= 1) return duration
  if (typeof duration === 'string') {
    const parsed = parseInt(duration, 10)
    if (!Number.isNaN(parsed) && parsed >= 1) return parsed
  }
  return 1
}

function resolveLineId(body: Record<string, unknown>): string | null {
  const candidates = [body.line_id, body.lineId, body.client_id, body.clientId]
  for (const value of candidates) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  const userId = body.user_id ?? body.userId
  if (userId !== undefined && userId !== null) {
    const asString = String(userId).trim()
    if (/^\d+$/.test(asString)) return asString
  }
  return null
}

/** Compatibilidade com proxy legado (`?action=...`). */
export async function callTheBestPanel<T = unknown>(
  credentials: TheBestPanelCredentials,
  action: TheBestProxyAction,
  body: Record<string, unknown> = {},
  method: 'GET' | 'POST' = 'POST'
): Promise<PainelBestRequestResult<T>> {
  switch (action) {
    case 'test_connection':
      return getPainelBestCurrentUser(credentials) as Promise<
        PainelBestRequestResult<T>
      >

    case 'get_packages':
    case 'sync_packages':
      return listPainelBestPackages(credentials, {
        is_trial:
          typeof body.is_trial === 'boolean' ? body.is_trial : undefined,
        per_page:
          typeof body.per_page === 'number' ? body.per_page : undefined,
      }) as Promise<PainelBestRequestResult<T>>

    case 'create_renewal':
    case 'renew_line': {
      const lineId = resolveLineId(body)
      if (!lineId) {
        return {
          ok: false,
          status: 400,
          data: {
            error: 'Informe line_id (ID do cliente no painel) e months',
          } as T,
        }
      }
      return renewPainelBestLine(
        credentials,
        lineId,
        resolveRenewMonths(body)
      ) as Promise<PainelBestRequestResult<T>>
    }

    case 'create_trial': {
      const packageId = body.package_id ?? body.packageId
      if (packageId === undefined || packageId === null) {
        return {
          ok: false,
          status: 400,
          data: { error: 'package_id é obrigatório para criar teste' } as T,
        }
      }
      return createPainelBestTrialLine(credentials, {
        package_id: Number(packageId),
        username:
          typeof body.username === 'string' ? body.username : undefined,
        password:
          typeof body.password === 'string' ? body.password : undefined,
        notes: typeof body.notes === 'string' ? body.notes : undefined,
        email: typeof body.email === 'string' ? body.email : undefined,
        phone: typeof body.phone === 'string' ? body.phone : undefined,
      }) as Promise<PainelBestRequestResult<T>>
    }

    case 'get_renew_cost': {
      const lineId = resolveLineId(body)
      if (!lineId) {
        return {
          ok: false,
          status: 400,
          data: { error: 'line_id é obrigatório' } as T,
        }
      }
      return getPainelBestRenewCost(
        credentials,
        lineId,
        resolveRenewMonths(body)
      ) as Promise<PainelBestRequestResult<T>>
    }

    case 'list_lines':
    case 'get_user_renewals':
      return listPainelBestLines(credentials, {
        search:
          typeof body.search === 'string'
            ? body.search
            : typeof body.username === 'string'
              ? body.username
              : undefined,
        per_page:
          typeof body.per_page === 'number' ? body.per_page : undefined,
      }) as Promise<PainelBestRequestResult<T>>

    case 'get_renewal_status':
    case 'cancel_renewal':
      return {
        ok: false,
        status: 501,
        data: {
          error: `Ação "${action}" não existe na API Painel Best. Use renew_line ou list_lines.`,
        } as T,
      }

    default:
      if (method === 'GET') {
        return listPainelBestPackages(credentials) as Promise<
          PainelBestRequestResult<T>
        >
      }
      return {
        ok: false,
        status: 400,
        data: { error: `Ação não suportada: ${action}` } as T,
      }
  }
}

export async function testTheBestPanelConnection(
  credentials: TheBestPanelCredentials
): Promise<{
  success: boolean
  message: string
  status?: number
  latencyMs?: number
  profile?: unknown
}> {
  const started = Date.now()

  try {
    const result = await getPainelBestCurrentUser(credentials)
    const latencyMs = Date.now() - started

    if (result.ok) {
      return {
        success: true,
        message: 'Conexão com Painel Best estabelecida',
        status: result.status,
        latencyMs,
        profile: result.data,
      }
    }

    if (result.status === 401 || result.status === 403) {
      return {
        success: false,
        message: 'Chave de API inválida ou sem permissão',
        status: result.status,
        latencyMs,
      }
    }

    const packagesProbe = await listPainelBestPackages(credentials, {
      per_page: 1,
    })
    if (packagesProbe.ok) {
      return {
        success: true,
        message: 'Conexão com Painel Best estabelecida (via pacotes)',
        status: packagesProbe.status,
        latencyMs: Date.now() - started,
      }
    }

    return {
      success: false,
      message: `Falha na conexão (${result.status})`,
      status: result.status,
      latencyMs,
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Erro de rede com o Painel Best',
      latencyMs: Date.now() - started,
    }
  }
}
