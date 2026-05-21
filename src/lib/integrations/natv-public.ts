/** Constantes NATV seguras para o cliente (sem URL da API). */

export const NATV_DEFAULT_TIMEOUT_MS = 30_000

/** Duração padrão de teste (4h), alinhada ao fluxo de clientes. */
export const NATV_DEFAULT_TEST_MINUTES = 240

export const NATV_API_ENDPOINTS = {
  createUser: '/user',
  activation: '/user/activation',
  search: '/user/search',
  test: '/test',
} as const
