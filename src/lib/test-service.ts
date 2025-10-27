// Serviço para gerenciamento de testes automáticos
export interface TestConfig {
  id: string;
  name: string;
  description?: string;
  type: 'speed' | 'stability' | 'compatibility' | 'security';
  enabled: boolean;
  schedule?: TestSchedule;
  parameters: Record<string, any>;
  serverId?: string;
  durationHours?: number;
  clientInfo?: {
    iptvUsername?: string;
    email?: string;
    phone?: string;
  };
  messaging?: {
    enabled: boolean;
    channel?: 'email' | 'whatsapp';
    recipient?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TestSchedule {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 (Sunday-Saturday)
  dayOfMonth?: number; // 1-31
}

export interface TestExecution {
  id: string;
  testId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // em segundos
  results?: TestResults;
  error?: string;
  logs: string[];
}

export interface TestResults {
  success: boolean;
  score?: number;
  metrics: Record<string, any>;
  details: string;
  recommendations?: string[];
}

export interface TestServer {
  id: string;
  name: string;
  url: string;
  location: string;
  enabled: boolean;
  lastPing?: Date;
  status: 'online' | 'offline' | 'maintenance';
}

export class TestService {
  private tests: Map<string, TestConfig> = new Map();
  private executions: Map<string, TestExecution> = new Map();
  private servers: Map<string, TestServer> = new Map();

  constructor() {
    // Removido: this.initializeDefaultServers();
    // Os servidores agora devem ser adicionados manualmente pelo usuário
  }

  // Gerenciamento de testes
  async createTest(test: Omit<TestConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestConfig> {
    const newTest: TestConfig = {
      ...test,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tests.set(newTest.id, newTest);
    return newTest;
  }

  async updateTest(id: string, updates: Partial<TestConfig>): Promise<TestConfig | null> {
    const test = this.tests.get(id);
    if (!test) return null;

    const updatedTest = {
      ...test,
      ...updates,
      updatedAt: new Date()
    };

    this.tests.set(id, updatedTest);
    return updatedTest;
  }

  async deleteTest(id: string): Promise<boolean> {
    return this.tests.delete(id);
  }

  async getTests(): Promise<TestConfig[]> {
    return Array.from(this.tests.values());
  }

  async getTest(id: string): Promise<TestConfig | null> {
    return this.tests.get(id) || null;
  }

  async getActiveTests(): Promise<TestConfig[]> {
    return Array.from(this.tests.values()).filter(test => test.enabled);
  }

  // Execução de testes
  async executeTest(testId: string, serverId?: string): Promise<TestExecution> {
    const test = await this.getTest(testId);
    if (!test) {
      throw new Error(`Teste não encontrado: ${testId}`);
    }

    const execution: TestExecution = {
      id: this.generateId(),
      testId,
      status: 'pending',
      logs: []
    };

    this.executions.set(execution.id, execution);

    // Executar teste de forma assíncrona
    this.runTestExecution(execution, test, serverId).catch(error => {
      execution.status = 'failed';
      execution.error = error.message;
      execution.completedAt = new Date();
      this.executions.set(execution.id, execution);
    });

    return execution;
  }

  private async runTestExecution(execution: TestExecution, test: TestConfig, serverId?: string): Promise<void> {
    execution.status = 'running';
    execution.startedAt = new Date();
    execution.logs.push(`Iniciando teste: ${test.name}`);
    this.executions.set(execution.id, execution);

    try {
      // Simular execução do teste
      const results = await this.performTest(test, serverId);
      
      execution.status = 'completed';
      execution.completedAt = new Date();
      execution.duration = Math.floor((execution.completedAt.getTime() - execution.startedAt!.getTime()) / 1000);
      execution.results = results;
      execution.logs.push(`Teste concluído com sucesso`);
      
      this.executions.set(execution.id, execution);
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.error = error instanceof Error ? error.message : 'Erro desconhecido';
      execution.logs.push(`Erro na execução: ${execution.error}`);
      
      this.executions.set(execution.id, execution);
    }
  }

  private async performTest(test: TestConfig, serverId?: string): Promise<TestResults> {
    // Simular diferentes tipos de teste
    await this.delay(2000 + Math.random() * 3000); // 2-5 segundos

    const success = Math.random() > 0.1; // 90% de sucesso
    const score = success ? 70 + Math.random() * 30 : Math.random() * 50;

    const results: TestResults = {
      success,
      score: Math.round(score),
      metrics: this.generateTestMetrics(test.type),
      details: this.generateTestDetails(test.type, success),
      recommendations: success ? [] : this.generateRecommendations(test.type)
    };

    return results;
  }

  private generateTestMetrics(type: TestConfig['type']): Record<string, any> {
    switch (type) {
      case 'speed':
        return {
          loadTime: Math.round(1000 + Math.random() * 2000), // ms
          firstByte: Math.round(200 + Math.random() * 500), // ms
          domReady: Math.round(1500 + Math.random() * 1000), // ms
          bandwidth: Math.round(50 + Math.random() * 100) // Mbps
        };
      case 'stability':
        return {
          uptime: Math.round(95 + Math.random() * 5), // %
          errorRate: Math.round(Math.random() * 5 * 100) / 100, // %
          responseTime: Math.round(100 + Math.random() * 200), // ms
          availability: Math.round(98 + Math.random() * 2) // %
        };
      case 'compatibility':
        return {
          browserSupport: Math.round(85 + Math.random() * 15), // %
          mobileCompatibility: Math.round(90 + Math.random() * 10), // %
          crossPlatform: Math.round(80 + Math.random() * 20) // %
        };
      case 'security':
        return {
          vulnerabilities: Math.floor(Math.random() * 3),
          sslScore: Math.round(80 + Math.random() * 20),
          securityHeaders: Math.round(70 + Math.random() * 30)
        };
      default:
        return {};
    }
  }

  private generateTestDetails(type: TestConfig['type'], success: boolean): string {
    if (success) {
      switch (type) {
        case 'speed':
          return 'Teste de velocidade concluído. Tempos de carregamento dentro dos parâmetros aceitáveis.';
        case 'stability':
          return 'Teste de estabilidade concluído. Sistema apresenta boa disponibilidade e baixa taxa de erro.';
        case 'compatibility':
          return 'Teste de compatibilidade concluído. Boa compatibilidade entre diferentes navegadores e dispositivos.';
        case 'security':
          return 'Teste de segurança concluído. Nenhuma vulnerabilidade crítica encontrada.';
        default:
          return 'Teste concluído com sucesso.';
      }
    } else {
      switch (type) {
        case 'speed':
          return 'Teste de velocidade falhou. Tempos de carregamento acima do aceitável.';
        case 'stability':
          return 'Teste de estabilidade falhou. Sistema apresenta instabilidade ou alta taxa de erro.';
        case 'compatibility':
          return 'Teste de compatibilidade falhou. Problemas de compatibilidade detectados.';
        case 'security':
          return 'Teste de segurança falhou. Vulnerabilidades de segurança encontradas.';
        default:
          return 'Teste falhou.';
      }
    }
  }

  private generateRecommendations(type: TestConfig['type']): string[] {
    switch (type) {
      case 'speed':
        return [
          'Otimizar imagens e recursos estáticos',
          'Implementar cache de navegador',
          'Minificar CSS e JavaScript',
          'Usar CDN para distribuição de conteúdo'
        ];
      case 'stability':
        return [
          'Implementar monitoramento de saúde',
          'Configurar alertas de disponibilidade',
          'Revisar logs de erro',
          'Implementar retry automático'
        ];
      case 'compatibility':
        return [
          'Testar em diferentes navegadores',
          'Implementar polyfills necessários',
          'Otimizar para dispositivos móveis',
          'Validar HTML e CSS'
        ];
      case 'security':
        return [
          'Atualizar dependências vulneráveis',
          'Implementar headers de segurança',
          'Configurar HTTPS adequadamente',
          'Revisar permissões de acesso'
        ];
      default:
        return [];
    }
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status === 'completed' || execution.status === 'failed') {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();
    execution.logs.push('Execução cancelada pelo usuário');
    this.executions.set(executionId, execution);
    
    return true;
  }

  // Gerenciamento de servidores
  async getServers(): Promise<TestServer[]> {
    return Array.from(this.servers.values());
  }

  async getActiveServers(): Promise<TestServer[]> {
    return Array.from(this.servers.values()).filter(server => server.enabled);
  }

  async addServer(server: Omit<TestServer, 'id'>): Promise<TestServer> {
    const newServer: TestServer = {
      ...server,
      id: this.generateId()
    };

    this.servers.set(newServer.id, newServer);
    return newServer;
  }

  async updateServer(id: string, updates: Partial<TestServer>): Promise<TestServer | null> {
    const server = this.servers.get(id);
    if (!server) return null;

    const updatedServer = { ...server, ...updates };
    this.servers.set(id, updatedServer);
    return updatedServer;
  }

  async deleteServer(id: string): Promise<boolean> {
    return this.servers.delete(id);
  }

  // Histórico e estatísticas
  async getExecutions(testId?: string): Promise<TestExecution[]> {
    const executions = Array.from(this.executions.values());
    return testId ? executions.filter(e => e.testId === testId) : executions;
  }

  async getExecution(id: string): Promise<TestExecution | null> {
    return this.executions.get(id) || null;
  }

  async getExecutionStats(): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
    cancelled: number;
  }> {
    const executions = Array.from(this.executions.values());
    return {
      total: executions.length,
      completed: executions.filter(e => e.status === 'completed').length,
      failed: executions.filter(e => e.status === 'failed').length,
      pending: executions.filter(e => e.status === 'pending').length,
      running: executions.filter(e => e.status === 'running').length,
      cancelled: executions.filter(e => e.status === 'cancelled').length
    };
  }

  // Utilitários
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private initializeDefaultServers(): void {
    const defaultServers: Omit<TestServer, 'id'>[] = [
      {
        name: 'Servidor Principal',
        url: 'https://api.exemplo.com',
        location: 'São Paulo, BR',
        enabled: true,
        status: 'online'
      },
      {
        name: 'Servidor Backup',
        url: 'https://backup.exemplo.com',
        location: 'Rio de Janeiro, BR',
        enabled: true,
        status: 'online'
      },
      {
        name: 'Servidor Internacional',
        url: 'https://intl.exemplo.com',
        location: 'Miami, US',
        enabled: false,
        status: 'maintenance'
      }
    ];

    defaultServers.forEach(server => {
      this.addServer(server);
    });
  }
}

// Instância singleton
let testServiceInstance: TestService | null = null;

export const getTestService = (): TestService => {
  if (!testServiceInstance) {
    testServiceInstance = new TestService();
  }
  return testServiceInstance;
};

// Função de conveniência para criar testes automáticos
export const createAutomaticTest = (test: Omit<TestConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestConfig> => {
  return getTestService().createTest(test);
};

export default TestService;
