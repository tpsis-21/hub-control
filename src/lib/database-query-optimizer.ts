/**
 * Sistema de Otimização de Queries de Banco de Dados
 * 
 * Implementa análise de performance, otimização automática de queries,
 * gerenciamento de índices e monitoramento de queries lentas.
 */

import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useCallback } from 'react';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface QueryPerformanceMetrics {
  id: string;
  query: string;
  executionTime: number;
  rowsReturned: number;
  indexesUsed: string[];
  planCost: number;
  timestamp: Date;
  userId?: string;
  endpoint?: string;
}

export interface SlowQueryAlert {
  id: string;
  query: string;
  executionTime: number;
  threshold: number;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

export interface IndexRecommendation {
  id: string;
  tableName: string;
  columns: string[];
  reason: string;
  estimatedImprovement: number;
  priority: 'low' | 'medium' | 'high';
  queryPattern: string;
}

export interface QueryOptimizationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  suggestion: string;
  category: 'join' | 'where' | 'select' | 'order' | 'index';
  enabled: boolean;
}

export interface DatabaseStatistics {
  totalQueries: number;
  averageExecutionTime: number;
  slowQueries: number;
  indexHitRatio: number;
  cacheHitRatio: number;
  activeConnections: number;
  tableStats: TableStatistics[];
}

export interface TableStatistics {
  tableName: string;
  rowCount: number;
  tableSize: string;
  indexSize: string;
  mostAccessedColumns: string[];
  slowestQueries: QueryPerformanceMetrics[];
}

export interface QueryOptimizationConfig {
  slowQueryThreshold: number; // em ms
  enableAutoOptimization: boolean;
  enableQueryLogging: boolean;
  maxLogRetention: number; // em dias
  alertThresholds: {
    executionTime: number;
    rowsScanned: number;
    indexMisses: number;
  };
}

// ============================================
// REGRAS DE OTIMIZAÇÃO PADRÃO
// ============================================

const DEFAULT_OPTIMIZATION_RULES: QueryOptimizationRule[] = [
  {
    id: 'avoid-select-star',
    name: 'Evitar SELECT *',
    description: 'SELECT * pode ser ineficiente, especifique apenas as colunas necessárias',
    pattern: /SELECT\s+\*\s+FROM/i,
    suggestion: 'Especifique apenas as colunas necessárias: SELECT col1, col2 FROM...',
    category: 'select',
    enabled: true
  },
  {
    id: 'missing-where-clause',
    name: 'WHERE clause ausente',
    description: 'Queries sem WHERE podem ser muito lentas em tabelas grandes',
    pattern: /SELECT\s+.+\s+FROM\s+\w+(?!.*WHERE)/i,
    suggestion: 'Adicione uma cláusula WHERE para filtrar os resultados',
    category: 'where',
    enabled: true
  },
  {
    id: 'inefficient-like',
    name: 'LIKE ineficiente',
    description: 'LIKE com wildcard no início (%texto) não pode usar índices',
    pattern: /LIKE\s+['"]%/i,
    suggestion: 'Evite wildcards no início. Use full-text search para busca de texto',
    category: 'where',
    enabled: true
  },
  {
    id: 'missing-limit',
    name: 'LIMIT ausente',
    description: 'Queries sem LIMIT podem retornar muitos dados',
    pattern: /SELECT\s+.+\s+FROM\s+\w+(?!.*LIMIT)/i,
    suggestion: 'Adicione LIMIT para controlar o número de resultados',
    category: 'select',
    enabled: true
  },
  {
    id: 'inefficient-order-by',
    name: 'ORDER BY sem índice',
    description: 'ORDER BY em colunas sem índice pode ser lento',
    pattern: /ORDER\s+BY\s+(\w+)/i,
    suggestion: 'Considere criar um índice na coluna usada no ORDER BY',
    category: 'order',
    enabled: true
  }
];

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useDatabaseQueryOptimizer() {
  const [metrics, setMetrics] = useState<QueryPerformanceMetrics[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQueryAlert[]>([]);
  const [indexRecommendations, setIndexRecommendations] = useState<IndexRecommendation[]>([]);
  const [optimizationRules, setOptimizationRules] = useState<QueryOptimizationRule[]>(DEFAULT_OPTIMIZATION_RULES);
  const [config, setConfig] = useState<QueryOptimizationConfig>({
    slowQueryThreshold: 1000, // 1 segundo
    enableAutoOptimization: false,
    enableQueryLogging: true,
    maxLogRetention: 30, // 30 dias
    alertThresholds: {
      executionTime: 5000, // 5 segundos
      rowsScanned: 10000,
      indexMisses: 5
    }
  });
  const [statistics, setStatistics] = useState<DatabaseStatistics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // ============================================
  // ANÁLISE DE QUERIES
  // ============================================

  const analyzeQuery = useCallback((query: string): string[] => {
    const suggestions: string[] = [];
    
    optimizationRules.forEach(rule => {
      if (rule.enabled && rule.pattern.test(query)) {
        suggestions.push(`${rule.name}: ${rule.suggestion}`);
      }
    });

    return suggestions;
  }, [optimizationRules]);

  const logQueryExecution = useCallback(async (
    query: string,
    executionTime: number,
    rowsReturned: number,
    additionalData?: Partial<QueryPerformanceMetrics>
  ) => {
    if (!config.enableQueryLogging) return;

    const metric: QueryPerformanceMetrics = {
      id: crypto.randomUUID(),
      query,
      executionTime,
      rowsReturned,
      indexesUsed: additionalData?.indexesUsed || [],
      planCost: additionalData?.planCost || 0,
      timestamp: new Date(),
      userId: additionalData?.userId,
      endpoint: additionalData?.endpoint
    };

    setMetrics(prev => {
      const updated = [metric, ...prev].slice(0, 1000); // Manter apenas os últimos 1000
      return updated;
    });

    // Verificar se é uma query lenta
    if (executionTime > config.slowQueryThreshold) {
      const suggestions = analyzeQuery(query);
      const severity = getSeverityLevel(executionTime, config.slowQueryThreshold);
      
      const alert: SlowQueryAlert = {
        id: crypto.randomUUID(),
        query,
        executionTime,
        threshold: config.slowQueryThreshold,
        suggestions,
        severity,
        timestamp: new Date()
      };

      setSlowQueries(prev => [alert, ...prev].slice(0, 100));
    }
  }, [config, analyzeQuery]);

  // ============================================
  // RECOMENDAÇÕES DE ÍNDICES
  // ============================================

  const generateIndexRecommendations = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      // Analisar queries lentas para identificar padrões
      const recommendations: IndexRecommendation[] = [];
      
      // Agrupar queries por tabela
      const tableQueries = new Map<string, QueryPerformanceMetrics[]>();
      
      slowQueries.forEach(alert => {
        const tableMatch = alert.query.match(/FROM\s+(\w+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          if (!tableQueries.has(tableName)) {
            tableQueries.set(tableName, []);
          }
          
          // Encontrar a métrica correspondente
          const metric = metrics.find(m => m.query === alert.query);
          if (metric) {
            tableQueries.get(tableName)!.push(metric);
          }
        }
      });

      // Gerar recomendações baseadas nos padrões
      tableQueries.forEach((queries, tableName) => {
        // Analisar colunas frequentemente usadas em WHERE
        const whereColumns = new Map<string, number>();
        const orderColumns = new Map<string, number>();
        
        queries.forEach(query => {
          // Extrair colunas do WHERE
          const whereMatches = query.query.match(/WHERE\s+.+?(?=ORDER|GROUP|LIMIT|$)/gi);
          if (whereMatches) {
            whereMatches.forEach(whereClause => {
              const columnMatches = whereClause.match(/(\w+)\s*[=<>]/g);
              if (columnMatches) {
                columnMatches.forEach(match => {
                  const column = match.replace(/\s*[=<>].*/, '');
                  whereColumns.set(column, (whereColumns.get(column) || 0) + 1);
                });
              }
            });
          }
          
          // Extrair colunas do ORDER BY
          const orderMatches = query.query.match(/ORDER\s+BY\s+(\w+)/gi);
          if (orderMatches) {
            orderMatches.forEach(match => {
              const column = match.replace(/ORDER\s+BY\s+/i, '');
              orderColumns.set(column, (orderColumns.get(column) || 0) + 1);
            });
          }
        });

        // Criar recomendações para colunas frequentes
        whereColumns.forEach((count, column) => {
          if (count >= 3) { // Aparece em pelo menos 3 queries
            recommendations.push({
              id: crypto.randomUUID(),
              tableName,
              columns: [column],
              reason: `Coluna '${column}' usada frequentemente em WHERE (${count} vezes)`,
              estimatedImprovement: Math.min(count * 20, 80), // Estimativa de melhoria
              priority: count >= 5 ? 'high' : 'medium',
              queryPattern: `WHERE ${column} = ?`
            });
          }
        });

        orderColumns.forEach((count, column) => {
          if (count >= 2) {
            recommendations.push({
              id: crypto.randomUUID(),
              tableName,
              columns: [column],
              reason: `Coluna '${column}' usada frequentemente em ORDER BY (${count} vezes)`,
              estimatedImprovement: Math.min(count * 15, 60),
              priority: count >= 4 ? 'high' : 'medium',
              queryPattern: `ORDER BY ${column}`
            });
          }
        });
      });

      setIndexRecommendations(recommendations);
    } catch (error) {
      console.error('Erro ao gerar recomendações de índices:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [slowQueries, metrics]);

  // ============================================
  // ESTATÍSTICAS DO BANCO
  // ============================================

  const updateDatabaseStatistics = useCallback(async () => {
    try {
      const stats: DatabaseStatistics = {
        totalQueries: metrics.length,
        averageExecutionTime: metrics.length > 0 
          ? metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length 
          : 0,
        slowQueries: slowQueries.length,
        indexHitRatio: 95, // Simulado - em produção viria do banco
        cacheHitRatio: 88, // Simulado
        activeConnections: 12, // Simulado
        tableStats: [] // Seria populado com dados reais
      };

      setStatistics(stats);
    } catch (error) {
      console.error('Erro ao atualizar estatísticas:', error);
    }
  }, [metrics, slowQueries]);

  // ============================================
  // OTIMIZAÇÃO AUTOMÁTICA
  // ============================================

  const optimizeQuery = useCallback((originalQuery: string): string => {
    let optimizedQuery = originalQuery;

    // Aplicar otimizações básicas
    optimizationRules.forEach(rule => {
      if (rule.enabled && rule.pattern.test(optimizedQuery)) {
        switch (rule.category) {
          case 'select':
            if (rule.id === 'avoid-select-star') {
              // Não podemos otimizar automaticamente sem conhecer a estrutura
              // Apenas loggar a sugestão
            }
            break;
          case 'where':
            if (rule.id === 'missing-where-clause') {
              // Adicionar comentário de sugestão
              optimizedQuery += ' -- SUGESTÃO: Adicione WHERE clause para melhor performance';
            }
            break;
        }
      }
    });

    return optimizedQuery;
  }, [optimizationRules]);

  // ============================================
  // LIMPEZA DE DADOS ANTIGOS
  // ============================================

  const cleanupOldData = useCallback(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.maxLogRetention);

    setMetrics(prev => prev.filter(m => m.timestamp > cutoffDate));
    setSlowQueries(prev => prev.filter(sq => sq.timestamp > cutoffDate));
  }, [config.maxLogRetention]);

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    updateDatabaseStatistics();
  }, [updateDatabaseStatistics]);

  useEffect(() => {
    if (slowQueries.length > 0) {
      generateIndexRecommendations();
    }
  }, [slowQueries.length, generateIndexRecommendations]);

  useEffect(() => {
    // Limpeza automática a cada hora
    const interval = setInterval(cleanupOldData, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupOldData]);

  // ============================================
  // RETORNO DO HOOK
  // ============================================

  return {
    // Estado
    metrics,
    slowQueries,
    indexRecommendations,
    optimizationRules,
    config,
    statistics,
    isAnalyzing,
    
    // Ações
    logQueryExecution,
    analyzeQuery,
    optimizeQuery,
    generateIndexRecommendations,
    updateDatabaseStatistics,
    cleanupOldData,
    
    // Configuração
    updateConfig: setConfig,
    updateOptimizationRules: setOptimizationRules,
    
    // Utilitários
    clearMetrics: () => setMetrics([]),
    clearSlowQueries: () => setSlowQueries([]),
    clearRecommendations: () => setIndexRecommendations([])
  };
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

function getSeverityLevel(
  executionTime: number, 
  threshold: number
): SlowQueryAlert['severity'] {
  const ratio = executionTime / threshold;
  
  if (ratio >= 10) return 'critical';
  if (ratio >= 5) return 'high';
  if (ratio >= 2) return 'medium';
  return 'low';
}

export function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function getQueryType(query: string): string {
  const upperQuery = query.trim().toUpperCase();
  
  if (upperQuery.startsWith('SELECT')) return 'SELECT';
  if (upperQuery.startsWith('INSERT')) return 'INSERT';
  if (upperQuery.startsWith('UPDATE')) return 'UPDATE';
  if (upperQuery.startsWith('DELETE')) return 'DELETE';
  if (upperQuery.startsWith('CREATE')) return 'CREATE';
  if (upperQuery.startsWith('ALTER')) return 'ALTER';
  if (upperQuery.startsWith('DROP')) return 'DROP';
  
  return 'OTHER';
}

export function estimateQueryComplexity(query: string): 'low' | 'medium' | 'high' {
  const upperQuery = query.toUpperCase();
  let complexity = 0;
  
  // Fatores que aumentam complexidade
  if (upperQuery.includes('JOIN')) complexity += 2;
  if (upperQuery.includes('SUBQUERY') || upperQuery.includes('SELECT') && upperQuery.split('SELECT').length > 2) complexity += 3;
  if (upperQuery.includes('GROUP BY')) complexity += 1;
  if (upperQuery.includes('ORDER BY')) complexity += 1;
  if (upperQuery.includes('HAVING')) complexity += 2;
  if (upperQuery.includes('UNION')) complexity += 2;
  if (upperQuery.includes('DISTINCT')) complexity += 1;
  
  if (complexity >= 6) return 'high';
  if (complexity >= 3) return 'medium';
  return 'low';
}