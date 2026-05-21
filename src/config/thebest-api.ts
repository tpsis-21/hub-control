/**

 * Contrato da integração TheBest (Painel Best).

 * Documentação: https://api.painel.best/docs — schema em /schema/

 *

 * @see docs/PAINEL_BEST_API.md

 */



import {

  getTheBestBaseUrl,

  normalizeTheBestBaseUrl,

  THEBEST_DEFAULT_TIMEOUT_MS,

} from '@/lib/integrations/thebest-constants'



export {

  getTheBestBaseUrl,

  normalizeTheBestBaseUrl,

  THEBEST_DEFAULT_TIMEOUT_MS,

}



/** Endereço da API REST (não confundir com o painel web do revendedor). */

export const PAINEL_BEST_API_DOCS_URL = 'https://api.painel.best/docs'



/** Paths relativos à base `THEBEST_API_BASE_URL`. */

export const PAINEL_BEST_PATHS = {

  user: '/user/',

  packages: '/packages/',

  lines: '/lines/',

  createTrial: '/lines/create-trial/',

  line: (lineId: number | string) => `/lines/${lineId}/`,

  lineRenew: (lineId: number | string) => `/lines/${lineId}/renew/`,

  lineRenewCost: (lineId: number | string) => `/lines/${lineId}/renew-cost/`,

} as const



/** Teste de conectividade: perfil do revendedor autenticado. */

export const THEBEST_HEALTH_PATH = PAINEL_BEST_PATHS.user



export type TheBestPanelRequest = Record<string, unknown>


