/**
 * Sistema de Otimização de Recursos em Tempo Real
 * 
 * Monitora e otimiza automaticamente o uso de recursos da aplicação,
 * incluindo memória, CPU, rede e armazenamento, baseado em padrões
 * de uso e métricas de performance.
 */

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface ResourceMetrics {
  timestamp: number;
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  network: NetworkMetrics;
  storage: StorageMetrics;
  dom: DomMetrics;
  performance: PerformanceMetrics;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  available: number;
  percentage: number;
  heapUsed?: number;
  heapTotal?: number;
  external?: number;
  arrayBuffers?: number;
}

export interface CpuMetrics {
  usage: number;
  cores: number;
  frequency?: number;
  temperature?: number;
  processes: ProcessInfo[];
}

export interface ProcessInfo {
  name: string;
  cpu: number;
  memory: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export interface NetworkMetrics {
  bandwidth: number;
  latency: number;
  packetLoss: number;
  connectionType: string;
  downloadSpeed: number;
  uploadSpeed: number;
  activeConnections: number;
  requestsPerSecond: number;
}

export interface StorageMetrics {
  used: number;
  total: number;
  available: number;
  percentage: number;
  iops: number;
  readSpeed: number;
  writeSpeed: number;
  cacheHitRatio: number;
}

export interface DomMetrics {
  nodeCount: number;
  elementCount: number;
  listenerCount: number;
  memoryLeaks: number;
  renderTime: number;
  layoutShifts: number;
}

export interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  paintTime: number;
  scriptTime: number;
  layoutTime: number;
  gcTime: number;
  totalBlockingTime: number;
}

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  condition: (metrics: ResourceMetrics) => boolean;
  action: (metrics: ResourceMetrics) => Promise<OptimizationAction>;
  priority: number;
  cooldown: number;
  lastExecuted?: number;
  enabled: boolean;
}

export interface OptimizationAction {
  type: OptimizationType;
  target: string;
  parameters: Record<string, any>;
  expectedImpact: number;
  reversible: boolean;
  description: string;
}

export interface OptimizationResult {
  action: OptimizationAction;
  success: boolean;
  impact: number;
  duration: number;
  error?: string;
  metrics: {
    before: ResourceMetrics;
    after: ResourceMetrics;
  };
}

export interface ResourceThreshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
  direction: 'above' | 'below';
}

export interface OptimizationConfig {
  enabled: boolean;
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  thresholds: ResourceThreshold[];
  rules: OptimizationRule[];
  monitoringInterval: number;
  optimizationInterval: number;
  maxActionsPerMinute: number;
  enablePredictiveOptimization: boolean;
}

export type OptimizationType = 
  | 'memory_cleanup'
  | 'cache_optimization'
  | 'dom_cleanup'
  | 'image_optimization'
  | 'script_optimization'
  | 'network_optimization'
  | 'storage_cleanup'
  | 'performance_tuning'
  | 'resource_preloading'
  | 'lazy_loading';

// ============================================
// COLETORES DE MÉTRICAS
// ============================================

class ResourceMonitor {
  private metrics: ResourceMetrics[] = [];
  private observers: Map<string, any> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isMonitoring = false;

  constructor() {
    // Só configurar observers no cliente
    if (typeof window !== 'undefined') {
      this.setupObservers();
    }
  }

  private setupObservers(): void {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return;
    
    // Performance Observer para métricas de performance
    if ('PerformanceObserver' in window) {
      const perfObserver = new PerformanceObserver((list) => {
        this.processPerformanceEntries(list.getEntries());
      });

      try {
        perfObserver.observe({
          entryTypes: ['measure', 'navigation', 'paint', 'layout-shift', 'largest-contentful-paint']
        });
        this.observers.set('performance', perfObserver);
      } catch (error) {
        logger.warn('Erro ao configurar PerformanceObserver:', error);
      }
    }

    // Mutation Observer para métricas do DOM
    if ('MutationObserver' in window) {
      const domObserver = new MutationObserver((mutations) => {
        this.processDOMMutations(mutations);
      });

      domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
      this.observers.set('dom', domObserver);
    }

    // Intersection Observer para lazy loading
    if ('IntersectionObserver' in window) {
      const intersectionObserver = new IntersectionObserver((entries) => {
        this.processIntersectionEntries(entries);
      });
      this.observers.set('intersection', intersectionObserver);
    }
  }

  startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    const monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);

    this.intervals.set('monitoring', monitoringInterval);
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();

    this.observers.forEach((observer) => {
      if (observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers.clear();
  }

  private async collectMetrics(): Promise<ResourceMetrics> {
    const timestamp = Date.now();
    
    const metrics: ResourceMetrics = {
      timestamp,
      memory: await this.collectMemoryMetrics(),
      cpu: await this.collectCpuMetrics(),
      network: await this.collectNetworkMetrics(),
      storage: await this.collectStorageMetrics(),
      dom: this.collectDomMetrics(),
      performance: this.collectPerformanceMetrics()
    };

    this.metrics.push(metrics);
    
    // Manter apenas as últimas 100 medições
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    return metrics;
  }

  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    const memory: MemoryMetrics = {
      used: 0,
      total: 0,
      available: 0,
      percentage: 0
    };

    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return memory;

    // Tentar obter informações de memória do navegador
    if ('memory' in performance) {
      const perfMemory = (performance as any).memory;
      memory.heapUsed = perfMemory.usedJSHeapSize;
      memory.heapTotal = perfMemory.totalJSHeapSize;
      memory.used = perfMemory.usedJSHeapSize;
      memory.total = perfMemory.totalJSHeapSize;
      memory.available = perfMemory.totalJSHeapSize - perfMemory.usedJSHeapSize;
      memory.percentage = (perfMemory.usedJSHeapSize / perfMemory.totalJSHeapSize) * 100;
    }

    // Estimar uso de memória baseado no DOM
    const domSize = this.estimateDOMMemoryUsage();
    memory.used += domSize;

    return memory;
  }

  private async collectCpuMetrics(): Promise<CpuMetrics> {
    const cpu: CpuMetrics = {
      usage: 0,
      cores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
      processes: []
    };

    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return cpu;

    // Estimar uso de CPU baseado em performance
    const cpuUsage = await this.estimateCpuUsage();
    cpu.usage = cpuUsage;

    return cpu;
  }

  private async collectNetworkMetrics(): Promise<NetworkMetrics> {
    const network: NetworkMetrics = {
      bandwidth: 0,
      latency: 0,
      packetLoss: 0,
      connectionType: 'unknown',
      downloadSpeed: 0,
      uploadSpeed: 0,
      activeConnections: 0,
      requestsPerSecond: 0
    };

    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return network;

    // Obter informações de conexão
    const connection = (navigator as any).connection;
    if (connection) {
      network.connectionType = connection.effectiveType || connection.type || 'unknown';
      network.downloadSpeed = connection.downlink || 0;
      network.bandwidth = connection.downlink || 0;
      network.latency = connection.rtt || 0;
    }

    // Medir latência com ping
    try {
      const latency = await this.measureLatency();
      network.latency = latency;
    } catch (error) {
      logger.warn('Erro ao medir latência:', error);
    }

    return network;
  }

  private async collectStorageMetrics(): Promise<StorageMetrics> {
    const storage: StorageMetrics = {
      used: 0,
      total: 0,
      available: 0,
      percentage: 0,
      iops: 0,
      readSpeed: 0,
      writeSpeed: 0,
      cacheHitRatio: 0
    };

    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return storage;

    // Obter informações de armazenamento
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        storage.used = estimate.usage || 0;
        storage.total = estimate.quota || 0;
        storage.available = (estimate.quota || 0) - (estimate.usage || 0);
        storage.percentage = storage.total > 0 ? (storage.used / storage.total) * 100 : 0;
      } catch (error) {
        logger.warn('Erro ao obter estimativa de armazenamento:', error);
      }
    }

    // Medir velocidade de I/O
    try {
      const ioSpeed = await this.measureIOSpeed();
      storage.readSpeed = ioSpeed.read;
      storage.writeSpeed = ioSpeed.write;
    } catch (error) {
      logger.warn('Erro ao medir velocidade de I/O:', error);
    }

    return storage;
  }

  private collectDomMetrics(): DomMetrics {
    const dom: DomMetrics = {
      nodeCount: 0,
      elementCount: 0,
      listenerCount: 0,
      memoryLeaks: 0,
      renderTime: 0,
      layoutShifts: 0
    };

    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof document === 'undefined') return dom;

    // Contar nós do DOM
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ALL
    );

    let nodeCount = 0;
    let elementCount = 0;

    while (walker.nextNode()) {
      nodeCount++;
      if (walker.currentNode.nodeType === Node.ELEMENT_NODE) {
        elementCount++;
      }
    }

    dom.nodeCount = nodeCount;
    dom.elementCount = elementCount;

    // Estimar event listeners
    dom.listenerCount = this.estimateEventListeners();

    return dom;
  }

  private collectPerformanceMetrics(): PerformanceMetrics {
    const perf: PerformanceMetrics = {
      fps: 0,
      frameDrops: 0,
      paintTime: 0,
      scriptTime: 0,
      layoutTime: 0,
      gcTime: 0,
      totalBlockingTime: 0
    };

    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof performance === 'undefined') return perf;

    // Calcular FPS
    perf.fps = this.calculateFPS();

    // Obter métricas de performance
    const paintEntries = performance.getEntriesByType('paint');
    if (paintEntries.length > 0) {
      perf.paintTime = paintEntries[paintEntries.length - 1].startTime;
    }

    return perf;
  }

  private estimateDOMMemoryUsage(): number {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
    
    // Estimativa baseada no número de elementos e seu conteúdo
    const elements = document.querySelectorAll('*');
    let totalSize = 0;

    elements.forEach(element => {
      // Estimar tamanho baseado no tipo de elemento e conteúdo
      totalSize += 100; // Base size per element
      totalSize += (element.textContent?.length || 0) * 2; // Text content
      totalSize += (element.outerHTML.length - (element.textContent?.length || 0)) * 2; // HTML markup
    });

    return totalSize;
  }

  private async estimateCpuUsage(): Promise<number> {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof performance === 'undefined') return 0;
    
    return new Promise((resolve) => {
      const start = performance.now();
      const iterations = 100000;
      
      // Simular trabalho de CPU
      for (let i = 0; i < iterations; i++) {
        Math.random();
      }
      
      const end = performance.now();
      const duration = end - start;
      
      // Normalizar para uma escala de 0-100
      const cpuUsage = Math.min(100, (duration / 10) * 100);
      resolve(cpuUsage);
    });
  }

  private async measureLatency(): Promise<number> {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof performance === 'undefined') return 0;
    
    return new Promise((resolve, reject) => {
      const start = performance.now();
      
      fetch('/api/ping', { method: 'HEAD' })
        .then(() => {
          const end = performance.now();
          resolve(end - start);
        })
        .catch(() => {
          // Fallback: usar uma imagem pequena
          const img = new Image();
          img.onload = () => {
            const end = performance.now();
            resolve(end - start);
          };
          img.onerror = () => reject(new Error('Não foi possível medir latência'));
          img.src = '/favicon.ico?' + Date.now();
        });
    });
  }

  private async measureIOSpeed(): Promise<{ read: number; write: number }> {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof performance === 'undefined' || typeof localStorage === 'undefined') {
      return { read: 0, write: 0 };
    }
    
    const testData = 'x'.repeat(1024 * 10); // 10KB de dados de teste
    
    // Medir velocidade de escrita
    const writeStart = performance.now();
    try {
      localStorage.setItem('__io_test__', testData);
      const writeEnd = performance.now();
      const writeSpeed = (testData.length / (writeEnd - writeStart)) * 1000; // bytes/sec
      
      // Medir velocidade de leitura
      const readStart = performance.now();
      const readData = localStorage.getItem('__io_test__');
      const readEnd = performance.now();
      const readSpeed = ((readData?.length || 0) / (readEnd - readStart)) * 1000; // bytes/sec
      
      // Limpar dados de teste
      localStorage.removeItem('__io_test__');
      
      return { read: readSpeed, write: writeSpeed };
    } catch (error) {
      return { read: 0, write: 0 };
    }
  }

  private estimateEventListeners(): number {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof document === 'undefined') return 0;
    
    // Estimativa baseada em elementos comuns que têm listeners
    const interactiveElements = document.querySelectorAll(
      'button, a, input, select, textarea, [onclick], [onchange], [onsubmit]'
    );
    
    return interactiveElements.length * 2; // Estimativa de 2 listeners por elemento
  }

  private calculateFPS(): number {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return 60;
    
    // Implementação simplificada de cálculo de FPS
    let fps = 60; // Assumir 60 FPS como padrão
    
    if ('requestAnimationFrame' in window) {
      // Usar requestAnimationFrame para medir FPS real
      const frames: number[] = [];
      const measureFPS = () => {
        frames.push(performance.now());
        if (frames.length > 60) {
          frames.shift();
        }
        
        if (frames.length >= 2) {
          const duration = frames[frames.length - 1] - frames[0];
          fps = Math.round((frames.length - 1) / (duration / 1000));
        }
        
        requestAnimationFrame(measureFPS);
      };
      
      requestAnimationFrame(measureFPS);
    }
    
    return fps;
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach(entry => {
      // Processar entradas de performance para métricas detalhadas
      if (entry.entryType === 'layout-shift') {
        // Registrar layout shifts
      } else if (entry.entryType === 'largest-contentful-paint') {
        // Registrar LCP
      }
    });
  }

  private processDOMMutations(mutations: MutationRecord[]): void {
    // Analisar mudanças no DOM para detectar vazamentos de memória
    let significantChanges = 0;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        significantChanges += mutation.addedNodes.length;
      }
    });
    
    // Se há muitas mudanças, pode indicar vazamento de memória
    if (significantChanges > 50) {
      logger.warn('Muitas mudanças no DOM detectadas, possível vazamento de memória', undefined, "WARN");
    }
  }

  private processIntersectionEntries(entries: IntersectionObserverEntry[]): void {
    // Processar entradas de intersecção para lazy loading
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Elemento entrou na viewport
        const element = entry.target;
        if (element.hasAttribute('data-lazy-load')) {
          this.loadLazyElement(element);
        }
      }
    });
  }

  private loadLazyElement(element: Element): void {
    // Implementar carregamento lazy de elementos
    if (element instanceof HTMLImageElement) {
      const src = element.getAttribute('data-src');
      if (src) {
        element.src = src;
        element.removeAttribute('data-src');
        element.removeAttribute('data-lazy-load');
      }
    }
  }

  getLatestMetrics(): ResourceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getMetricsHistory(count: number = 10): ResourceMetrics[] {
    return this.metrics.slice(-count);
  }

  getAverageMetrics(period: number = 60000): Partial<ResourceMetrics> {
    const cutoff = Date.now() - period;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) return {};
    
    // Calcular médias
    const avg = recentMetrics.reduce((acc, metrics) => {
      acc.memory.used += metrics.memory.used;
      acc.memory.percentage += metrics.memory.percentage;
      acc.cpu.usage += metrics.cpu.usage;
      acc.network.latency += metrics.network.latency;
      acc.performance.fps += metrics.performance.fps;
      return acc;
    }, {
      memory: { used: 0, percentage: 0 },
      cpu: { usage: 0 },
      network: { latency: 0 },
      performance: { fps: 0 }
    } as any);
    
    const count = recentMetrics.length;
    return {
      memory: {
        used: avg.memory.used / count,
        percentage: avg.memory.percentage / count
      },
      cpu: {
        usage: avg.cpu.usage / count
      },
      network: {
        latency: avg.network.latency / count
      },
      performance: {
        fps: avg.performance.fps / count
      }
    } as any;
  }
}

// ============================================
// OTIMIZADOR DE RECURSOS
// ============================================

export class ResourceOptimizer {
  private monitor: ResourceMonitor;
  private config: OptimizationConfig;
  private rules: Map<string, OptimizationRule> = new Map();
  private actionHistory: OptimizationResult[] = [];
  private isOptimizing = false;
  private optimizationInterval?: NodeJS.Timeout;

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.monitor = new ResourceMonitor();
    this.config = {
      enabled: true,
      aggressiveness: 'moderate',
      thresholds: this.getDefaultThresholds(),
      rules: [],
      monitoringInterval: 5000,
      optimizationInterval: 30000,
      maxActionsPerMinute: 5,
      enablePredictiveOptimization: true,
      ...config
    };
    
    this.initializeDefaultRules();
  }

  private getDefaultThresholds(): ResourceThreshold[] {
    return [
      {
        metric: 'memory.percentage',
        warning: 70,
        critical: 85,
        unit: '%',
        direction: 'above'
      },
      {
        metric: 'cpu.usage',
        warning: 60,
        critical: 80,
        unit: '%',
        direction: 'above'
      },
      {
        metric: 'network.latency',
        warning: 200,
        critical: 500,
        unit: 'ms',
        direction: 'above'
      },
      {
        metric: 'performance.fps',
        warning: 30,
        critical: 20,
        unit: 'fps',
        direction: 'below'
      },
      {
        metric: 'dom.nodeCount',
        warning: 5000,
        critical: 10000,
        unit: 'nodes',
        direction: 'above'
      }
    ];
  }

  private initializeDefaultRules(): void {
    // Regra: Limpeza de memória quando uso alto
    this.addRule({
      id: 'memory_cleanup_high',
      name: 'Limpeza de Memória - Alto Uso',
      description: 'Executa limpeza de memória quando o uso está alto',
      condition: (metrics) => metrics.memory.percentage > 80,
      action: async (metrics) => ({
        type: 'memory_cleanup',
        target: 'global',
        parameters: { aggressive: true },
        expectedImpact: 20,
        reversible: false,
        description: 'Limpeza agressiva de memória'
      }),
      priority: 9,
      cooldown: 60000,
      enabled: true
    });

    // Regra: Otimização de cache
    this.addRule({
      id: 'cache_optimization',
      name: 'Otimização de Cache',
      description: 'Otimiza o cache quando a latência está alta',
      condition: (metrics) => metrics.network.latency > 300,
      action: async (metrics) => ({
        type: 'cache_optimization',
        target: 'network',
        parameters: { preload: true, compress: true },
        expectedImpact: 15,
        reversible: true,
        description: 'Otimização de cache de rede'
      }),
      priority: 7,
      cooldown: 120000,
      enabled: true
    });

    // Regra: Limpeza do DOM
    this.addRule({
      id: 'dom_cleanup',
      name: 'Limpeza do DOM',
      description: 'Remove elementos desnecessários do DOM',
      condition: (metrics) => metrics.dom.nodeCount > 8000,
      action: async (metrics) => ({
        type: 'dom_cleanup',
        target: 'dom',
        parameters: { removeHidden: true, cleanupListeners: true },
        expectedImpact: 10,
        reversible: false,
        description: 'Limpeza de elementos DOM desnecessários'
      }),
      priority: 6,
      cooldown: 180000,
      enabled: true
    });

    // Regra: Otimização de imagens
    this.addRule({
      id: 'image_optimization',
      name: 'Otimização de Imagens',
      description: 'Otimiza imagens para reduzir uso de memória',
      condition: (metrics) => metrics.memory.percentage > 60,
      action: async (metrics) => ({
        type: 'image_optimization',
        target: 'images',
        parameters: { quality: 0.8, lazy: true },
        expectedImpact: 25,
        reversible: true,
        description: 'Otimização de qualidade e carregamento de imagens'
      }),
      priority: 5,
      cooldown: 300000,
      enabled: true
    });

    // Regra: Lazy loading
    this.addRule({
      id: 'lazy_loading',
      name: 'Carregamento Lazy',
      description: 'Ativa carregamento lazy para elementos fora da viewport',
      condition: (metrics) => metrics.performance.fps < 40,
      action: async (metrics) => ({
        type: 'lazy_loading',
        target: 'elements',
        parameters: { threshold: 0.1, rootMargin: '50px' },
        expectedImpact: 30,
        reversible: true,
        description: 'Ativação de carregamento lazy'
      }),
      priority: 4,
      cooldown: 240000,
      enabled: true
    });
  }

  addRule(rule: OptimizationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  start(): void {
    if (!this.config.enabled) return;

    this.monitor.startMonitoring(this.config.monitoringInterval);
    
    this.optimizationInterval = setInterval(() => {
      this.runOptimization();
    }, this.config.optimizationInterval);
  }

  stop(): void {
    this.monitor.stopMonitoring();
    
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = undefined;
    }
  }

  private async runOptimization(): Promise<void> {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    
    try {
      const metrics = this.monitor.getLatestMetrics();
      if (!metrics) return;

      // Verificar se não excedemos o limite de ações por minuto
      const recentActions = this.actionHistory.filter(
        result => Date.now() - result.metrics.before.timestamp < 60000
      );
      
      if (recentActions.length >= this.config.maxActionsPerMinute) {
        console.log('Limite de ações por minuto atingido, pulando otimização');
        return;
      }

      // Encontrar regras aplicáveis
      const applicableRules = Array.from(this.rules.values())
        .filter(rule => {
          if (!rule.enabled) return false;
          if (rule.lastExecuted && Date.now() - rule.lastExecuted < rule.cooldown) return false;
          return rule.condition(metrics);
        })
        .sort((a, b) => b.priority - a.priority);

      // Executar a regra de maior prioridade
      if (applicableRules.length > 0) {
        const rule = applicableRules[0];
        await this.executeRule(rule, metrics);
      }
    } catch (error) {
      console.error('Erro durante otimização:', error);
    } finally {
      this.isOptimizing = false;
    }
  }

  private async executeRule(rule: OptimizationRule, metrics: ResourceMetrics): Promise<void> {
    logger.debug(`Executando regra de otimização: ${rule.name}`, undefined, "DEBUG");
    
    const beforeMetrics = metrics;
    const startTime = performance.now();
    
    try {
      const action = await rule.action(metrics);
      const success = await this.executeAction(action);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Aguardar um pouco para coletar métricas após a otimização
      await new Promise(resolve => setTimeout(resolve, 1000));
      const afterMetrics = this.monitor.getLatestMetrics() || metrics;
      
      const impact = this.calculateImpact(beforeMetrics, afterMetrics, action.type);
      
      const result: OptimizationResult = {
        action,
        success,
        impact,
        duration,
        metrics: {
          before: beforeMetrics,
          after: afterMetrics
        }
      };
      
      this.actionHistory.push(result);
      rule.lastExecuted = Date.now();
      
      console.log(`Otimização concluída: ${action.description}, impacto: ${impact.toFixed(1)}%`);
      
    } catch (error) {
      console.error(`Erro ao executar regra ${rule.name}:`, error);
      
      const result: OptimizationResult = {
        action: await rule.action(metrics),
        success: false,
        impact: 0,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        metrics: {
          before: beforeMetrics,
          after: beforeMetrics
        }
      };
      
      this.actionHistory.push(result);
    }
  }

  private async executeAction(action: OptimizationAction): Promise<boolean> {
    try {
      switch (action.type) {
        case 'memory_cleanup':
          return await this.executeMemoryCleanup(action.parameters);
        
        case 'cache_optimization':
          return await this.executeCacheOptimization(action.parameters);
        
        case 'dom_cleanup':
          return await this.executeDOMCleanup(action.parameters);
        
        case 'image_optimization':
          return await this.executeImageOptimization(action.parameters);
        
        case 'lazy_loading':
          return await this.executeLazyLoading(action.parameters);
        
        case 'script_optimization':
          return await this.executeScriptOptimization(action.parameters);
        
        case 'network_optimization':
          return await this.executeNetworkOptimization(action.parameters);
        
        default:
          logger.warn(`Tipo de ação não implementado: ${action.type}`, undefined, "WARN");
          return false;
      }
    } catch (error) {
      console.error(`Erro ao executar ação ${action.type}:`, error);
      return false;
    }
  }

  private async executeMemoryCleanup(params: any): Promise<boolean> {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return false;
    
    // Forçar garbage collection se disponível
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    // Limpar caches desnecessários
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name => name.includes('old') || name.includes('temp'));
      
      for (const cacheName of oldCaches) {
        await caches.delete(cacheName);
      }
    }
    
    // Limpar localStorage de itens antigos
    if (typeof localStorage !== 'undefined') {
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 dias
      
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('temp_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key) || '{}');
            if (item.timestamp && now - item.timestamp > maxAge) {
              localStorage.removeItem(key);
            }
          } catch {
            // Se não conseguir parsear, remover
            localStorage.removeItem(key);
          }
        }
      }
    }
    
    return true;
  }

  private async executeCacheOptimization(params: any): Promise<boolean> {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined') return false;
    
    // Implementar otimização de cache
    if ('caches' in window) {
      const cache = await caches.open('optimized-cache');
      
      // Pre-carregar recursos críticos
      if (params.preload) {
        const criticalResources = [
          '/api/critical-data',
          '/styles/critical.css',
          '/scripts/critical.js'
        ];
        
        for (const resource of criticalResources) {
          try {
            await cache.add(resource);
          } catch (error) {
            logger.warn(`Erro ao pre-carregar ${resource}:`, error);
          }
        }
      }
    }
    
    return true;
  }

  private async executeDOMCleanup(params: any): Promise<boolean> {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    
    let cleaned = 0;
    
    // Remover elementos ocultos desnecessários
    if (params.removeHidden) {
      const hiddenElements = document.querySelectorAll('[style*="display: none"], .hidden');
      hiddenElements.forEach(element => {
        if (!element.hasAttribute('data-keep')) {
          element.remove();
          cleaned++;
        }
      });
    }
    
    // Limpar event listeners órfãos
    if (params.cleanupListeners) {
      // Implementação simplificada - remover elementos com muitos listeners
      const elements = document.querySelectorAll('*');
      elements.forEach(element => {
        if (element.hasAttribute('data-cleanup-listeners')) {
          const clone = element.cloneNode(true);
          element.parentNode?.replaceChild(clone, element);
          cleaned++;
        }
      });
    }
    
    logger.debug(`DOM cleanup: ${cleaned} elementos processados`, undefined, "DEBUG");
    return cleaned > 0;
  }

  private async executeImageOptimization(params: any): Promise<boolean> {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    
    const images = document.querySelectorAll('img');
    let optimized = 0;
    
    images.forEach(img => {
      // Implementar lazy loading
      if (params.lazy && !img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
        optimized++;
      }
      
      // Otimizar qualidade se a imagem for muito grande
      if (img.naturalWidth > 1920 || img.naturalHeight > 1080) {
        // Marcar para redimensionamento
        img.setAttribute('data-optimize', 'true');
        optimized++;
      }
    });
    
    logger.debug(`Image optimization: ${optimized} imagens otimizadas`, undefined, "DEBUG");
    return optimized > 0;
  }

  private async executeLazyLoading(params: any): Promise<boolean> {
    // Verificar se estamos no cliente
    if (typeof window === 'undefined' || typeof document === 'undefined' || !('IntersectionObserver' in window)) return false;
    
    // Implementar lazy loading para elementos fora da viewport
    const elements = document.querySelectorAll('img, iframe, video');
    let processed = 0;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const src = element.getAttribute('data-src');
          if (src) {
            element.setAttribute('src', src);
            element.removeAttribute('data-src');
            observer.unobserve(element);
          }
        }
      });
    }, {
      threshold: params.threshold || 0.1,
      rootMargin: params.rootMargin || '50px'
    });
    
    elements.forEach(element => {
      if (!element.hasAttribute('data-lazy-processed')) {
        const src = element.getAttribute('src');
        if (src) {
          element.setAttribute('data-src', src);
          element.removeAttribute('src');
          element.setAttribute('data-lazy-processed', 'true');
          observer.observe(element);
          processed++;
        }
      }
    });
    
    logger.debug(`Lazy loading: ${processed} elementos processados`, undefined, "DEBUG");
    return processed > 0;
  }

  private async executeScriptOptimization(params: any): Promise<boolean> {
    // Implementar otimização de scripts
    logger.debug('Script optimization executada', undefined, "DEBUG");
    return true;
  }

  private async executeNetworkOptimization(params: any): Promise<boolean> {
    // Implementar otimização de rede
    logger.debug('Network optimization executada', undefined, "DEBUG");
    return true;
  }

  private calculateImpact(before: ResourceMetrics, after: ResourceMetrics, actionType: OptimizationType): number {
    switch (actionType) {
      case 'memory_cleanup':
        return ((before.memory.percentage - after.memory.percentage) / before.memory.percentage) * 100;
      
      case 'cache_optimization':
        return ((before.network.latency - after.network.latency) / before.network.latency) * 100;
      
      case 'dom_cleanup':
        return ((before.dom.nodeCount - after.dom.nodeCount) / before.dom.nodeCount) * 100;
      
      case 'lazy_loading':
        return ((after.performance.fps - before.performance.fps) / before.performance.fps) * 100;
      
      default:
        return 0;
    }
  }

  getMetrics(): ResourceMetrics | null {
    return this.monitor.getLatestMetrics();
  }

  getMetricsHistory(count: number = 10): ResourceMetrics[] {
    return this.monitor.getMetricsHistory(count);
  }

  getOptimizationHistory(count: number = 10): OptimizationResult[] {
    return this.actionHistory.slice(-count);
  }

  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  getRules(): OptimizationRule[] {
    return Array.from(this.rules.values());
  }
}

// ============================================
// INSTÂNCIA GLOBAL E HOOKS
// ============================================

// Lazy initialization para evitar problemas no SSR
let _resourceOptimizer: ResourceOptimizer | null = null;

export function getResourceOptimizer(): ResourceOptimizer {
  if (typeof window === 'undefined') {
    // No servidor, retornar uma instância mock
    return {
      getMetrics: () => null,
      getMetricsHistory: () => [],
      getOptimizationHistory: () => [],
      getConfig: () => ({
        enabled: false,
        aggressiveness: 'moderate' as const,
        thresholds: [
          { metric: 'memory', warning: 70, critical: 85, unit: '%', direction: 'above' },
          { metric: 'cpu', warning: 70, critical: 85, unit: '%', direction: 'above' },
          { metric: 'network', warning: 1000, critical: 2000, unit: 'ms', direction: 'above' },
          { metric: 'storage', warning: 80, critical: 90, unit: '%', direction: 'above' },
          { metric: 'dom', warning: 1000, critical: 2000, unit: 'nodes', direction: 'above' },
          { metric: 'performance', warning: 30, critical: 15, unit: 'fps', direction: 'below' }
        ],
        rules: [],
        monitoringInterval: 5000,
        optimizationInterval: 30000,
        maxActionsPerMinute: 10,
        enablePredictiveOptimization: false
      }),
      getRules: () => [],
      start: () => {},
      stop: () => {},
      updateConfig: () => {},
      addRule: () => {},
      removeRule: () => {}
    } as any;
  }
  
  if (!_resourceOptimizer) {
    _resourceOptimizer = new ResourceOptimizer();
  }
  return _resourceOptimizer;
}

// Manter compatibilidade com código existente
// REMOVIDO: export const resourceOptimizer = getResourceOptimizer();
// Esta linha causava problemas no SSR pois criava uma instância durante a importação
// Use getResourceOptimizer() diretamente quando necessário

// Hook React para usar otimização de recursos
import { useState, useEffect } from 'react';
import { logger } from '@/utils/production-logger'

export function useResourceOptimization() {
  const [metrics, setMetrics] = useState<ResourceMetrics | null>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationResult[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [config, setConfig] = useState<OptimizationConfig | null>(null);

  useEffect(() => {
    // Só executar no cliente
    if (typeof window === 'undefined') return;
    
    const optimizer = getResourceOptimizer();
    setConfig(optimizer.getConfig());
    
    // Atualizar métricas periodicamente
    const updateMetrics = () => {
      setMetrics(optimizer.getMetrics());
      setOptimizationHistory(optimizer.getOptimizationHistory());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, []);

  const startOptimization = () => {
    if (typeof window === 'undefined') return;
    setIsOptimizing(true);
    getResourceOptimizer().start();
  };

  const stopOptimization = () => {
    if (typeof window === 'undefined') return;
    setIsOptimizing(false);
    getResourceOptimizer().stop();
  };

  const updateConfig = (newConfig: Partial<OptimizationConfig>) => {
    if (typeof window === 'undefined') return;
    const optimizer = getResourceOptimizer();
    optimizer.updateConfig(newConfig);
    setConfig(optimizer.getConfig());
  };

  const addRule = (rule: OptimizationRule) => {
    if (typeof window === 'undefined') return;
    getResourceOptimizer().addRule(rule);
  };

  const removeRule = (ruleId: string) => {
    if (typeof window === 'undefined') return;
    getResourceOptimizer().removeRule(ruleId);
  };

  return {
    metrics,
    optimizationHistory,
    isOptimizing,
    config: config || {
      enabled: false,
      aggressiveness: 'moderate' as const,
      thresholds: [
        { metric: 'memory', warning: 70, critical: 85, unit: '%', direction: 'above' },
        { metric: 'cpu', warning: 70, critical: 85, unit: '%', direction: 'above' },
        { metric: 'network', warning: 1000, critical: 2000, unit: 'ms', direction: 'above' },
        { metric: 'storage', warning: 80, critical: 90, unit: '%', direction: 'above' },
        { metric: 'dom', warning: 1000, critical: 2000, unit: 'nodes', direction: 'above' },
        { metric: 'performance', warning: 30, critical: 15, unit: 'fps', direction: 'below' }
      ],
      rules: [],
      monitoringInterval: 5000,
      optimizationInterval: 30000,
      maxActionsPerMinute: 10,
      enablePredictiveOptimization: false
    },
    startOptimization,
    stopOptimization,
    updateConfig,
    addRule,
    removeRule,
    rules: typeof window !== 'undefined' ? getResourceOptimizer().getRules() : []
  };
}
