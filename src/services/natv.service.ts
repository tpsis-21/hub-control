import { createApiSupabaseClient } from '@/lib/supabase/unified-client'
import { ErrorService, ErrorType } from './error.service'
import { logger } from '@/utils/production-logger'
import { HttpRetry, RetryPresets } from '@/lib/http-retry'
import { NATV_DEFAULT_TIMEOUT_MS } from '@/lib/integrations/natv-public'

// Interfaces para a API NATV
export interface NATVUser {
  id?: string
  username: string
  password: string
  email?: string
  phone?: string
  plan?: string
  duration?: number // em dias
  status?: 'active' | 'inactive' | 'expired'
  created_at?: string
  expires_at?: string
}

/** POST /user — senha gerada pela API; minutes em string conforme contrato NATV. */
export interface NATVCreateUserRequest {
  username?: string
  minutes: number | string
}

/** POST /user/activation — informar username ou user_id + months. */
export interface NATVActivationRequest {
  username?: string
  user_id?: number
  months: number
}

/** POST /user/search */
export interface NATVSearchRequest {
  username?: string
  user_id?: number
}

export interface NATVApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
  error?: string
}

export interface NATVConfig {
  baseUrl: string
  token: string
  timeout?: number
  endpoints?: {
    createUser: string
    activateUser: string
    searchUsers: string
    test: string
  }
}

export interface NATVOwnerInfo {
  id: number
  username: string
  credits: number
}

export type CreateUserRequest = NATVCreateUserRequest
export type ActivateUserRequest = NATVActivationRequest
export type SearchUsersRequest = NATVSearchRequest

class NATVService {
  private config: NATVConfig | null = null
  private userId: string | null = null

  constructor() {
    // Não carrega configuração automaticamente no constructor
    // Deve ser carregada explicitamente com loadUserConfig(userId)
  }

  // Carrega configuração específica do usuário
  async loadUserConfig(userId: string): Promise<void> {
    try {
      this.userId = userId
      
      // Usar API segura para buscar configuração NATV
      const response = await fetch('/api/natv/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao buscar configuração NATV');
      }

      const { data, error } = await response.json();

      if (error) {
        const appError = ErrorService.createError(
          ErrorType.NOT_FOUND,
          'Configuração NATV não encontrada para este usuário',
          'NATV_CONFIG_NOT_FOUND',
          { supabaseError: error, userId }
        )
        ErrorService.logError(appError, 'NATV Service - Load User Config')
        this.config = null
        return
      }

      this.config = {
        baseUrl: '',
        token: '__server__',
        timeout: (data.config_data as any)?.timeout || NATV_DEFAULT_TIMEOUT_MS,
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Load User Config')
      this.config = null
    }
  }

  // Carrega configuração do Supabase (método legado - mantido para compatibilidade)
  async loadConfig(): Promise<void> {
    logger.warn('loadConfig está deprecated. Use loadUserConfig(userId) em vez disso.')
    // Tenta obter o usuário atual
    const supabase = createApiSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await this.loadUserConfig(user.id)
    }
  }

  // Salva configuração específica do usuário
  async saveUserConfig(userId: string, input: { token: string }): Promise<void> {
    try {
      this.userId = userId
      
      const response = await fetch('/api/natv/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: input.token }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      this.config = {
        baseUrl: '',
        token: input.token,
        timeout: NATV_DEFAULT_TIMEOUT_MS,
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Save User Config')
      throw appError
    }
  }

  // Salva configuração no Supabase (método legado - mantido para compatibilidade)
  async saveConfig(config: NATVConfig): Promise<void> {
    logger.warn('saveConfig está deprecated. Use saveUserConfig(userId, config) em vez disso.')
    // Usar API segura para obter usuário atual
    const response = await fetch('/api/auth/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Usuário não autenticado')
    }

    const { user } = await response.json()
    if (user) {
      await this.saveUserConfig(user.id, config)
    } else {
      throw new Error('Usuário não autenticado')
    }
  }

  // Faz requisição para a API NATV através do proxy seguro
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<NATVApiResponse<T>> {
    if (!this.config) {
      const appError = ErrorService.createError(
        ErrorType.VALIDATION,
        'Serviço NATV não configurado',
        'NATV_NOT_CONFIGURED'
      )
      ErrorService.logError(appError, 'NATV Service - Not Configured')
      return {
        success: false,
        message: 'Serviço não configurado',
        error: 'NATV_NOT_CONFIGURED'
      }
    }

    // Usar proxy seguro em vez de requisição direta
    try {
      const response = await fetch('/api/natv/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          method,
          body,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        return {
          success: false,
          message: result.message || result.error || `HTTP ${response.status}`,
          error: result.error,
          data: result.data,
        }
      }

      return result as NATVApiResponse<T>

    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Proxy Request Failed')
      
      return {
        success: false,
        message: 'Erro na requisição',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }
    }

  }

  // Cria usuário de teste (senha gerada pela API NATV)
  async createUser(request: NATVCreateUserRequest): Promise<NATVApiResponse<NATVUser>> {
    const body: Record<string, string> = {
      minutes: String(request.minutes),
    }
    if (request.username?.trim()) {
      body.username = request.username.trim()
    }
    return this.makeRequest<NATVUser>('/user', 'POST', body)
  }

  // Ativa ou renova (months em meses; username ou user_id)
  async activateUser(request: NATVActivationRequest): Promise<NATVApiResponse<NATVUser>> {
    const body: Record<string, string | number> = {
      months: request.months,
    }
    if (request.username?.trim()) body.username = request.username.trim()
    if (request.user_id != null) body.user_id = request.user_id
    return this.makeRequest<NATVUser>('/user/activation', 'POST', body)
  }

  // Busca usuários (POST /user/search)
  async searchUsers(request: NATVSearchRequest): Promise<NATVApiResponse<NATVUser[]>> {
    const body: Record<string, string | number> = {}
    if (request.username?.trim()) body.username = request.username.trim()
    if (request.user_id != null) body.user_id = request.user_id
    return this.makeRequest<NATVUser[]>('/user/search', 'POST', body)
  }

  // Obtém detalhes de um usuário específico
  async getUser(username: string): Promise<NATVApiResponse<NATVUser>> {
    return this.makeRequest<NATVUser>(`/user/${encodeURIComponent(username)}`)
  }

  // Desativa um usuário
  async deactivateUser(username: string): Promise<NATVApiResponse<NATVUser>> {
    return this.makeRequest<NATVUser>(`/user/${encodeURIComponent(username)}/deactivate`, 'POST')
  }

  // Testa a conexão com a API
  async testConnection(): Promise<NATVApiResponse<any>> {
    return this.makeRequest<any>('/test')
  }

  // Método para obter informações do revendedor (créditos)
  async getOwnerInfo(): Promise<NATVApiResponse<NATVOwnerInfo>> {
    try {
      // Fazemos uma requisição direta para obter informações do owner
      const response = await this.makeRequest<NATVOwnerInfo>('/owner/info')
      return response
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Get Owner Info')
      return {
        success: false,
        message: 'Erro ao obter informações do revendedor',
        error: appError.message
      }
    }
  }

  // Método para sincronizar créditos com o painel
  async syncCredits(): Promise<NATVApiResponse<{ credits: number }>> {
    try {
      const ownerResponse = await this.getOwnerInfo()
      if (ownerResponse.success && ownerResponse.data) {
        return {
          success: true,
          message: 'Créditos sincronizados com sucesso',
          data: { credits: ownerResponse.data.credits }
        }
      }
      return {
        success: false,
        message: 'Erro ao sincronizar créditos',
        error: ownerResponse.error || 'Dados do revendedor não disponíveis'
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Sync Credits')
      return {
        success: false,
        message: 'Erro ao sincronizar créditos',
        error: appError.message
      }
    }
  }

  // Verifica se o serviço está configurado
  isConfigured(): boolean {
    return this.config !== null
  }

  // Recarrega a configuração
  async reloadConfig(): Promise<void> {
    await this.loadConfig()
  }

  // Obtém informações da configuração (sem token)
  getConfigInfo(): Omit<NATVConfig, 'token'> | null {
    if (!this.config) return null
    
    return {
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout
    }
  }

  // Verifica se o usuário tem configuração NATV ativa
  async hasUserConfig(userId: string): Promise<boolean> {
    try {
      const supabase = createApiSupabaseClient()
      const { data, error } = await supabase
        .from('integration_configs')
        .select('id')
        .eq('provider', 'natv')
        .eq('created_by', userId)
        .eq('is_active', true)
        .single()

      return !error && !!data
    } catch (error) {
      return false
    }
  }

  // Obtém informações da configuração do usuário (sem dados sensíveis)
  async getUserConfigInfo(userId: string): Promise<{
    hasConfig: boolean
    isActive?: boolean
    lastUsed?: string
    createdAt?: string
  }> {
    try {
      const supabase = createApiSupabaseClient()
      const { data, error } = await supabase
        .from('integration_configs')
        .select('base_url, is_active, last_used_at, created_at')
        .eq('provider', 'natv')
        .eq('created_by', userId)
        .eq('is_active', true)
        .single()

      if (error || !data) {
        return { hasConfig: false }
      }

      return {
        hasConfig: true,
        isActive: data.is_active,
        lastUsed: data.last_used_at ?? undefined,
        createdAt: data.created_at ?? undefined
      }
    } catch (error) {
      return { hasConfig: false }
    }
  }

  // Remove configuração do usuário
  async removeUserConfig(userId: string): Promise<void> {
    try {
      const supabase = createApiSupabaseClient()
      const { error } = await supabase
        .from('integration_configs')
        .delete()
        .eq('provider', 'natv')
        .eq('created_by', userId)

      if (error) throw error

      // Limpa configuração local se for do usuário atual
      if (this.userId === userId) {
        this.config = null
        this.userId = null
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Remove User Config')
      throw appError
    }
  }

  // Verifica se a configuração atual está carregada e válida
  isConfigLoaded(): boolean {
    return !!this.config && !!this.userId
  }

  // Obtém o ID do usuário atual da configuração
  getCurrentUserId(): string | null {
    return this.userId
  }

  // Métodos com configuração específica do usuário
  async testUserConnection(userId: string): Promise<NATVApiResponse<any>> {
    const currentUserId = this.userId
    const currentConfig = this.config
    
    try {
      await this.loadUserConfig(userId)
      return await this.testConnection()
    } finally {
      // Restaura configuração anterior
      this.userId = currentUserId
      this.config = currentConfig
    }
  }

  async createUserWithConfig(userId: string, request: NATVCreateUserRequest): Promise<NATVApiResponse<NATVUser>> {
    const currentUserId = this.userId
    const currentConfig = this.config
    
    try {
      await this.loadUserConfig(userId)
      return await this.createUser(request)
    } finally {
      // Restaura configuração anterior
      this.userId = currentUserId
      this.config = currentConfig
    }
  }

  async activateUserWithConfig(userId: string, request: NATVActivationRequest): Promise<NATVApiResponse<NATVUser>> {
    const currentUserId = this.userId
    const currentConfig = this.config
    
    try {
      await this.loadUserConfig(userId)
      return await this.activateUser(request)
    } finally {
      // Restaura configuração anterior
      this.userId = currentUserId
      this.config = currentConfig
    }
  }

  async searchUsersWithConfig(userId: string, request: NATVSearchRequest): Promise<NATVApiResponse<NATVUser[]>> {
    const currentUserId = this.userId
    const currentConfig = this.config
    
    try {
      await this.loadUserConfig(userId)
      return await this.searchUsers(request)
    } finally {
      // Restaura configuração anterior
      this.userId = currentUserId
      this.config = currentConfig
    }
  }

  async getUserWithConfig(userId: string, username: string): Promise<NATVApiResponse<NATVUser>> {
    const currentUserId = this.userId
    const currentConfig = this.config
    
    try {
      await this.loadUserConfig(userId)
      return await this.getUser(username)
    } finally {
      // Restaura configuração anterior
      this.userId = currentUserId
      this.config = currentConfig
    }
  }

  async deactivateUserWithConfig(userId: string, username: string): Promise<NATVApiResponse<NATVUser>> {
    const currentUserId = this.userId
    const currentConfig = this.config
    
    try {
      await this.loadUserConfig(userId)
      return await this.deactivateUser(username)
    } finally {
      // Restaura configuração anterior
      this.userId = currentUserId
      this.config = currentConfig
    }
  }

  async getOwnerInfoWithConfig(userId: string): Promise<NATVApiResponse<NATVOwnerInfo>> {
    const currentUserId = this.userId
    const currentConfig = this.config
    
    try {
      await this.loadUserConfig(userId)
      return await this.getOwnerInfo()
    } finally {
      // Restaura configuração anterior
      this.userId = currentUserId
      this.config = currentConfig
    }
  }

  async syncCreditsWithConfig(userId: string): Promise<NATVApiResponse<{ credits: number }>> {
    const currentUserId = this.userId
    const currentConfig = this.config
    
    try {
      await this.loadUserConfig(userId)
      return await this.syncCredits()
    } finally {
      // Restaura configuração anterior
      this.userId = currentUserId
      this.config = currentConfig
    }
  }
}

// Instância singleton
export const natvService = new NATVService()

// Exporta a classe para casos onde uma nova instância é necessária
export { NATVService }
