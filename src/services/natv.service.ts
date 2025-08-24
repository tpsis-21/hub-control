import { supabase } from '@/lib/supabase'
import { ErrorService, ErrorType } from './error.service'

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

export interface NATVCreateUserRequest {
  username: string
  password: string
  email?: string
  phone?: string
  plan?: string
  duration?: number
}

export interface NATVActivationRequest {
  username: string
  plan: string
  duration: number // em dias
}

export interface NATVSearchRequest {
  username?: string
  email?: string
  phone?: string
  status?: string
  limit?: number
  offset?: number
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

export interface CreateUserRequest {
  username?: string
  minutes?: number
}

export interface ActivateUserRequest {
  username?: string
  user_id?: number
  months?: number
}

export interface SearchUsersRequest {
  username?: string
  user_id?: number
  limit?: number
  offset?: number
}

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
      
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('provider', 'natv')
        .eq('created_by', userId)
        .eq('is_active', true)
        .single()

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
        baseUrl: data.base_url || '',
        token: data.auth_token || '',
        timeout: (data.config_data as any)?.timeout || 30000
      }
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Load User Config')
      this.config = null
    }
  }

  // Carrega configuração do Supabase (método legado - mantido para compatibilidade)
  async loadConfig(): Promise<void> {
    console.warn('loadConfig() está deprecated. Use loadUserConfig(userId) em vez disso.')
    // Tenta obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await this.loadUserConfig(user.id)
    }
  }

  // Salva configuração específica do usuário
  async saveUserConfig(userId: string, config: NATVConfig): Promise<void> {
    try {
      this.userId = userId
      
      const configData = {
        provider: 'natv',
        name: `NATV API - ${userId}`,
        base_url: config.baseUrl,
        auth_token: config.token,
        auth_type: 'bearer',
        config_data: {
          timeout: config.timeout || 30000,
          endpoints: {
            createUser: '/user',
            activation: '/user/activation',
            search: '/user/search',
            test: '/test'
          }
        },
        is_active: true,
        is_default: false, // Configurações de usuário não são padrão
        rate_limit_per_minute: 60,
        created_by: userId
      }

      // Primeiro, desativa configurações antigas do usuário para este provider
      await supabase
        .from('integration_configs')
        .update({ is_active: false })
        .eq('provider', 'natv')
        .eq('created_by', userId)

      // Insere a nova configuração
      const { error } = await supabase
        .from('integration_configs')
        .insert(configData)

      if (error) throw error

      this.config = config
    } catch (error) {
      const appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Save User Config')
      throw appError
    }
  }

  // Salva configuração no Supabase (método legado - mantido para compatibilidade)
  async saveConfig(config: NATVConfig): Promise<void> {
    console.warn('saveConfig() está deprecated. Use saveUserConfig(userId, config) em vez disso.')
    // Tenta obter o usuário atual
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await this.saveUserConfig(user.id, config)
    } else {
      throw new Error('Usuário não autenticado')
    }
  }

  // Faz requisição para a API NATV
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    body?: any
  ): Promise<NATVApiResponse<T>> {
    if (!this.config) {
      return {
        success: false,
        message: 'Configuração NATV não encontrada',
        error: 'Configuração NATV não encontrada ou inativa'
      }
    }

    try {
      const url = `${this.config.baseUrl}${endpoint}`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.token}`
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000)

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.status === 429) {
        const appError = ErrorService.createError(
          ErrorType.NETWORK,
          'Rate limit atingido - muitas requisições',
          'NATV_RATE_LIMIT',
          { status: 429 }
        )
        ErrorService.logError(appError, 'NATV Service - Rate Limit')
        return {
          success: false,
          message: 'Rate limit atingido',
          error: 'Muitas requisições - limite de rate limit atingido'
        }
      }

      if (response.status === 422) {
        const errorData = await response.json()
        const appError = ErrorService.createError(
          ErrorType.VALIDATION,
          'Dados inválidos fornecidos para a API NATV',
          'NATV_VALIDATION_ERROR',
          { status: 422, responseData: errorData }
        )
        ErrorService.logError(appError, 'NATV Service - Validation Error')
        return {
          success: false,
          message: 'Erro de validação',
          error: 'Dados inválidos',
          data: errorData
        }
      }

      if (!response.ok) {
        const appError = ErrorService.createError(
          response.status >= 500 ? ErrorType.NETWORK : ErrorType.VALIDATION,
          `Erro HTTP ${response.status}: ${response.statusText}`,
          `NATV_HTTP_${response.status}`,
          { status: response.status, statusText: response.statusText }
        )
        ErrorService.logError(appError, 'NATV Service - HTTP Error')
        return {
          success: false,
          message: `Erro HTTP ${response.status}`,
          error: `${response.status}: ${response.statusText}`
        }
      }

      const data = await response.json()
      return {
        success: true,
        message: 'Requisição realizada com sucesso',
        data
      }
    } catch (error) {
      let appError: any
      
      if (error instanceof Error && error.name === 'AbortError') {
        appError = ErrorService.createError(
          ErrorType.NETWORK,
          'Timeout na requisição - tempo limite excedido',
          'NATV_TIMEOUT',
          { timeout: this.config?.timeout }
        )
        ErrorService.logError(appError, 'NATV Service - Timeout')
        return {
          success: false,
          message: 'Timeout na requisição',
          error: 'Tempo limite da requisição excedido'
        }
      }

      appError = ErrorService.fromNativeError(error)
      ErrorService.logError(appError, 'NATV Service - Request Error')
      
      return {
        success: false,
        message: 'Erro na requisição',
        error: appError.message
      }
    }
  }

  // Cria um novo usuário
  async createUser(request: NATVCreateUserRequest): Promise<NATVApiResponse<NATVUser>> {
    return this.makeRequest<NATVUser>('/user', 'POST', request)
  }

  // Ativa ou renova um usuário existente
  async activateUser(request: NATVActivationRequest): Promise<NATVApiResponse<NATVUser>> {
    return this.makeRequest<NATVUser>('/user/activation', 'POST', request)
  }

  // Busca usuários
  async searchUsers(request: NATVSearchRequest): Promise<NATVApiResponse<NATVUser[]>> {
    const params = new URLSearchParams()
    
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString())
      }
    })
    
    const queryString = params.toString()
    const endpoint = queryString ? `/user/search?${queryString}` : '/user/search'
    
    return this.makeRequest<NATVUser[]>(endpoint)
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
    baseUrl?: string
    isActive?: boolean
    lastUsed?: string
    createdAt?: string
  }> {
    try {
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
        baseUrl: data.base_url,
        isActive: data.is_active,
        lastUsed: data.last_used_at,
        createdAt: data.created_at
      }
    } catch (error) {
      return { hasConfig: false }
    }
  }

  // Remove configuração do usuário
  async removeUserConfig(userId: string): Promise<void> {
    try {
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
    return !!this.config && !!this.config.baseUrl && !!this.config.token
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