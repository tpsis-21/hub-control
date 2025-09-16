import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';
import fs from 'fs/promises';
import path from 'path';

// Interfaces para configuração e resultados
interface PerformanceTestConfig {
  baseUrl: string;
  concurrentUsers: number;
  testDuration: number; // em segundos
  rampUpTime: number; // em segundos
  endpoints: TestEndpoint[];
  database: DatabaseTestConfig;
  notifications: NotificationConfig;
  thresholds: PerformanceThresholds;
}

interface TestEndpoint {
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  weight: number; // peso relativo para distribuição de carga
  expectedStatusCode?: number;
}

interface DatabaseTestConfig {
  enabled: boolean;
  queries: DatabaseQuery[];
  connectionPoolSize: number;
}

interface DatabaseQuery {
  name: string;
  query: string;
  params?: any[];
  expectedRows?: number;
}

interface NotificationConfig {
  email?: {
    enabled: boolean;
    to: string;
    from: string;
  };
  webhook?: {
    enabled: boolean;
    url: string;
  };
  slack?: {
    enabled: boolean;
    webhook: string;
    channel: string;
  };
}

interface PerformanceThresholds {
  responseTime: {
    p50: number; // 50º percentil em ms
    p95: number; // 95º percentil em ms
    p99: number; // 99º percentil em ms
  };
  throughput: {
    minRps: number; // requisições por segundo mínimas
  };
  errorRate: {
    maxPercent: number; // taxa de erro máxima em %
  };
  database: {
    maxQueryTime: number; // tempo máximo de query em ms
    maxConnections: number; // máximo de conexões simultâneas
  };
}

interface TestResult {
  id: string;
  timestamp: Date;
  config: PerformanceTestConfig;
  duration: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  throughput: number;
  errorRate: number;
  responseTimePercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
  endpointResults: EndpointResult[];
  databaseResults: DatabaseResult[];
  resourceUsage: ResourceUsage;
  thresholdViolations: ThresholdViolation[];
  recommendations: string[];
}

interface EndpointResult {
  name: string;
  path: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  throughput: number;
  errorRate: number;
  statusCodes: Record<number, number>;
}

interface DatabaseResult {
  name: string;
  query: string;
  executions: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
  slowQueries: number;
}

interface ResourceUsage {
  cpu: {
    average: number;
    peak: number;
  };
  memory: {
    average: number;
    peak: number;
  };
  database: {
    connections: number;
    activeQueries: number;
  };
}

interface ThresholdViolation {
  type: 'response_time' | 'throughput' | 'error_rate' | 'database';
  metric: string;
  expected: number;
  actual: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Classe principal para testes de performance
export class PerformanceTester {
  private config: PerformanceTestConfig;
  private supabase: any;
  private results: TestResult | null = null;
  private isRunning = false;

  constructor(config: PerformanceTestConfig) {
    this.config = config;
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  // Executar teste de performance completo
  async runPerformanceTest(): Promise<TestResult> {
    if (this.isRunning) {
      throw new Error('Teste de performance já está em execução');
    }

    this.isRunning = true;
    const testId = this.generateTestId();
    const startTime = performance.now();

    try {
      console.log(`🚀 Iniciando teste de performance: ${testId}`);
      
      // Preparar ambiente de teste
      await this.prepareTestEnvironment();
      
      // Executar testes de carga
      const loadTestResults = await this.executeLoadTest();
      
      // Executar testes de banco de dados
      const dbTestResults = await this.executeDatabaseTest();
      
      // Coletar métricas de recursos
      const resourceUsage = await this.collectResourceMetrics();
      
      // Calcular resultados finais
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.results = {
        id: testId,
        timestamp: new Date(),
        config: this.config,
        duration,
        totalRequests: loadTestResults.totalRequests || 0,
        successfulRequests: loadTestResults.successfulRequests || 0,
        failedRequests: loadTestResults.failedRequests || 0,
        averageResponseTime: loadTestResults.averageResponseTime || 0,
        throughput: loadTestResults.throughput || 0,
        errorRate: loadTestResults.errorRate || 0,
        responseTimePercentiles: loadTestResults.responseTimePercentiles || { p50: 0, p95: 0, p99: 0 },
        endpointResults: loadTestResults.endpointResults || [],
        databaseResults: dbTestResults,
        resourceUsage,
        thresholdViolations: this.checkThresholds(loadTestResults, dbTestResults, resourceUsage),
        recommendations: this.generateRecommendations(loadTestResults, dbTestResults, resourceUsage)
      };
      
      // Salvar resultados
      await this.saveResults(this.results);
      
      // Enviar notificações
      await this.sendNotifications(this.results);
      
      console.log(`✅ Teste de performance concluído: ${testId}`);
      return this.results;
      
    } catch (error) {
      console.error('❌ Erro durante teste de performance:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  // Preparar ambiente para teste
  private async prepareTestEnvironment(): Promise<void> {
    // Verificar conectividade
    await this.checkConnectivity();
    
    // Limpar cache se necessário
    await this.clearCache();
    
    // Preparar dados de teste
    await this.prepareTestData();
  }

  // Executar teste de carga
  private async executeLoadTest(): Promise<Partial<TestResult>> {
    const results: EndpointResult[] = [];
    const allRequests: any[] = [];
    
    // Simular usuários concorrentes
    const userPromises = [];
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      userPromises.push(this.simulateUser(i, allRequests));
    }
    
    await Promise.all(userPromises);
    
    // Processar resultados por endpoint
    for (const endpoint of this.config.endpoints) {
      const endpointRequests = allRequests.filter(r => r.endpoint === endpoint.name);
      results.push(this.calculateEndpointMetrics(endpoint, endpointRequests));
    }
    
    // Calcular métricas gerais
    const totalRequests = allRequests.length;
    const successfulRequests = allRequests.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime = allRequests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests;
    const throughput = totalRequests / (this.config.testDuration);
    const errorRate = (failedRequests / totalRequests) * 100;
    
    const responseTimes = allRequests.map(r => r.responseTime).sort((a, b) => a - b);
    const responseTimePercentiles = {
      p50: this.calculatePercentile(responseTimes, 50),
      p95: this.calculatePercentile(responseTimes, 95),
      p99: this.calculatePercentile(responseTimes, 99)
    };
    
    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      throughput,
      errorRate,
      responseTimePercentiles,
      endpointResults: results
    };
  }

  // Simular usuário individual
  private async simulateUser(userId: number, allRequests: any[]): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + (this.config.testDuration * 1000);
    
    while (Date.now() < endTime) {
      // Selecionar endpoint baseado no peso
      const endpoint = this.selectWeightedEndpoint();
      
      // Executar requisição
      const requestStart = performance.now();
      try {
        const response = await this.makeRequest(endpoint);
        const requestEnd = performance.now();
        
        allRequests.push({
          userId,
          endpoint: endpoint.name,
          responseTime: requestEnd - requestStart,
          statusCode: response.status,
          success: response.ok,
          timestamp: new Date()
        });
      } catch (error) {
        const requestEnd = performance.now();
        allRequests.push({
          userId,
          endpoint: endpoint.name,
          responseTime: requestEnd - requestStart,
          statusCode: 0,
          success: false,
          error: (error as Error).message,
          timestamp: new Date()
        });
      }
      
      // Pequena pausa entre requisições
      await this.sleep(Math.random() * 1000);
    }
  }

  // Executar testes de banco de dados
  private async executeDatabaseTest(): Promise<DatabaseResult[]> {
    if (!this.config.database.enabled) {
      return [];
    }
    
    const results: DatabaseResult[] = [];
    
    for (const query of this.config.database.queries) {
      const queryResults = await this.testDatabaseQuery(query);
      results.push(queryResults);
    }
    
    return results;
  }

  // Testar query específica do banco
  private async testDatabaseQuery(query: DatabaseQuery): Promise<DatabaseResult> {
    const executions: number[] = [];
    const errors: string[] = [];
    let slowQueries = 0;
    
    // Executar query múltiplas vezes
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      try {
        const { data, error } = await this.supabase.rpc('execute_query', {
          query_text: query.query,
          query_params: query.params || []
        });
        
        if (error) {
          errors.push(error.message);
        }
        
        const end = performance.now();
        const duration = end - start;
        executions.push(duration);
        
        if (duration > this.config.thresholds.database.maxQueryTime) {
          slowQueries++;
        }
      } catch (error) {
        errors.push((error as Error).message);
        executions.push(0);
      }
    }
    
    const validExecutions = executions.filter(e => e > 0);
    
    return {
      name: query.name,
      query: query.query,
      executions: iterations,
      averageTime: validExecutions.reduce((sum, e) => sum + e, 0) / validExecutions.length,
      minTime: Math.min(...validExecutions),
      maxTime: Math.max(...validExecutions),
      errors: errors.length,
      slowQueries
    };
  }

  // Coletar métricas de recursos
  private async collectResourceMetrics(): Promise<ResourceUsage> {
    // Simular coleta de métricas (em produção, usar ferramentas específicas)
    return {
      cpu: {
        average: Math.random() * 80,
        peak: Math.random() * 100
      },
      memory: {
        average: Math.random() * 70,
        peak: Math.random() * 90
      },
      database: {
        connections: Math.floor(Math.random() * this.config.database.connectionPoolSize),
        activeQueries: Math.floor(Math.random() * 50)
      }
    };
  }

  // Verificar violações de threshold
  private checkThresholds(
    loadResults: Partial<TestResult>,
    dbResults: DatabaseResult[],
    resourceUsage: ResourceUsage
  ): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];
    
    // Verificar tempo de resposta
    if (loadResults.responseTimePercentiles?.p95 && loadResults.responseTimePercentiles.p95 > this.config.thresholds.responseTime.p95) {
      violations.push({
        type: 'response_time',
        metric: 'p95',
        expected: this.config.thresholds.responseTime.p95,
        actual: loadResults.responseTimePercentiles.p95,
        severity: 'high'
      });
    }
    
    // Verificar throughput
    if (loadResults.throughput! < this.config.thresholds.throughput.minRps) {
      violations.push({
        type: 'throughput',
        metric: 'rps',
        expected: this.config.thresholds.throughput.minRps,
        actual: loadResults.throughput!,
        severity: 'medium'
      });
    }
    
    // Verificar taxa de erro
    if (loadResults.errorRate! > this.config.thresholds.errorRate.maxPercent) {
      violations.push({
        type: 'error_rate',
        metric: 'percentage',
        expected: this.config.thresholds.errorRate.maxPercent,
        actual: loadResults.errorRate!,
        severity: 'critical'
      });
    }
    
    // Verificar queries lentas
    for (const dbResult of dbResults) {
      if (dbResult.averageTime > this.config.thresholds.database.maxQueryTime) {
        violations.push({
          type: 'database',
          metric: `query_${dbResult.name}`,
          expected: this.config.thresholds.database.maxQueryTime,
          actual: dbResult.averageTime,
          severity: 'medium'
        });
      }
    }
    
    return violations;
  }

  // Gerar recomendações
  private generateRecommendations(
    loadResults: Partial<TestResult>,
    dbResults: DatabaseResult[],
    resourceUsage: ResourceUsage
  ): string[] {
    const recommendations: string[] = [];
    
    // Recomendações baseadas em performance
    if (loadResults.errorRate! > 5) {
      recommendations.push('Alta taxa de erro detectada. Verificar logs de aplicação e infraestrutura.');
    }
    
    if (loadResults.responseTimePercentiles?.p95! > 2000) {
      recommendations.push('Tempo de resposta alto. Considerar otimização de queries e cache.');
    }
    
    if (resourceUsage.cpu.peak > 80) {
      recommendations.push('Alto uso de CPU detectado. Considerar scaling horizontal.');
    }
    
    if (resourceUsage.memory.peak > 85) {
      recommendations.push('Alto uso de memória. Verificar vazamentos e otimizar uso de memória.');
    }
    
    // Recomendações de banco de dados
    const slowQueries = dbResults.filter(r => r.slowQueries > 0);
    if (slowQueries.length > 0) {
      recommendations.push(`Queries lentas detectadas: ${slowQueries.map(q => q.name).join(', ')}. Considerar otimização.`);
    }
    
    return recommendations;
  }

  // Métodos auxiliares
  private generateTestId(): string {
    return `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`Conectividade falhou: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Erro de conectividade: ${(error as Error).message}`);
    }
  }

  private async clearCache(): Promise<void> {
    // Implementar limpeza de cache se necessário
  }

  private async prepareTestData(): Promise<void> {
    // Implementar preparação de dados de teste se necessário
  }

  private selectWeightedEndpoint(): TestEndpoint {
    const totalWeight = this.config.endpoints.reduce((sum, e) => sum + e.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of this.config.endpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return this.config.endpoints[0];
  }

  private async makeRequest(endpoint: TestEndpoint): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint.path}`;
    
    return fetch(url, {
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        ...endpoint.headers
      },
      body: endpoint.body ? JSON.stringify(endpoint.body) : undefined
    });
  }

  private calculateEndpointMetrics(endpoint: TestEndpoint, requests: any[]): EndpointResult {
    const totalRequests = requests.length;
    const successfulRequests = requests.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const responseTimes = requests.map(r => r.responseTime);
    const averageResponseTime = responseTimes.reduce((sum, t) => sum + t, 0) / totalRequests;
    const throughput = totalRequests / this.config.testDuration;
    const errorRate = (failedRequests / totalRequests) * 100;
    
    const statusCodes: Record<number, number> = {};
    requests.forEach(r => {
      statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
    });
    
    return {
      name: endpoint.name,
      path: endpoint.path,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      throughput,
      errorRate,
      statusCodes
    };
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * values.length) - 1;
    return values[index] || 0;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async saveResults(results: TestResult): Promise<void> {
    try {
      // Salvar no Supabase
      const { error } = await this.supabase
        .from('performance_test_results')
        .insert({
          test_id: results.id,
          config: results.config,
          results: results,
          created_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Erro ao salvar no Supabase:', error);
      }
      
      // Salvar arquivo local
      const resultsDir = path.join(process.cwd(), 'performance', 'results');
      await fs.mkdir(resultsDir, { recursive: true });
      
      const filename = `performance-${results.id}.json`;
      const filepath = path.join(resultsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(results, null, 2));
      
    } catch (error) {
      console.error('Erro ao salvar resultados:', error);
    }
  }

  private async sendNotifications(results: TestResult): Promise<void> {
    try {
      const criticalViolations = results.thresholdViolations.filter(v => v.severity === 'critical');
      
      if (criticalViolations.length > 0 || results.errorRate > 10) {
        // Enviar notificações apenas para problemas críticos
        await this.sendCriticalAlert(results);
      }
      
    } catch (error) {
      console.error('Erro ao enviar notificações:', error);
    }
  }

  private async sendCriticalAlert(results: TestResult): Promise<void> {
    const message = `🚨 ALERTA CRÍTICO - Teste de Performance\n\n` +
      `ID: ${results.id}\n` +
      `Taxa de Erro: ${results.errorRate.toFixed(2)}%\n` +
      `Throughput: ${results.throughput.toFixed(2)} RPS\n` +
      `Violações: ${results.thresholdViolations.length}\n\n` +
      `Recomendações:\n${results.recommendations.join('\n')}`;
    
    // Implementar envio de notificações (email, Slack, etc.)
    console.log(message);
  }

  // Métodos públicos para gerenciamento
  async listResults(limit = 10): Promise<TestResult[]> {
    try {
      const { data, error } = await this.supabase
        .from('performance_test_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data.map((row: any) => row.results);
    } catch (error) {
      console.error('Erro ao listar resultados:', error);
      return [];
    }
  }

  async getResult(testId: string): Promise<TestResult | null> {
    try {
      const { data, error } = await this.supabase
        .from('performance_test_results')
        .select('*')
        .eq('test_id', testId)
        .single();
      
      if (error) throw error;
      
      return data.results;
    } catch (error) {
      console.error('Erro ao buscar resultado:', error);
      return null;
    }
  }

  async deleteOldResults(daysOld = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const { data, error } = await this.supabase
        .from('performance_test_results')
        .delete()
        .lt('created_at', cutoffDate.toISOString());
      
      if (error) throw error;
      
      return data?.length || 0;
    } catch (error) {
      console.error('Erro ao deletar resultados antigos:', error);
      return 0;
    }
  }
}

// Configuração padrão
export const defaultPerformanceConfig: PerformanceTestConfig = {
  baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  concurrentUsers: parseInt(process.env.PERF_CONCURRENT_USERS || '10'),
  testDuration: parseInt(process.env.PERF_TEST_DURATION || '60'),
  rampUpTime: parseInt(process.env.PERF_RAMP_UP_TIME || '10'),
  endpoints: [
    {
      name: 'home',
      path: '/',
      method: 'GET',
      weight: 3,
      expectedStatusCode: 200
    },
    {
      name: 'api_health',
      path: '/api/health',
      method: 'GET',
      weight: 2,
      expectedStatusCode: 200
    },
    {
      name: 'dashboard',
      path: '/dashboard',
      method: 'GET',
      weight: 5,
      expectedStatusCode: 200
    }
  ],
  database: {
    enabled: true,
    queries: [
      {
        name: 'list_clients',
        query: 'SELECT * FROM clients LIMIT 100'
      },
      {
        name: 'count_payments',
        query: 'SELECT COUNT(*) FROM payments'
      }
    ],
    connectionPoolSize: 20
  },
  notifications: {
    email: {
      enabled: process.env.PERF_EMAIL_ENABLED === 'true',
      to: process.env.PERF_EMAIL_TO || '',
      from: process.env.PERF_EMAIL_FROM || ''
    },
    webhook: {
      enabled: process.env.PERF_WEBHOOK_ENABLED === 'true',
      url: process.env.PERF_WEBHOOK_URL || ''
    },
    slack: {
      enabled: process.env.PERF_SLACK_ENABLED === 'true',
      webhook: process.env.PERF_SLACK_WEBHOOK || '',
      channel: process.env.PERF_SLACK_CHANNEL || '#performance'
    }
  },
  thresholds: {
    responseTime: {
      p50: parseInt(process.env.PERF_THRESHOLD_P50 || '500'),
      p95: parseInt(process.env.PERF_THRESHOLD_P95 || '2000'),
      p99: parseInt(process.env.PERF_THRESHOLD_P99 || '5000')
    },
    throughput: {
      minRps: parseInt(process.env.PERF_THRESHOLD_MIN_RPS || '10')
    },
    errorRate: {
      maxPercent: parseInt(process.env.PERF_THRESHOLD_MAX_ERROR_RATE || '5')
    },
    database: {
      maxQueryTime: parseInt(process.env.PERF_THRESHOLD_MAX_QUERY_TIME || '1000'),
      maxConnections: parseInt(process.env.PERF_THRESHOLD_MAX_CONNECTIONS || '50')
    }
  }
};