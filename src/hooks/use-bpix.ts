'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

interface BPIXConfig {
  baseUrl: string
  token: string
  timeout?: number
}

interface BPIXPayment {
  id: string
  amount: number
  description: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  qr_code?: string
  qr_image?: string
  external_reference?: string
  created_at: string
  updated_at: string
  expire_at?: string
  customer_name?: string
  customer_email?: string
  customer_phone?: string
}

interface BPIXInvoice {
  id: string
  amount: number
  description: string
  status: 'pending' | 'paid' | 'expired' | 'cancelled'
  due_date: string
  customer_name: string
  customer_email: string
  customer_phone?: string
  customer_document?: string
  created_at: string
  updated_at: string
}

interface BPIXStats {
  total_payments: number
  total_amount: number
  pending_payments: number
  paid_payments: number
  expired_payments: number
  cancelled_payments: number
}

interface UseBPIXReturn {
  // Estado
  config: BPIXConfig | null
  payments: BPIXPayment[]
  invoices: BPIXInvoice[]
  stats: BPIXStats | null
  loading: boolean
  error: string | null
  
  // Configuração
  saveConfig: (config: BPIXConfig) => Promise<boolean>
  deleteConfig: () => Promise<boolean>
  testConnection: () => Promise<boolean>
  
  // Pagamentos
  createPayment: (payment: Partial<BPIXPayment>) => Promise<BPIXPayment | null>
  getPayment: (id: string) => Promise<BPIXPayment | null>
  listPayments: (filters?: { status?: string; limit?: number; offset?: number }) => Promise<void>
  
  // Faturas
  createInvoice: (invoice: Partial<BPIXInvoice>) => Promise<BPIXInvoice | null>
  getInvoice: (id: string) => Promise<BPIXInvoice | null>
  listInvoices: (filters?: { status?: string; limit?: number; offset?: number }) => Promise<void>
  
  // Estatísticas
  loadStats: () => Promise<void>
  
  // Utilitários
  refresh: () => Promise<void>
  clearError: () => void
}

export function useBPIX(): UseBPIXReturn {
  const [config, setConfig] = useState<BPIXConfig | null>(null)
  const [payments, setPayments] = useState<BPIXPayment[]>([])
  const [invoices, setInvoices] = useState<BPIXInvoice[]>([])
  const [stats, setStats] = useState<BPIXStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { toast } = useToast()

  // Função auxiliar para fazer requisições
  const makeRequest = useCallback(async (url: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }
      
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido'
      setError(message)
      throw err
    }
  }, [])

  // Carrega a configuração
  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await makeRequest('/api/bpix/config')
      
      if (data.success && data.data.configured) {
        // Não retornamos o token por segurança
        setConfig({
          baseUrl: data.data.baseUrl || '',
          token: '***', // Mascarado
          timeout: data.data.timeout || 30000
        })
      } else {
        setConfig(null)
      }
    } catch (err) {
      console.error('Erro ao carregar configuração BPIX:', err)
      setConfig(null)
    } finally {
      setLoading(false)
    }
  }, [makeRequest])

  // Salva a configuração
  const saveConfig = useCallback(async (newConfig: BPIXConfig): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      
      const method = config ? 'PUT' : 'POST'
      await makeRequest('/api/bpix/config', {
        method,
        body: JSON.stringify(newConfig)
      })
      
      toast({
        title: 'Sucesso',
        description: 'Configuração BPIX salva com sucesso!'
      })
      
      await loadConfig()
      return true
    } catch (err) {
      console.error('Erro ao salvar configuração:', err)
      toast({
        title: 'Erro',
        description: 'Erro ao salvar configuração BPIX',
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [config, makeRequest, toast, loadConfig])

  // Remove a configuração
  const deleteConfig = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      
      await makeRequest('/api/bpix/config', {
        method: 'DELETE'
      })
      
      toast({
        title: 'Sucesso',
        description: 'Configuração BPIX removida com sucesso!'
      })
      
      setConfig(null)
      setPayments([])
      setInvoices([])
      setStats(null)
      
      return true
    } catch (err) {
      console.error('Erro ao remover configuração:', err)
      toast({
        title: 'Erro',
        description: 'Erro ao remover configuração BPIX',
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [makeRequest, toast])

  // Testa a conexão
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      
      await makeRequest('/api/bpix/config?action=test')
      
      toast({
        title: 'Sucesso',
        description: 'Conexão com BPIX testada com sucesso!'
      })
      
      return true
    } catch (err) {
      console.error('Erro ao testar conexão:', err)
      toast({
        title: 'Erro',
        description: 'Falha ao testar conexão com BPIX',
        variant: 'destructive'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [makeRequest, toast])

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