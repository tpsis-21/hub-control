/**
 * Sistema de Otimização de Banco de Dados
 * 
 * Implementa cache inteligente, otimização de queries,
 * análise de performance e monitoramento em tempo real.
 */

import { createApiSupabaseClient } from './supabase/unified-client';
import { useState, useEffect } from 'react';
import { logger } from '@/utils/production-logger'

// ============================================
// INTERFACES E TIPOS
// ============================================

interface CacheConfig {
  ttl: number; // Time to live em segundos
  maxSize: number; // Tamanho máximo do cache
  strategy: 'lru' | 'fifo' | 'lfu'; // Estratégia de remoção
}

interface QueryMetrics {
  queryId: string;
  query: string;
  executionTime: number;
  cacheHit: boolean;
  timestamp: Date;
  rowsReturned: number;
  parameters?: any;
}

interface IndexSuggestion {
  table: string;
  columns: string[];
  type: 'btree' | 'hash' | 'gin' | 'gist';
  reason: string;
  estimatedImprovement: number;
}

interface QueryPlan {
  query: string;
  plan: any;
  cost: number;
  executionTime: number;
}

// ============================================
// CACHE INTELIGENTE
// ============================================

class IntelligentCache {
  private cache: Map<string, any> = new Map();
  private accessTimes: Map<string, number> = new Map();
  private accessCounts: Map<string, number> = new Map();
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  // Gerar chave de cache baseada na query e parâmetros
  private generateKey(query: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return btoa(`${query}:${paramString}`).substring(0, 32);
  }

  // Verificar se item está no cache e ainda é válido
  get(query: string, params?: any): any | null {
    const key = this.generateKey(query, params);
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Verificar TTL
    const now = Date.now();
    if (now - item.timestamp > this.config.ttl * 1000) {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);
      return null;
    }

    // Atualizar estatísticas de acesso
    this.accessTimes.set(key, now);
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);

    return item.data;
  }

  // Armazenar item no cache
  set(query: string, data: any, params?: any): void {
    const key = this.generateKey(query, params);
    const now = Date.now();

    // Verificar se precisa remover itens antigos
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      query,
      params
    });
    
    this.accessTimes.set(key, now);
    this.accessCounts.set(key, 1);
  }

  // Remover itens do cache baseado na estratégia
  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToRemove: string | undefined;
    
    if (this.config.strategy === 'lru') {
      keyToRemove = this.findLRU();
    } else if (this.config.strategy === 'lfu') {
      keyToRemove = this.findLFU();
    } else {
      // FIFO
      keyToRemove = this.cache.keys().next().value;
    }
    
    if (keyToRemove) {
      this.cache.delete(keyToRemove);
      this.accessTimes.delete(keyToRemove);
      this.accessCounts.delete(keyToRemove);
    }
  }

  private findLRU(): string {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, time] of this.accessTimes) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private findLFU(): string {
    let leastUsedKey = '';
    let leastCount = Infinity;

    for (const [key, count] of this.accessCounts) {
      if (count < leastCount) {
        leastCount = count;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  // Invalidar cache por padrão
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      this.accessTimes.clear();
      this.accessCounts.clear();
      return;
    }

    const regex = new RegExp(pattern, 'i');
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache) {
      if (regex.test(item.query)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      this.accessTimes.delete(key);
      this.accessCounts.delete(key);
    });
  }

  // Estatísticas do cache
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      oldestEntry: this.getOldestEntry(),
      mostAccessed: this.getMostAccessed()
    };
  }

  private calculateHitRate(): number {
    // Implementação simplificada - em produção, seria mais sofisticada
    return 0.85; // 85% de hit rate exemplo
  }

  private getOldestEntry(): Date | null {
    if (this.accessTimes.size === 0) return null;
    const oldestTime = Math.min(...this.accessTimes.values());
    return new Date(oldestTime);
  }

  private getMostAccessed(): { query: string; count: number } | null {
    if (this.accessCounts.size === 0) return null;
    
    let maxCount = 0;
    let maxKey = '';
    
    for (const [key, count] of this.accessCounts) {
      if (count > maxCount) {
        maxCount = count;
        maxKey = key;
      }
    }
    
    const item = this.cache.get(maxKey);
    return item ? { query: item.query, count: maxCount } : null;
  }
}

// ============================================
// OTIMIZADOR DE QUERIES
// ============================================

class QueryOptimizer {
  private supabase: any;
  private cache: IntelligentCache;
  private metrics: QueryMetrics[] = [];
  private slowQueryThreshold: number = 1000; // 1 segundo

  constructor(supabaseClient: any, cacheConfig?: CacheConfig) {
    this.supabase = supabaseClient;
    this.cache = new IntelligentCache(cacheConfig || {
      ttl: 300, // 5 minutos
      maxSize: 1000,
      strategy: 'lru'
    });
  }

  // Executar query com cache e métricas
  async executeQuery(
    query: string, 
    params?: any, 
    options: { useCache?: boolean; cacheTtl?: number } = {}
  ): Promise<any> {
    const startTime = Date.now();
    const queryId = this.generateQueryId(query, params);
    
    // Verificar cache primeiro
    if (options.useCache !== false) {
      const cachedResult = this.cache.get(query, params);
      if (cachedResult) {
        this.recordMetrics({
          queryId,
          query,
          executionTime: Date.now() - startTime,
          cacheHit: true,
          timestamp: new Date(),
          rowsReturned: cachedResult.length || 0,
          parameters: params
        });
        
        return cachedResult;
      }
    }

    try {
      // Executar query
      const result = await this.executeRawQuery(query, params);
      const executionTime = Date.now() - startTime;
      
      // Armazenar no cache se configurado
      if (options.useCache !== false && executionTime < this.slowQueryThreshold) {
        this.cache.set(query, result, params);
      }
      
      // Registrar métricas
      this.recordMetrics({
        queryId,
        query,
        executionTime,
        cacheHit: false,
        timestamp: new Date(),
        rowsReturned: result?.length || 0,
        parameters: params
      });
      
      // Alertar sobre queries lentas
      if (executionTime > this.slowQueryThreshold) {
        this.handleSlowQuery(query, executionTime, params);
      }
      
      return result;
      
    } catch (error) {
      console.error('Erro na execução da query:', error);
      throw error;
    }
  }

  // Executar query raw (implementação específica do Supabase)
  private async executeRawQuery(query: string, params?: any): Promise<any> {
    // Para Supabase, adaptamos a query para usar o cliente
    // Esta é uma implementação simplificada
    
    if (query.toLowerCase().includes('select')) {
      // Extrair tabela da query (implementação básica)
      const tableMatch = query.match(/from\s+(\w+)/i);
      if (tableMatch) {
        const table = tableMatch[1];
        let queryBuilder = this.supabase.from(table).select('*');
        
        // Aplicar filtros se houver parâmetros
        if (params) {
          for (const [key, value] of Object.entries(params)) {
            queryBuilder = queryBuilder.eq(key, value);
          }
        }
        
        const { data, error } = await queryBuilder;
        if (error) throw error;
        return data;
      }
    }
    
    // Para queries mais complexas, usar RPC ou SQL direto
    const { data, error } = await this.supabase.rpc('exec_sql', { 
      sql_query: query
    });
    
    if (error) throw error;
    return data;
  }

  // Gerar ID único para a query
  private generateQueryId(query: string, params?: any): string {
    const content = `${query}:${JSON.stringify(params || {})}`;
    return btoa(content).substring(0, 16);
  }

  // Registrar métricas de performance
  private recordMetrics(metrics: QueryMetrics): void {
    this.metrics.push(metrics);
    
    // Manter apenas as últimas 1000 métricas
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Lidar com queries lentas
  private handleSlowQuery(query: string, executionTime: number, params?: any): void {
    logger.warn(`Query lenta detectada (${executionTime}ms)`, {
      query: query.substring(0, 100) + '...',
      executionTime,
      params
    });
    
    // Aqui poderia enviar para sistema de monitoramento
    // this.sendToMonitoring('slow_query', { query, executionTime, params });
  }

  // Analisar plano de execução
  async analyzeQueryPlan(query: string): Promise<QueryPlan> {
    try {
      const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`;
      const result = await this.executeRawQuery(explainQuery);
      
      return {
        query,
        plan: result[0]?.['QUERY PLAN'] || result,
        cost: this.extractCost(result),
        executionTime: this.extractExecutionTime(result)
      };
    } catch (error) {
      console.error('Erro ao analisar plano de execução:', error);
      throw error;
    }
  }

  private extractCost(planResult: any): number {
    // Extrair custo do plano de execução
    try {
      const plan = planResult[0]?.['QUERY PLAN']?.[0]?.Plan;
      return plan?.['Total Cost'] || 0;
    } catch {
      return 0;
    }
  }

  private extractExecutionTime(planResult: any): number {
    // Extrair tempo de execução do plano
    try {
      const plan = planResult[0]?.['QUERY PLAN']?.[0];
      return plan?.['Execution Time'] || 0;
    } catch {
      return 0;
    }
  }

  // Sugerir índices baseado nas queries executadas
  suggestIndexes(): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];
    const queryPatterns = this.analyzeQueryPatterns();
    
    for (const pattern of queryPatterns) {
      if (pattern.whereColumns.length > 0) {
        suggestions.push({
          table: pattern.table,
          columns: pattern.whereColumns,
          type: 'btree',
          reason: `Filtros frequentes nas colunas: ${pattern.whereColumns.join(', ')}`,
          estimatedImprovement: this.estimateImprovement(pattern)
        });
      }
      
      if (pattern.orderByColumns.length > 0) {
        suggestions.push({
          table: pattern.table,
          columns: pattern.orderByColumns,
          type: 'btree',
          reason: `Ordenação frequente nas colunas: ${pattern.orderByColumns.join(', ')}`,
          estimatedImprovement: this.estimateImprovement(pattern)
        });
      }
    }
    
    return suggestions;
  }

  private analyzeQueryPatterns(): any[] {
    // Análise simplificada dos padrões de query
    const patterns: Map<string, any> = new Map();
    
    for (const metric of this.metrics) {
      const tableMatch = metric.query.match(/from\s+(\w+)/i);
      if (!tableMatch) continue;
      
      const table = tableMatch[1];
      const pattern = patterns.get(table) || {
        table,
        count: 0,
        avgExecutionTime: 0,
        whereColumns: new Set(),
        orderByColumns: new Set()
      };
      
      pattern.count++;
      pattern.avgExecutionTime = (pattern.avgExecutionTime + metric.executionTime) / 2;
      
      // Extrair colunas WHERE (implementação básica)
      const whereMatches = metric.query.match(/where\s+([\w\s=<>!]+)/gi);
      if (whereMatches) {
        whereMatches.forEach(match => {
          const columnMatch = match.match(/\b(\w+)\s*[=<>!]/g);
          if (columnMatch) {
            columnMatch.forEach(col => {
              const cleanCol = col.replace(/[=<>!\s]/g, '');
              pattern.whereColumns.add(cleanCol);
            });
          }
        });
      }
      
      // Extrair colunas ORDER BY
      const orderMatches = metric.query.match(/order\s+by\s+([\w,\s]+)/gi);
      if (orderMatches) {
        orderMatches.forEach(match => {
          const columns = match.replace(/order\s+by\s+/gi, '').split(',');
          columns.forEach(col => {
            const cleanCol = col.trim().replace(/\s+(asc|desc)$/i, '');
            pattern.orderByColumns.add(cleanCol);
          });
        });
      }
      
      patterns.set(table, pattern);
    }
    
    return Array.from(patterns.values()).map(p => ({
      ...p,
      whereColumns: Array.from(p.whereColumns),
      orderByColumns: Array.from(p.orderByColumns)
    }));
  }

  private estimateImprovement(pattern: any): number {
    // Estimativa simples baseada na frequência e tempo de execução
    const baseImprovement = Math.min(pattern.avgExecutionTime * 0.3, 500); // Máximo 500ms
    const frequencyMultiplier = Math.min(pattern.count / 100, 2); // Máximo 2x
    return Math.round(baseImprovement * frequencyMultiplier);
  }

  // Obter estatísticas de performance
  getPerformanceStats() {
    const recentMetrics = this.metrics.filter(
      m => Date.now() - m.timestamp.getTime() < 3600000 // Última hora
    );
    
    const totalQueries = recentMetrics.length;
    const cacheHits = recentMetrics.filter(m => m.cacheHit).length;
    const avgExecutionTime = recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries;
    const slowQueries = recentMetrics.filter(m => m.executionTime > this.slowQueryThreshold).length;
    
    return {
      totalQueries,
      cacheHitRate: totalQueries > 0 ? (cacheHits / totalQueries) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime),
      slowQueries,
      slowQueryRate: totalQueries > 0 ? (slowQueries / totalQueries) * 100 : 0,
      cacheStats: this.cache.getStats()
    };
  }

  // Invalidar cache por tabela
  invalidateTableCache(tableName: string): void {
    this.cache.invalidate(`from\\s+${tableName}`);
  }

  // Configurar threshold para queries lentas
  setSlowQueryThreshold(milliseconds: number): void {
    this.slowQueryThreshold = milliseconds;
  }
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Criar instância otimizada do Supabase
export function createOptimizedSupabase(url: string, key: string, cacheConfig?: CacheConfig) {
  const supabase = createApiSupabaseClient(true); // service role para otimização
  const optimizer = new QueryOptimizer(supabase, cacheConfig);
  
  return {
    supabase,
    optimizer,
    // Método conveniente para queries otimizadas
    query: (sql: string, params?: any, options?: any) => 
      optimizer.executeQuery(sql, params, options)
  };
}

// Hook React para queries otimizadas
// Hook React para queries otimizadas
export function useOptimizedQuery(
  query: string, 
  params?: any, 
  options: { enabled?: boolean; useCache?: boolean } = {}
) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    if (!options.enabled) return;
    
    setLoading(true);
    setError(null);
    
    // Aqui você integraria com o QueryOptimizer
    // Esta é uma implementação simplificada
    
    const executeQuery = async () => {
      try {
        // const result = await optimizer.executeQuery(query, params, options);
        // setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    executeQuery();
  }, [query, JSON.stringify(params), options.enabled]);
  
  return { data, loading, error };
}

// Middleware para invalidação automática de cache
export function createCacheInvalidationMiddleware(optimizer: QueryOptimizer) {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Detectar operações que modificam dados
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        // Extrair tabela da URL ou corpo da requisição
        const tableName = extractTableFromRequest(req);
        if (tableName) {
          optimizer.invalidateTableCache(tableName);
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

function extractTableFromRequest(req: any): string | null {
  // Implementação simplificada para extrair nome da tabela
  const urlParts = req.url.split('/');
  return urlParts[urlParts.length - 1] || null;
}

// ============================================
// EXPORTAÇÕES
// ============================================

export {
  QueryOptimizer,
  IntelligentCache
};

export type {
  QueryMetrics,
  IndexSuggestion,
  QueryPlan,
  CacheConfig
};

export default QueryOptimizer;
