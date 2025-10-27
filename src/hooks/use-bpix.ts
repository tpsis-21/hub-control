import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/clients/browser'
import { useAuth } from '@/hooks/useAuth'

// Tipos
export interface BPIXConfig {
  id?: string
  user_id: string
  base_url: string
  auth_token: string
  timeout: number
  webhook_url?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface BPIXPayment {
  id: string
  amount: number
  description?: string
  reference?: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  pix_code?: string
  qr_code?: string
  expires_at?: string
  paid_at?: string
  created_at: string
  updated_at: string
}

export interface BPIXInvoice {
  id: string
  amount: number
  description?: string
  customer_name?: string
  customer_email?: string
  customer_document?: string
  due_date?: string
  status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  payment_url?: string
  created_at: string
  updated_at: string
}

export interface BPIXStats {
  total_payments: number
  total_amount: number
  pending_payments: number
  paid_payments: number
  success_rate: number
  avg_payment_time: number
}

const useBPIX = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  
  // Estados
  const [config, setConfig] = useState<BPIXConfig | null>(null)
  const [payments, setPayments] = useState<BPIXPayment[]>([])
  const [invoices, setInvoices] = useState<BPIXInvoice[]>([])
  const [stats, setStats] = useState<BPIXStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Função auxiliar para fazer requisições
  const makeRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }, [])

  // Carrega configuração
  const loadConfig = useCallback(async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      setError(null)
      
      // Usar API segura em vez de acesso direto ao banco
      const response = await fetch('/api/bpix/config', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar configuração BPIX');
      }

      const { data, error } = await response.json();

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setConfig(data)
    } catch (err) {
      console.error('Erro ao carregar configuração BPIX:', err)
      setError('Erro ao carregar configuração')
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  // Salva configuração
  const saveConfig = useCallback(async (newConfig: Omit<BPIXConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!user?.id) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive'
      })
      return false
    }

    try {
      setLoading(true)
      setError(null)

      const configData = {
        ...newConfig,
        user_id: user.id
      }

      // Usar API segura para salvar configuração
      const response = await fetch('/api/bpix/config', {
        method: config?.id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(configData),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar configuração BPIX');
      }

      const result = await response.json();

      if (result.error) {
        throw result.error
      }

      setConfig(result.data)
      
      toast({
        title: 'Sucesso',
        description: 'Configuração BPIX salva com sucesso!'
      })
      
      return true
    } catch (err) {
      console.error('Erro ao salvar configuração:', err)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração',
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [user?.id, config?.id, toast])

  // Remove configuração
  const deleteConfig = useCallback(async () => {
    if (!config?.id) return false

    try {
      setLoading(true)
      setError(null)

      // Usar API segura para deletar configuração
      const response = await fetch('/api/bpix/config', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: config.id }),
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar configuração BPIX');
      }

      const { error } = await response.json();

      if (error) {
        throw error
      }

      setConfig(null)
      
      toast({
        title: 'Sucesso',
        description: 'Configuração BPIX removida com sucesso!'
      })
      
      return true
    } catch (err) {
      console.error('Erro ao remover configuração:', err)
      toast({
        title: 'Erro',
        description: 'Erro ao remover configuração',
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [config?.id, toast])

  // Testa conexão
  const testConnection = useCallback(async (testConfig?: Partial<BPIXConfig>) => {
    const configToTest = testConfig || config
    
    if (!configToTest?.base_url || !configToTest?.auth_token) {
      toast({
        title: 'Erro',
        description: 'Configure a URL base e token primeiro',
        variant: 'destructive'
      })
      return false
    }

    try {
      setLoading(true)
      setError(null)
      
      const data = await makeRequest('/api/bpix?action=test', {
        method: 'POST',
        body: JSON.stringify(configToTest)
      })
      
      if (data.success) {
        toast({
          title: 'Sucesso',
          description: 'Conexão com BPIX testada com sucesso!'
        })
        return true
      } else {
        toast({
          title: 'Erro',
          description: data.message || 'Falha no teste de conexão',
          variant: 'destructive'
        })
        return false
      }
    } catch (err) {
      console.error('Erro ao testar conexão:', err)
      toast({
        title: 'Erro',
        description: 'Erro ao testar conexão',
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [config, makeRequest, toast])

  // Cria um pagamento
  const createPayment = useCallback(async (payment: Partial<BPIXPayment>): Promise<BPIXPayment | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await makeRequest('/api/bpix/payments', {
        method: 'POST',
        body: JSON.stringify(payment)
      })
      
      if (data.success) {
        const newPayment = data.data
        setPayments(prev => [newPayment, ...prev])
        
        toast({
          title: 'Sucesso',
          description: 'Pagamento criado com sucesso!'
        })
        
        return newPayment
      }
      
      return null
    } catch (err) {
      console.error('Erro ao criar pagamento:', err)
      toast({
        title: 'Erro',
        description: 'Erro ao criar pagamento',
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [makeRequest, toast])

  // Busca um pagamento específico
  const getPayment = useCallback(async (id: string): Promise<BPIXPayment | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await makeRequest(`/api/bpix/payments?id=${id}`)
      
      if (data.success) {
        return data.data
      }
      
      return null
    } catch (err) {
      console.error('Erro ao buscar pagamento:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [makeRequest])

  // Lista pagamentos
  const listPayments = useCallback(async (filters: { status?: string; limit?: number; offset?: number } = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())
      
      const data = await makeRequest(`/api/bpix/payments?${params.toString()}`)
      
      if (data.success) {
        setPayments(data.data)
      }
    } catch (err) {
      console.error('Erro ao listar pagamentos:', err)
    } finally {
      setLoading(false)
    }
  }, [makeRequest])

  // Cria uma fatura
  const createInvoice = useCallback(async (invoice: Partial<BPIXInvoice>): Promise<BPIXInvoice | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await makeRequest('/api/bpix/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice)
      })
      
      if (data.success) {
        const newInvoice = data.data
        setInvoices(prev => [newInvoice, ...prev])
        
        toast({
          title: 'Sucesso',
          description: 'Fatura criada com sucesso!'
        })
        
        return newInvoice
      }
      
      return null
    } catch (err) {
      console.error('Erro ao criar fatura:', err)
      toast({
        title: 'Erro',
        description: 'Erro ao criar fatura',
        variant: 'destructive'
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [makeRequest, toast])

  // Busca uma fatura específica
  const getInvoice = useCallback(async (id: string): Promise<BPIXInvoice | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await makeRequest(`/api/bpix/invoices?id=${id}`)
      
      if (data.success) {
        return data.data
      }
      
      return null
    } catch (err) {
      console.error('Erro ao buscar fatura:', err)
      return null
    } finally {
      setLoading(false)
    }
  }, [makeRequest])

  // Lista faturas
  const listInvoices = useCallback(async (filters: { status?: string; limit?: number; offset?: number } = {}) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.offset) params.append('offset', filters.offset.toString())
      
      const data = await makeRequest(`/api/bpix/invoices?${params.toString()}`)
      
      if (data.success) {
        setInvoices(data.data)
      }
    } catch (err) {
      console.error('Erro ao listar faturas:', err)
    } finally {
      setLoading(false)
    }
  }, [makeRequest])

  // Carrega estatísticas
  const loadStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await makeRequest('/api/bpix?action=stats')
      
      if (data.success) {
        setStats(data.data)
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    } finally {
      setLoading(false)
    }
  }, [makeRequest])

  // Atualiza todos os dados
  const refresh = useCallback(async () => {
    await Promise.all([
      loadConfig(),
      listPayments(),
      listInvoices(),
      loadStats()
    ])
  }, [loadConfig, listPayments, listInvoices, loadStats])

  // Limpa erro
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Carrega dados iniciais
  useEffect(() => {
    loadConfig()
  }, [])

  return {
    // Estado
    config,
    payments,
    invoices,
    stats,
    loading,
    error,
    
    // Configuração
    saveConfig,
    deleteConfig,
    testConnection,
    
    // Pagamentos
    createPayment,
    getPayment,
    listPayments,
    
    // Faturas
    createInvoice,
    getInvoice,
    listInvoices,
    
    // Estatísticas
    loadStats,
    
    // Utilitários
    refresh,
    clearError
  }
}

export default useBPIX
export { useBPIX }

