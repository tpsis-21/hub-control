import { supabase } from '@/lib/supabase'

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

  constructor() {
    this.loadConfig()
  }

  // Carrega configuração do Supabase
  private async loadConfig(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('integration_configs')
        .select('*')
        .eq('provider', 'natv')
        .eq('is_active', true)
        .single()

      if (error) {
        console.warn('Configuração NATV não encontrada:', error.message)
        return
      }

      this.config = {
        baseUrl: data.base_url,
        token: data.auth_token,
        timeout: data.config_data?.timeout || 30000
      }
    } catch (error) {
      console.error('Erro ao carregar configuração NATV:', error)
    }
  }

  // Salva configuração no Supabase
  async saveConfig(config: NATVConfig): Promise<void> {
    try {
      const configData = {
        provider: 'natv',
        name: 'NATV API',
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
        is_default: true,
        rate_limit_per_minute: 60
      }

      const { error } = await supabase
        .from('integration_configs')
        .upsert(configData, {
          onConflict: 'provider,name'
        })

      if (error) throw error

      this.config = config
    } catch (error) {
      console.error('Erro ao salvar configuração NATV:', error)
      throw error
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
        return {
          success: false,
          message: 'Rate limit atingido',
          error: 'Muitas requisições - limite de rate limit atingido'
        }
      }

      if (response.status === 422) {
        const errorData = await response.json()
        return {
          success: false,
          message: 'Erro de validação',
          error: 'Dados inválidos',
          data: errorData
        }
      }

      if (!response.ok) {
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
      console.error('Erro na requisição NATV:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Timeout na requisição',
          error: 'Tempo limite da requisição excedido'
        }
      }

      return {
        success: false,
        message: 'Erro na requisição',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
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
      // Fazemos uma busca simples para obter informações do owner
      const response = await this.searchUsers({ username: '', limit: 1 })
      if (response.success && response.data && response.data.length > 0 && response.data[0].owner) {
        return {
          success: true,
          message: 'Informações do revendedor obtidas com sucesso',
          data: response.data[0].owner
        }
      }
      return {
        success: false,
        message: 'Informações do revendedor não encontradas',
        error: 'Nenhum usuário encontrado ou dados do owner não disponíveis'
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao obter informações do revendedor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
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
      return {
        success: false,
        message: 'Erro ao sincronizar créditos',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
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
}

// Instância singleton
export const natvService = new NATVService()

// Exporta a classe para casos onde uma nova instância é necessária
export { NATVService }