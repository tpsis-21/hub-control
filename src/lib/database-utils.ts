/**
 * Funções utilitárias para otimização de banco de dados
 */

import type { SlowQueryAlert } from './database-query-optimizer';

export function getSeverityLevel(
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
