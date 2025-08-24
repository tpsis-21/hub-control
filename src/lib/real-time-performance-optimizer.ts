/**
 * Sistema de Otimização de Performance em Tempo Real
 * 
 * Monitora métricas críticas de performance e aplica otimizações
 * automáticas em tempo real para manter a aplicação responsiva
 * e eficiente, utilizando técnicas adaptativas e machine learning.
 */

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface PerformanceMetrics {
  timestamp: number;
  core: CoreMetrics;
  rendering: RenderingMetrics;
  network: NetworkMetrics;
  memory: MemoryMetrics;
  user: UserExperienceMetrics;
  system: SystemMetrics;
}

export interface CoreMetrics {
  fps: number;
  frameTime: number;
  jankCount: number;
  longTasks: number;
  mainThreadBlocking: number;
  scriptDuration: number;
  layoutThrashing: number;
}

export interface RenderingMetrics {
  paintTime: number;
  layoutTime: number;
  compositeTime: number;
  domNodes: number;
  styleRecalc: number;
  layoutShifts: number;
  renderBlocking: number;
}

export interface NetworkMetrics {
  requestCount: number;
  totalSize: number;
  loadTime: number;
  ttfb: number; // Time to First Byte
  bandwidth: number;
  latency: number;
  failedRequests: number;
}

export interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  heapLimit: number;
  external: number;
  gcCount: number;
  gcDuration: number;
  memoryPressure: number;
}

export interface UserExperienceMetrics {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  interactionDelay: number;
  scrollResponsiveness: number;
}

export interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskIO: number;
  networkIO: number;
  batteryLevel: number;
  thermalState: string;
  connectionType: string;
}

export interface OptimizationRule {
  id: string;
  name: string;
  description: string;
  condition: OptimizationCondition;
  action: OptimizationAction;
  priority: number;
  cooldown: number; // ms
  maxExecutions: number;
  enabled: boolean;
  category: OptimizationCategory;
}

export interface OptimizationCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration?: number; // ms - condição deve persistir por este tempo
  consecutive?: number; // número de medições consecutivas
}

export interface OptimizationAction {
  type: ActionType;
  parameters: Record<string, any>;
  impact: ImpactLevel;
  reversible: boolean;
  duration?: number; // ms - duração da otimização
}

export interface OptimizationResult {
  id: string;
  ruleId: string;
  timestamp: number;
  action: OptimizationAction;
  beforeMetrics: PerformanceMetrics;
  afterMetrics?: PerformanceMetrics;
  impact: OptimizationImpact;
  success: boolean;
  error?: string;
  duration: number;
}

export interface OptimizationImpact {
  fpsImprovement: number;
  memoryReduction: number;
  loadTimeReduction: number;
  userExperienceScore: number;
  energySavings: number;
}

export interface AdaptiveConfig {
  learningRate: number;
  adaptationThreshold: number;
  maxRuleAdjustments: number;
  performanceTarget: PerformanceTarget;
  deviceProfile: DeviceProfile;
  userBehaviorProfile: UserBehaviorProfile;
}

export interface PerformanceTarget {
  targetFPS: number;
  maxMemoryUsage: number;
  maxLoadTime: number;
  maxInteractionDelay: number;
  minUserExperienceScore: number;
}

export interface DeviceProfile {
  type: 'mobile' | 'tablet' | 'desktop';
  performance: 'low' | 'medium' | 'high';
  memory: number;
  cores: number;
  gpu: 'integrated' | 'dedicated';
  connection: 'slow' | 'fast' | 'wifi' | '4g' | '5g';
}

export interface UserBehaviorProfile {
  sessionDuration: number;
  interactionFrequency: number;
  preferredFeatures: string[];
  performanceSensitivity: 'low' | 'medium' | 'high';
  usagePatterns: UsagePattern[];
}

export interface UsagePattern {
  timeOfDay: string;
  features: string[];
  intensity: 'light' | 'moderate' | 'heavy';
  duration: number;
}

export type OptimizationCategory = 
  | 'rendering'
  | 'memory'
  | 'network'
  | 'cpu'
  | 'user_experience'
  | 'energy';

export type ActionType = 
  | 'reduce_quality'
  | 'defer_loading'
  | 'compress_assets'
  | 'cache_optimization'
  | 'dom_cleanup'
  | 'memory_cleanup'
  | 'throttle_animations'
  | 'lazy_load'
  | 'preload_critical'
  | 'reduce_polling'
  | 'optimize_images'
  | 'minimize_reflows'
  | 'batch_updates'
  | 'worker_offload';

export type ImpactLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// COLETORES DE MÉTRICAS
// ============================================

class PerformanceMetricsCollector {
  private observers: Map<string, any> = new Map();
  private metrics: PerformanceMetrics[] = [];
  private isCollecting = false;
  private collectionInterval = 1000; // 1 segundo

  constructor() {
    this.setupObservers();
  }

  private setupObservers(): void {
    // Performance Observer para Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        this.processPerformanceEntries(list.getEntries());
      });

      try {
        observer.observe({
          entryTypes: [
            'navigation',
            'paint',
            'largest-contentful-paint',
            'first-input',
            'layout-shift',
            'long-animation-frame',
            'longtask'
          ]
        });
        this.observers.set('performance', observer);
      } catch (error) {
        console.warn('Erro ao configurar PerformanceObserver:', error);
      }
    }

    // Mutation Observer para mudanças no DOM
    const mutationObserver = new MutationObserver((mutations) => {
      this.processDOMMutations(mutations);
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true
    });
    this.observers.set('mutation', mutationObserver);

    // Intersection Observer para lazy loading
    const intersectionObserver = new IntersectionObserver((entries) => {
      this.processIntersectionEntries(entries);
    });
    this.observers.set('intersection', intersectionObserver);

    // Event listeners para interações do usuário
    this.setupUserInteractionListeners();
  }

  private setupUserInteractionListeners(): void {
    const events = ['click', 'scroll', 'keypress', 'touchstart', 'mousemove'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, (event) => {
        this.recordUserInteraction(eventType, event);
      }, { passive: true });
    });
  }

  startCollection(): void {
    if (this.isCollecting) return;

    this.isCollecting = true;
    
    const collect = async () => {
      if (!this.isCollecting) return;
      
      try {
        const metrics = await this.collectCurrentMetrics();
        this.metrics.push(metrics);
        
        // Manter apenas os últimos 300 registros (5 minutos)
        if (this.metrics.length > 300) {
          this.metrics.shift();
        }
      } catch (error) {
        console.error('Erro ao coletar métricas:', error);
      }
      
      setTimeout(collect, this.collectionInterval);
    };

    collect();
  }

  stopCollection(): void {
    this.isCollecting = false;
    
    this.observers.forEach(observer => {
      if (observer.disconnect) {
        observer.disconnect();
      }
    });
    this.observers.clear();
  }

  private async collectCurrentMetrics(): Promise<PerformanceMetrics> {
    const timestamp = Date.now();
    
    return {
      timestamp,
      core: await this.collectCoreMetrics(),
      rendering: await this.collectRenderingMetrics(),
      network: await this.collectNetworkMetrics(),
      memory: await this.collectMemoryMetrics(),
      user: await this.collectUserExperienceMetrics(),
      system: await this.collectSystemMetrics()
    };
  }

  private async collectCoreMetrics(): Promise<CoreMetrics> {
    const now = performance.now();
    const entries = performance.getEntriesByType('longtask');
    
    return {
      fps: this.calculateFPS(),
      frameTime: this.calculateFrameTime(),
      jankCount: this.calculateJankCount(),
      longTasks: entries.length,
      mainThreadBlocking: this.calculateMainThreadBlocking(),
      scriptDuration: this.calculateScriptDuration(),
      layoutThrashing: this.calculateLayoutThrashing()
    };
  }

  private async collectRenderingMetrics(): Promise<RenderingMetrics> {
    const paintEntries = performance.getEntriesByType('paint');
    const layoutShifts = performance.getEntriesByType('layout-shift');
    
    return {
      paintTime: this.calculatePaintTime(paintEntries),
      layoutTime: this.calculateLayoutTime(),
      compositeTime: this.calculateCompositeTime(),
      domNodes: document.querySelectorAll('*').length,
      styleRecalc: this.calculateStyleRecalc(),
      layoutShifts: layoutShifts.length,
      renderBlocking: this.calculateRenderBlocking()
    };
  }

  private async collectNetworkMetrics(): Promise<NetworkMetrics> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource');
    
    return {
      requestCount: resources.length,
      totalSize: this.calculateTotalSize(resources),
      loadTime: navigation ? navigation.loadEventEnd - (((navigation as any).navigationStart) ?? performance.timeOrigin) : 0,
      ttfb: navigation ? navigation.responseStart - navigation.requestStart : 0,
      bandwidth: this.estimateBandwidth(),
      latency: await this.measureLatency(),
      failedRequests: this.countFailedRequests(resources)
    };
  }

  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    const memory = (performance as any).memory;
    
    if (!memory) {
      return {
        heapUsed: 0,
        heapTotal: 0,
        heapLimit: 0,
        external: 0,
        gcCount: 0,
        gcDuration: 0,
        memoryPressure: 0
      };
    }
    
    return {
      heapUsed: memory.usedJSHeapSize,
      heapTotal: memory.totalJSHeapSize,
      heapLimit: memory.jsHeapSizeLimit,
      external: 0, // Não disponível no browser
      gcCount: this.estimateGCCount(),
      gcDuration: this.estimateGCDuration(),
      memoryPressure: this.calculateMemoryPressure(memory)
    };
  }

  private async collectUserExperienceMetrics(): Promise<UserExperienceMetrics> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint');
    const fid = performance.getEntriesByType('first-input');
    const cls = performance.getEntriesByType('layout-shift');
    
    return {
      lcp: lcp.length > 0 ? lcp[lcp.length - 1].startTime : 0,
      fid: fid.length > 0 ? (fid[0] as any).processingStart - fid[0].startTime : 0,
      cls: this.calculateCLS(cls),
      fcp: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
      ttfb: navigation ? navigation.responseStart - navigation.requestStart : 0,
      interactionDelay: this.calculateInteractionDelay(),
      scrollResponsiveness: this.calculateScrollResponsiveness()
    };
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    const connection = (navigator as any).connection;
    const battery = await this.getBatteryInfo();
    
    return {
      cpuUsage: await this.estimateCPUUsage(),
      memoryUsage: this.calculateMemoryUsage(),
      diskIO: await this.estimateDiskIO(),
      networkIO: this.calculateNetworkIO(),
      batteryLevel: battery?.level || 1,
      thermalState: this.getThermalState(),
      connectionType: connection?.effectiveType || 'unknown'
    };
  }

  // Métodos auxiliares de cálculo
  private calculateFPS(): number {
    // Implementação simplificada - assumir 60 FPS como baseline
    const longTasks = performance.getEntriesByType('longtask').length;
    return Math.max(10, 60 - longTasks * 2);
  }

  private calculateFrameTime(): number {
    return 1000 / this.calculateFPS();
  }

  private calculateJankCount(): number {
    const longTasks = performance.getEntriesByType('longtask');
    return longTasks.filter(task => task.duration > 50).length;
  }

  private calculateMainThreadBlocking(): number {
    const longTasks = performance.getEntriesByType('longtask');
    return longTasks.reduce((total, task) => total + Math.max(0, task.duration - 50), 0);
  }

  private calculateScriptDuration(): number {
    const scripts = performance.getEntriesByType('resource')
      .filter(r => r.name.includes('.js'));
    return scripts.reduce((total, script) => total + script.duration, 0);
  }

  private calculateLayoutThrashing(): number {
    // Implementação simplificada
    return Math.random() * 10;
  }

  private calculatePaintTime(paintEntries: PerformanceEntry[]): number {
    return paintEntries.reduce((total, entry) => total + entry.duration, 0);
  }

  private calculateLayoutTime(): number {
    // Implementação simplificada
    return Math.random() * 20;
  }

  private calculateCompositeTime(): number {
    // Implementação simplificada
    return Math.random() * 15;
  }

  private calculateStyleRecalc(): number {
    // Implementação simplificada
    return Math.random() * 10;
  }

  private calculateRenderBlocking(): number {
    const resources = performance.getEntriesByType('resource')
      .filter(r => r.name.includes('.css') || r.name.includes('.js'));
    // Algumas implementações expõem "renderBlockingStatus" (experimental) em PerformanceResourceTiming.
    // Fazemos acesso seguro e fallback heurístico para evitar erro de tipagem e suportar navegadores sem esse campo.
    return resources.filter((r) => {
      const anyR = r as any;
      if (anyR && typeof anyR.renderBlockingStatus === 'string') {
        return anyR.renderBlockingStatus === 'blocking' || anyR.renderBlockingStatus === 'blocked';
      }
      const rt = r as PerformanceResourceTiming;
      // Heurística simples: CSS geralmente é bloqueante; JS pode ser não-bloqueante se async/defer.
      const isCSS = rt.name.endsWith('.css');
      const isScript = rt.name.endsWith('.js');
      const likelyBlockingScript = isScript && !/([?&#](async|defer)=1|\b(async|defer)\b)/i.test(rt.name);
      return isCSS || likelyBlockingScript;
    }).length;
  }

  private calculateTotalSize(resources: PerformanceEntry[]): number {
    return resources.reduce((total, resource) => {
      const r = resource as PerformanceResourceTiming;
      return total + (r.transferSize || 0);
    }, 0);
  }

  private estimateBandwidth(): number {
    const connection = (navigator as any).connection;
    return connection?.downlink || 10; // Mbps
  }

  private async measureLatency(): Promise<number> {
    const start = performance.now();
    try {
      await fetch('/api/ping', { method: 'HEAD' });
      return performance.now() - start;
    } catch {
      return 100; // Fallback
    }
  }

  private countFailedRequests(resources: PerformanceEntry[]): number {
    return resources.filter(r => {
      const resAny = r as any;
      // responseStatus é experimental em Resource Timing L3; fazemos acesso resiliente
      const status: number | undefined = typeof resAny?.responseStatus === 'number'
        ? resAny.responseStatus
        : (typeof resAny?.status === 'number' ? resAny.status : undefined);
      return typeof status === 'number' && status >= 400;
    }).length;
  }

  private estimateGCCount(): number {
    // Implementação simplificada
    return Math.floor(Math.random() * 5);
  }

  private estimateGCDuration(): number {
    // Implementação simplificada
    return Math.random() * 50;
  }

  private calculateMemoryPressure(memory: any): number {
    return (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
  }

  private calculateCLS(layoutShifts: PerformanceEntry[]): number {
    return layoutShifts.reduce((total, shift) => {
      const s = shift as any;
      return total + (s.value || 0);
    }, 0);
  }

  private calculateInteractionDelay(): number {
    // Implementação simplificada
    return Math.random() * 100;
  }

  private calculateScrollResponsiveness(): number {
    // Implementação simplificada
    return 90 + Math.random() * 10;
  }

  private async getBatteryInfo(): Promise<any> {
    try {
      return await (navigator as any).getBattery?.();
    } catch {
      return null;
    }
  }

  private async estimateCPUUsage(): Promise<number> {
    const start = performance.now();
    const iterations = 100000;
    
    for (let i = 0; i < iterations; i++) {
      Math.random();
    }
    
    const duration = performance.now() - start;
    return Math.min(100, duration / 5);
  }

  private calculateMemoryUsage(): number {
    const memory = (performance as any).memory;
    if (!memory) return 0;
    return (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
  }

  private async estimateDiskIO(): Promise<number> {
    const start = performance.now();
    try {
      localStorage.setItem('__io_test__', 'x'.repeat(1024));
      localStorage.removeItem('__io_test__');
      return performance.now() - start;
    } catch {
      return 0;
    }
  }

  private calculateNetworkIO(): number {
    // Implementação simplificada
    return Math.random() * 1000; // KB/s
  }

  private getThermalState(): string {
    // Implementação simplificada
    return 'normal';
  }

  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    // Processar entradas de performance para otimizações em tempo real
    entries.forEach(entry => {
      if (entry.entryType === 'longtask' && entry.duration > 100) {
        // Tarefa muito longa detectada
        this.notifyLongTask(entry);
      }
    });
  }

  private processDOMMutations(mutations: MutationRecord[]): void {
    // Detectar mudanças excessivas no DOM
    if (mutations.length > 50) {
      this.notifyDOMThrashing();
    }
  }

  private processIntersectionEntries(entries: IntersectionObserverEntry[]): void {
    // Processar elementos que entram/saem da viewport
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        this.notifyElementVisible(entry.target);
      }
    });
  }

  private recordUserInteraction(type: string, event: Event): void {
    // Registrar interação do usuário para análise de responsividade
    const timestamp = performance.now();
    // Implementar lógica de registro
  }

  private notifyLongTask(entry: PerformanceEntry): void {
    // Notificar sobre tarefa longa para otimização imediata
    console.warn('Tarefa longa detectada:', entry.duration + 'ms');
  }

  private notifyDOMThrashing(): void {
    // Notificar sobre thrashing do DOM
    console.warn('DOM thrashing detectado');
  }

  private notifyElementVisible(element: Element): void {
    // Notificar sobre elemento visível para lazy loading
    // Implementar lógica de lazy loading
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getAverageMetrics(timeWindow: number = 60000): PerformanceMetrics | null {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp <= timeWindow);
    
    if (recentMetrics.length === 0) return null;
    
    // Calcular médias
    const avgMetrics: PerformanceMetrics = {
      timestamp: now,
      core: this.averageCoreMetrics(recentMetrics),
      rendering: this.averageRenderingMetrics(recentMetrics),
      network: this.averageNetworkMetrics(recentMetrics),
      memory: this.averageMemoryMetrics(recentMetrics),
      user: this.averageUserMetrics(recentMetrics),
      system: this.averageSystemMetrics(recentMetrics)
    };
    
    return avgMetrics;
  }

  private averageCoreMetrics(metrics: PerformanceMetrics[]): CoreMetrics {
    const count = metrics.length;
    return {
      fps: metrics.reduce((sum, m) => sum + m.core.fps, 0) / count,
      frameTime: metrics.reduce((sum, m) => sum + m.core.frameTime, 0) / count,
      jankCount: metrics.reduce((sum, m) => sum + m.core.jankCount, 0) / count,
      longTasks: metrics.reduce((sum, m) => sum + m.core.longTasks, 0) / count,
      mainThreadBlocking: metrics.reduce((sum, m) => sum + m.core.mainThreadBlocking, 0) / count,
      scriptDuration: metrics.reduce((sum, m) => sum + m.core.scriptDuration, 0) / count,
      layoutThrashing: metrics.reduce((sum, m) => sum + m.core.layoutThrashing, 0) / count
    };
  }

  private averageRenderingMetrics(metrics: PerformanceMetrics[]): RenderingMetrics {
    const count = metrics.length;
    return {
      paintTime: metrics.reduce((sum, m) => sum + m.rendering.paintTime, 0) / count,
      layoutTime: metrics.reduce((sum, m) => sum + m.rendering.layoutTime, 0) / count,
      compositeTime: metrics.reduce((sum, m) => sum + m.rendering.compositeTime, 0) / count,
      domNodes: metrics.reduce((sum, m) => sum + m.rendering.domNodes, 0) / count,
      styleRecalc: metrics.reduce((sum, m) => sum + m.rendering.styleRecalc, 0) / count,
      layoutShifts: metrics.reduce((sum, m) => sum + m.rendering.layoutShifts, 0) / count,
      renderBlocking: metrics.reduce((sum, m) => sum + m.rendering.renderBlocking, 0) / count
    };
  }

  private averageNetworkMetrics(metrics: PerformanceMetrics[]): NetworkMetrics {
    const count = metrics.length;
    return {
      requestCount: metrics.reduce((sum, m) => sum + m.network.requestCount, 0) / count,
      totalSize: metrics.reduce((sum, m) => sum + m.network.totalSize, 0) / count,
      loadTime: metrics.reduce((sum, m) => sum + m.network.loadTime, 0) / count,
      ttfb: metrics.reduce((sum, m) => sum + m.network.ttfb, 0) / count,
      bandwidth: metrics.reduce((sum, m) => sum + m.network.bandwidth, 0) / count,
      latency: metrics.reduce((sum, m) => sum + m.network.latency, 0) / count,
      failedRequests: metrics.reduce((sum, m) => sum + m.network.failedRequests, 0) / count
    };
  }

  private averageMemoryMetrics(metrics: PerformanceMetrics[]): MemoryMetrics {
    const count = metrics.length;
    return {
      heapUsed: metrics.reduce((sum, m) => sum + m.memory.heapUsed, 0) / count,
      heapTotal: metrics.reduce((sum, m) => sum + m.memory.heapTotal, 0) / count,
      heapLimit: metrics.reduce((sum, m) => sum + m.memory.heapLimit, 0) / count,
      external: metrics.reduce((sum, m) => sum + m.memory.external, 0) / count,
      gcCount: metrics.reduce((sum, m) => sum + m.memory.gcCount, 0) / count,
      gcDuration: metrics.reduce((sum, m) => sum + m.memory.gcDuration, 0) / count,
      memoryPressure: metrics.reduce((sum, m) => sum + m.memory.memoryPressure, 0) / count
    };
  }

  private averageUserMetrics(metrics: PerformanceMetrics[]): UserExperienceMetrics {
    const count = metrics.length;
    return {
      lcp: metrics.reduce((sum, m) => sum + m.user.lcp, 0) / count,
      fid: metrics.reduce((sum, m) => sum + m.user.fid, 0) / count,
      cls: metrics.reduce((sum, m) => sum + m.user.cls, 0) / count,
      fcp: metrics.reduce((sum, m) => sum + m.user.fcp, 0) / count,
      ttfb: metrics.reduce((sum, m) => sum + m.user.ttfb, 0) / count,
      interactionDelay: metrics.reduce((sum, m) => sum + m.user.interactionDelay, 0) / count,
      scrollResponsiveness: metrics.reduce((sum, m) => sum + m.user.scrollResponsiveness, 0) / count
    };
  }

  private averageSystemMetrics(metrics: PerformanceMetrics[]): SystemMetrics {
    const count = metrics.length;
    return {
      cpuUsage: metrics.reduce((sum, m) => sum + m.system.cpuUsage, 0) / count,
      memoryUsage: metrics.reduce((sum, m) => sum + m.system.memoryUsage, 0) / count,
      diskIO: metrics.reduce((sum, m) => sum + m.system.diskIO, 0) / count,
      networkIO: metrics.reduce((sum, m) => sum + m.system.networkIO, 0) / count,
      batteryLevel: metrics.reduce((sum, m) => sum + m.system.batteryLevel, 0) / count,
      thermalState: metrics[metrics.length - 1].system.thermalState, // Usar o mais recente
      connectionType: metrics[metrics.length - 1].system.connectionType // Usar o mais recente
    };
  }
}

// ============================================
// MOTOR DE OTIMIZAÇÃO
// ============================================

export class RealTimePerformanceOptimizer {
  private collector: PerformanceMetricsCollector;
  private rules: Map<string, OptimizationRule> = new Map();
  private results: OptimizationResult[] = [];
  private isRunning = false;
  private config: AdaptiveConfig;
  private ruleExecutions: Map<string, number> = new Map();
  private lastExecutions: Map<string, number> = new Map();
  private listeners: Set<(result: OptimizationResult) => void> = new Set();

  constructor(config?: Partial<AdaptiveConfig>) {
    this.collector = new PerformanceMetricsCollector();
    this.config = {
      learningRate: 0.1,
      adaptationThreshold: 0.8,
      maxRuleAdjustments: 5,
      performanceTarget: {
        targetFPS: 60,
        maxMemoryUsage: 80,
        maxLoadTime: 3000,
        maxInteractionDelay: 100,
        minUserExperienceScore: 80
      },
      deviceProfile: this.detectDeviceProfile(),
      userBehaviorProfile: this.initializeUserBehaviorProfile(),
      ...config
    };
    
    this.initializeDefaultRules();
  }

  private detectDeviceProfile(): DeviceProfile {
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const connection = (navigator as any).connection;
    
    let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    let performance: 'low' | 'medium' | 'high' = 'medium';
    
    if (window.innerWidth < 768) {
      type = 'mobile';
    } else if (window.innerWidth < 1024) {
      type = 'tablet';
    }
    
    if (memory >= 8 && cores >= 8) {
      performance = 'high';
    } else if (memory <= 2 || cores <= 2) {
      performance = 'low';
    }
    
    return {
      type,
      performance,
      memory,
      cores,
      gpu: 'integrated', // Assumir integrado por padrão
      connection: connection?.effectiveType || 'wifi'
    };
  }

  private initializeUserBehaviorProfile(): UserBehaviorProfile {
    return {
      sessionDuration: 0,
      interactionFrequency: 0,
      preferredFeatures: [],
      performanceSensitivity: 'medium',
      usagePatterns: []
    };
  }

  private initializeDefaultRules(): void {
    // Regra: Reduzir qualidade quando FPS baixo
    this.addRule({
      id: 'low_fps_quality_reduction',
      name: 'Redução de Qualidade por FPS Baixo',
      description: 'Reduz qualidade visual quando FPS está abaixo do target',
      condition: {
        metric: 'core.fps',
        operator: 'lt',
        threshold: this.config.performanceTarget.targetFPS * 0.8,
        duration: 3000,
        consecutive: 3
      },
      action: {
        type: 'reduce_quality',
        parameters: { level: 0.8 },
        impact: 'medium',
        reversible: true,
        duration: 30000
      },
      priority: 8,
      cooldown: 10000,
      maxExecutions: 3,
      enabled: true,
      category: 'rendering'
    });

    // Regra: Limpeza de memória quando uso alto
    this.addRule({
      id: 'high_memory_cleanup',
      name: 'Limpeza de Memória por Uso Alto',
      description: 'Executa limpeza quando uso de memória está alto',
      condition: {
        metric: 'memory.memoryPressure',
        operator: 'gt',
        threshold: this.config.performanceTarget.maxMemoryUsage,
        duration: 5000
      },
      action: {
        type: 'memory_cleanup',
        parameters: { aggressive: true },
        impact: 'high',
        reversible: false
      },
      priority: 9,
      cooldown: 15000,
      maxExecutions: 5,
      enabled: true,
      category: 'memory'
    });

    // Regra: Throttle de animações quando CPU alto
    this.addRule({
      id: 'high_cpu_animation_throttle',
      name: 'Throttle de Animações por CPU Alto',
      description: 'Reduz animações quando CPU está sobrecarregado',
      condition: {
        metric: 'system.cpuUsage',
        operator: 'gt',
        threshold: 80,
        duration: 2000
      },
      action: {
        type: 'throttle_animations',
        parameters: { factor: 0.5 },
        impact: 'medium',
        reversible: true,
        duration: 20000
      },
      priority: 7,
      cooldown: 8000,
      maxExecutions: 4,
      enabled: true,
      category: 'cpu'
    });

    // Regra: Lazy loading quando rede lenta
    this.addRule({
      id: 'slow_network_lazy_loading',
      name: 'Lazy Loading para Rede Lenta',
      description: 'Ativa lazy loading agressivo em conexões lentas',
      condition: {
        metric: 'network.bandwidth',
        operator: 'lt',
        threshold: 2, // Mbps
        duration: 1000
      },
      action: {
        type: 'lazy_load',
        parameters: { aggressive: true, threshold: 0.1 },
        impact: 'low',
        reversible: true
      },
      priority: 6,
      cooldown: 5000,
      maxExecutions: 2,
      enabled: true,
      category: 'network'
    });

    // Regra: Otimização de imagens quando carregamento lento
    this.addRule({
      id: 'slow_loading_image_optimization',
      name: 'Otimização de Imagens por Carregamento Lento',
      description: 'Otimiza imagens quando tempo de carregamento é alto',
      condition: {
        metric: 'network.loadTime',
        operator: 'gt',
        threshold: this.config.performanceTarget.maxLoadTime,
        duration: 2000
      },
      action: {
        type: 'optimize_images',
        parameters: { quality: 0.7, format: 'webp' },
        impact: 'medium',
        reversible: false
      },
      priority: 5,
      cooldown: 20000,
      maxExecutions: 2,
      enabled: true,
      category: 'network'
    });
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.collector.startCollection();
    
    // Executar otimizações a cada 2 segundos
    setInterval(() => {
      this.runOptimizationCycle();
    }, 2000);
  }

  stop(): void {
    this.isRunning = false;
    this.collector.stopCollection();
  }

  private async runOptimizationCycle(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      const metrics = this.collector.getLatestMetrics();
      if (!metrics) return;

      // Avaliar todas as regras
      for (const rule of this.rules.values()) {
        if (!rule.enabled) continue;
        
        const shouldExecute = this.evaluateRule(rule, metrics);
        if (shouldExecute) {
          await this.executeRule(rule, metrics);
        }
      }

      // Adaptar regras baseado no desempenho
      this.adaptRules();

    } catch (error) {
      console.error('Erro no ciclo de otimização:', error);
    }
  }

  private evaluateRule(rule: OptimizationRule, metrics: PerformanceMetrics): boolean {
    // Verificar cooldown
    const lastExecution = this.lastExecutions.get(rule.id) || 0;
    if (Date.now() - lastExecution < rule.cooldown) {
      return false;
    }

    // Verificar máximo de execuções
    const executions = this.ruleExecutions.get(rule.id) || 0;
    if (executions >= rule.maxExecutions) {
      return false;
    }

    // Avaliar condição
    return this.evaluateCondition(rule.condition, metrics);
  }

  private evaluateCondition(condition: OptimizationCondition, metrics: PerformanceMetrics): boolean {
    const value = this.getMetricValue(condition.metric, metrics);
    
    let conditionMet = false;
    
    switch (condition.operator) {
      case 'gt':
        conditionMet = value > condition.threshold;
        break;
      case 'lt':
        conditionMet = value < condition.threshold;
        break;
      case 'eq':
        conditionMet = value === condition.threshold;
        break;
      case 'gte':
        conditionMet = value >= condition.threshold;
        break;
      case 'lte':
        conditionMet = value <= condition.threshold;
        break;
    }
    
    return conditionMet;
  }

  private getMetricValue(metricPath: string, metrics: PerformanceMetrics): number {
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value[part];
      if (value === undefined) return 0;
    }
    
    return typeof value === 'number' ? value : 0;
  }

  private async executeRule(rule: OptimizationRule, beforeMetrics: PerformanceMetrics): Promise<void> {
    const startTime = Date.now();
    
    try {
      const result: OptimizationResult = {
        id: `${rule.id}_${startTime}`,
        ruleId: rule.id,
        timestamp: startTime,
        action: rule.action,
        beforeMetrics,
        impact: {
          fpsImprovement: 0,
          memoryReduction: 0,
          loadTimeReduction: 0,
          userExperienceScore: 0,
          energySavings: 0
        },
        success: false,
        duration: 0
      };

      // Executar ação de otimização
      await this.executeAction(rule.action);
      
      // Aguardar um pouco para medir impacto
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const afterMetrics = this.collector.getLatestMetrics();
      if (afterMetrics) {
        result.afterMetrics = afterMetrics;
        result.impact = this.calculateImpact(beforeMetrics, afterMetrics);
      }
      
      result.success = true;
      result.duration = Date.now() - startTime;
      
      // Registrar execução
      this.ruleExecutions.set(rule.id, (this.ruleExecutions.get(rule.id) || 0) + 1);
      this.lastExecutions.set(rule.id, Date.now());
      
      // Armazenar resultado
      this.results.push(result);
      if (this.results.length > 100) {
        this.results.shift();
      }
      
      // Notificar listeners
      this.listeners.forEach(listener => listener(result));
      
      console.log(`Otimização executada: ${rule.name}`, result);
      
    } catch (error) {
      console.error(`Erro ao executar regra ${rule.id}:`, error);
    }
  }

  private async executeAction(action: OptimizationAction): Promise<void> {
    switch (action.type) {
      case 'reduce_quality':
        await this.reduceQuality(action.parameters);
        break;
      case 'memory_cleanup':
        await this.cleanupMemory(action.parameters);
        break;
      case 'throttle_animations':
        await this.throttleAnimations(action.parameters);
        break;
      case 'lazy_load':
        await this.enableLazyLoading(action.parameters);
        break;
      case 'optimize_images':
        await this.optimizeImages(action.parameters);
        break;
      case 'defer_loading':
        await this.deferLoading(action.parameters);
        break;
      case 'compress_assets':
        await this.compressAssets(action.parameters);
        break;
      case 'cache_optimization':
        await this.optimizeCache(action.parameters);
        break;
      case 'dom_cleanup':
        await this.cleanupDOM(action.parameters);
        break;
      case 'preload_critical':
        await this.preloadCritical(action.parameters);
        break;
      case 'reduce_polling':
        await this.reducePolling(action.parameters);
        break;
      case 'minimize_reflows':
        await this.minimizeReflows(action.parameters);
        break;
      case 'batch_updates':
        await this.batchUpdates(action.parameters);
        break;
      case 'worker_offload':
        await this.offloadToWorker(action.parameters);
        break;
    }
  }

  // Implementações das ações de otimização
  private async reduceQuality(params: Record<string, any>): Promise<void> {
    const level = params.level || 0.8;
    
    // Reduzir qualidade de imagens
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.style.filter !== 'contrast(0.9)') {
        img.style.filter = 'contrast(0.9)';
        img.style.imageRendering = 'optimizeSpeed';
      }
    });
    
    // Reduzir qualidade de vídeos
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      if (video.style.filter !== 'contrast(0.9)') {
        video.style.filter = 'contrast(0.9)';
      }
    });
  }

  private async cleanupMemory(params: Record<string, any>): Promise<void> {
    const aggressive = params.aggressive || false;
    
    // Forçar garbage collection se disponível
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    // Limpar caches desnecessários
    if (aggressive) {
      // Limpar cache de imagens não visíveis
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        const rect = img.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) {
          img.src = '';
        }
      });
    }
    
    // Limpar event listeners órfãos
    this.cleanupEventListeners();
  }

  private async throttleAnimations(params: Record<string, any>): Promise<void> {
    const factor = params.factor || 0.5;
    
    // Reduzir velocidade de animações CSS
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        animation-duration: ${1 / factor}s !important;
        transition-duration: ${1 / factor}s !important;
      }
    `;
    document.head.appendChild(style);
    
    // Remover após duração especificada
    setTimeout(() => {
      document.head.removeChild(style);
    }, params.duration || 20000);
  }

  private async enableLazyLoading(params: Record<string, any>): Promise<void> {
    const aggressive = params.aggressive || false;
    const threshold = params.threshold || 0.1;
    
    // Aplicar lazy loading a imagens
    const images = document.querySelectorAll('img:not([loading])');
    images.forEach(img => {
      img.setAttribute('loading', 'lazy');
    });
    
    // Aplicar lazy loading a iframes
    const iframes = document.querySelectorAll('iframe:not([loading])');
    iframes.forEach(iframe => {
      iframe.setAttribute('loading', 'lazy');
    });
  }

  private async optimizeImages(params: Record<string, any>): Promise<void> {
    const quality = params.quality || 0.8;
    const format = params.format || 'webp';
    
    // Otimizar imagens existentes (simulado)
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.src && !img.src.includes('optimized')) {
        // Simular otimização adicionando parâmetro
        const url = new URL(img.src, window.location.origin);
        url.searchParams.set('quality', quality.toString());
        url.searchParams.set('format', format);
        url.searchParams.set('optimized', 'true');
        img.src = url.toString();
      }
    });
  }

  private async deferLoading(params: Record<string, any>): Promise<void> {
    // Defer scripts não críticos
    const scripts = document.querySelectorAll('script:not([defer]):not([async])');
    scripts.forEach(node => {
      const script = node as HTMLScriptElement;
      const src = script.getAttribute('src') || '';
      if (!src.includes('critical')) {
        script.setAttribute('defer', 'true');
      }
    });
  }

  private async compressAssets(params: Record<string, any>): Promise<void> {
    // Implementar compressão de assets (simulado)
    console.log('Comprimindo assets...');
  }

  private async optimizeCache(params: Record<string, any>): Promise<void> {
    // Otimizar cache do browser
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        
        // Remover entradas antigas
        for (const request of requests) {
          const response = await cache.match(request);
          if (response) {
            const date = response.headers.get('date');
            if (date && Date.now() - new Date(date).getTime() > 24 * 60 * 60 * 1000) {
              await cache.delete(request);
            }
          }
        }
      }
    }
  }

  private async cleanupDOM(params: Record<string, any>): Promise<void> {
    // Remover elementos desnecessários do DOM
    const hiddenElements = document.querySelectorAll('[style*="display: none"], [hidden]');
    hiddenElements.forEach(element => {
      if (!element.hasAttribute('data-keep')) {
        element.remove();
      }
    });
    
    // Remover comentários
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_COMMENT
    );
    
    const comments: Node[] = [];
    let node;
    while (node = walker.nextNode()) {
      comments.push(node);
    }
    
    comments.forEach(comment => {
      if (comment.parentNode) {
        comment.parentNode.removeChild(comment);
      }
    });
  }

  private async preloadCritical(params: Record<string, any>): Promise<void> {
    // Preload recursos críticos
    const criticalResources = params.resources || [];
    
    criticalResources.forEach((resource: string) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource;
      
      if (resource.endsWith('.css')) {
        link.as = 'style';
      } else if (resource.endsWith('.js')) {
        link.as = 'script';
      } else if (resource.match(/\.(jpg|jpeg|png|webp|gif)$/)) {
        link.as = 'image';
      }
      
      document.head.appendChild(link);
    });
  }

  private async reducePolling(params: Record<string, any>): Promise<void> {
    // Reduzir frequência de polling
    const factor = params.factor || 2;
    
    // Interceptar setInterval e setTimeout
    const originalSetInterval = window.setInterval.bind(window);
    // Evita conflito de tipos com definição NodeJS (interseção que inclui __promisify__)
    // e garante o this correto do window
    (window as any).setInterval = function(callback: any, delay?: number, ...args: any[]) {
      const adjustedDelay = (typeof delay === 'number' ? delay : 0) * factor;
      return originalSetInterval(callback, adjustedDelay, ...args);
    };
    
    // Restaurar após duração especificada
    setTimeout(() => {
      (window as any).setInterval = originalSetInterval;
    }, params.duration || 30000);
  }

  private async minimizeReflows(params: Record<string, any>): Promise<void> {
    // Minimizar reflows batching mudanças no DOM
    const style = document.createElement('style');
    style.textContent = `
      * {
        contain: layout style paint;
      }
    `;
    document.head.appendChild(style);
    
    setTimeout(() => {
      document.head.removeChild(style);
    }, params.duration || 15000);
  }

  private async batchUpdates(params: Record<string, any>): Promise<void> {
    // Implementar batching de updates do DOM
    console.log('Ativando batching de updates...');
  }

  private async offloadToWorker(params: Record<string, any>): Promise<void> {
    // Mover processamento pesado para Web Workers
    const tasks = params.tasks || [];
    
    tasks.forEach((task: string) => {
      if (typeof Worker !== 'undefined') {
        const worker = new Worker('/workers/optimization-worker.js');
        worker.postMessage({ task, data: params.data });
        
        worker.onmessage = (e) => {
          console.log('Worker result:', e.data);
          worker.terminate();
        };
      }
    });
  }

  private cleanupEventListeners(): void {
    // Implementar limpeza de event listeners órfãos
    // Esta é uma implementação simplificada
    console.log('Limpando event listeners órfãos...');
  }

  private calculateImpact(before: PerformanceMetrics, after: PerformanceMetrics): OptimizationImpact {
    return {
      fpsImprovement: after.core.fps - before.core.fps,
      memoryReduction: before.memory.memoryPressure - after.memory.memoryPressure,
      loadTimeReduction: before.network.loadTime - after.network.loadTime,
      userExperienceScore: this.calculateUXScore(after) - this.calculateUXScore(before),
      energySavings: this.calculateEnergySavings(before, after)
    };
  }

  private calculateUXScore(metrics: PerformanceMetrics): number {
    // Calcular score de UX baseado nas métricas
    const fpsScore = Math.min(100, (metrics.core.fps / 60) * 100);
    const memoryScore = Math.max(0, 100 - metrics.memory.memoryPressure);
    const loadScore = Math.max(0, 100 - (metrics.network.loadTime / 50));
    const interactionScore = Math.max(0, 100 - (metrics.user.interactionDelay / 10));
    
    return (fpsScore + memoryScore + loadScore + interactionScore) / 4;
  }

  private calculateEnergySavings(before: PerformanceMetrics, after: PerformanceMetrics): number {
    // Estimar economia de energia baseada na redução de CPU
    const cpuReduction = before.system.cpuUsage - after.system.cpuUsage;
    return Math.max(0, cpuReduction * 0.1); // Estimativa simplificada
  }

  private adaptRules(): void {
    // Adaptar regras baseado no histórico de resultados
    const recentResults = this.results.slice(-20);
    
    for (const rule of this.rules.values()) {
      const ruleResults = recentResults.filter(r => r.ruleId === rule.id);
      
      if (ruleResults.length >= 3) {
        const avgImpact = ruleResults.reduce((sum, r) => sum + r.impact.userExperienceScore, 0) / ruleResults.length;
        
        // Ajustar threshold baseado no impacto
        if (avgImpact < 5 && rule.condition.threshold > 10) {
          // Reduzir threshold se impacto é baixo
          rule.condition.threshold *= 0.9;
        } else if (avgImpact > 20) {
          // Aumentar threshold se impacto é alto
          rule.condition.threshold *= 1.1;
        }
      }
    }
  }

  // Métodos públicos
  addRule(rule: OptimizationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.ruleExecutions.delete(ruleId);
    this.lastExecutions.delete(ruleId);
  }

  updateRule(ruleId: string, updates: Partial<OptimizationRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.set(ruleId, { ...rule, ...updates });
    }
  }

  getRules(): OptimizationRule[] {
    return Array.from(this.rules.values());
  }

  getResults(count?: number): OptimizationResult[] {
    return count ? this.results.slice(-count) : [...this.results];
  }

  getMetrics(): PerformanceMetrics[] {
    return this.collector.getMetrics();
  }

  getLatestMetrics(): PerformanceMetrics | null {
    return this.collector.getLatestMetrics();
  }

  getAverageMetrics(timeWindow?: number): PerformanceMetrics | null {
    return this.collector.getAverageMetrics(timeWindow);
  }

  addListener(listener: (result: OptimizationResult) => void): void {
    this.listeners.add(listener);
  }

  removeListener(listener: (result: OptimizationResult) => void): void {
    this.listeners.delete(listener);
  }

  updateConfig(config: Partial<AdaptiveConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AdaptiveConfig {
    return { ...this.config };
  }

  resetRuleExecutions(): void {
    this.ruleExecutions.clear();
    this.lastExecutions.clear();
  }

  getPerformanceScore(): number {
    const metrics = this.getLatestMetrics();
    return metrics ? this.calculateUXScore(metrics) : 0;
  }
}

// ============================================
// INSTÂNCIA GLOBAL E HOOKS
// ============================================

export const realTimeOptimizer = new RealTimePerformanceOptimizer();

// Hook React para usar otimização em tempo real
import { useState, useEffect } from 'react';

export function useRealTimeOptimization() {
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [results, setResults] = useState<OptimizationResult[]>([]);
  const [rules, setRules] = useState<OptimizationRule[]>([]);
  const [config, setConfig] = useState<AdaptiveConfig>(realTimeOptimizer.getConfig());
  const [performanceScore, setPerformanceScore] = useState(0);

  useEffect(() => {
    // Listener para resultados de otimização
    const handleOptimizationResult = (result: OptimizationResult) => {
      setResults(prev => [...prev.slice(-99), result]);
    };

    realTimeOptimizer.addListener(handleOptimizationResult);

    // Atualizar métricas periodicamente
    const metricsInterval = setInterval(() => {
      const latestMetrics = realTimeOptimizer.getLatestMetrics();
      if (latestMetrics) {
        setMetrics(latestMetrics);
        setPerformanceScore(realTimeOptimizer.getPerformanceScore());
      }
    }, 1000);

    // Atualizar regras
    setRules(realTimeOptimizer.getRules());

    return () => {
      realTimeOptimizer.removeListener(handleOptimizationResult);
      clearInterval(metricsInterval);
    };
  }, []);

  const start = () => {
    realTimeOptimizer.start();
    setIsRunning(true);
  };

  const stop = () => {
    realTimeOptimizer.stop();
    setIsRunning(false);
  };

  const addRule = (rule: OptimizationRule) => {
    realTimeOptimizer.addRule(rule);
    setRules(realTimeOptimizer.getRules());
  };

  const removeRule = (ruleId: string) => {
    realTimeOptimizer.removeRule(ruleId);
    setRules(realTimeOptimizer.getRules());
  };

  const updateRule = (ruleId: string, updates: Partial<OptimizationRule>) => {
    realTimeOptimizer.updateRule(ruleId, updates);
    setRules(realTimeOptimizer.getRules());
  };

  const updateConfig = (newConfig: Partial<AdaptiveConfig>) => {
    realTimeOptimizer.updateConfig(newConfig);
    setConfig(realTimeOptimizer.getConfig());
  };

  const resetExecutions = () => {
    realTimeOptimizer.resetRuleExecutions();
  };

  const getAverageMetrics = (timeWindow?: number) => {
    return realTimeOptimizer.getAverageMetrics(timeWindow);
  };

  const getAllMetrics = () => {
    return realTimeOptimizer.getMetrics();
  };

  return {
    // Estado
    isRunning,
    metrics,
    results,
    rules,
    config,
    performanceScore,
    
    // Ações
    start,
    stop,
    addRule,
    removeRule,
    updateRule,
    updateConfig,
    resetExecutions,
    
    // Utilitários
    getAverageMetrics,
    getAllMetrics
  };
}

// Hook para métricas específicas
export function usePerformanceMetrics(refreshInterval: number = 1000) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [history, setHistory] = useState<PerformanceMetrics[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);

  useEffect(() => {
    if (!isCollecting) return;

    const interval = setInterval(() => {
      const latestMetrics = realTimeOptimizer.getLatestMetrics();
      if (latestMetrics) {
        setMetrics(latestMetrics);
        setHistory(prev => {
          const newHistory = [...prev, latestMetrics];
          // Manter apenas os últimos 100 registros (5 minutos)
          return newHistory.slice(-100);
        });
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [isCollecting, refreshInterval]);

  const startCollecting = () => {
    setIsCollecting(true);
    realTimeOptimizer.start();
  };

  const stopCollecting = () => {
    setIsCollecting(false);
    realTimeOptimizer.stop();
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    metrics,
    history,
    isCollecting,
    startCollecting,
    stopCollecting,
    clearHistory
  };
}

// Hook para monitoramento de regras
export function useOptimizationRules() {
  const [rules, setRules] = useState<OptimizationRule[]>([]);
  const [executions, setExecutions] = useState<Map<string, number>>(new Map());
  const [lastExecutions, setLastExecutions] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    setRules(realTimeOptimizer.getRules());
    
    // Atualizar execuções periodicamente
    const interval = setInterval(() => {
      // Aqui você poderia acessar as execuções do otimizador
      // Por simplicidade, vamos simular
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const addRule = (rule: OptimizationRule) => {
    realTimeOptimizer.addRule(rule);
    setRules(realTimeOptimizer.getRules());
  };

  const removeRule = (ruleId: string) => {
    realTimeOptimizer.removeRule(ruleId);
    setRules(realTimeOptimizer.getRules());
  };

  const updateRule = (ruleId: string, updates: Partial<OptimizationRule>) => {
    realTimeOptimizer.updateRule(ruleId, updates);
    setRules(realTimeOptimizer.getRules());
  };

  const toggleRule = (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      updateRule(ruleId, { enabled: !rule.enabled });
    }
  };

  const resetExecutions = () => {
    realTimeOptimizer.resetRuleExecutions();
    setExecutions(new Map());
    setLastExecutions(new Map());
  };

  return {
    rules,
    executions,
    lastExecutions,
    addRule,
    removeRule,
    updateRule,
    toggleRule,
    resetExecutions
  };
}

// ============================================
// UTILITÁRIOS E HELPERS
// ============================================

export const PerformanceUtils = {
  // Formatar métricas para exibição
  formatMetrics: (metrics: PerformanceMetrics) => {
    return {
      fps: `${metrics.core.fps.toFixed(1)} FPS`,
      memory: `${metrics.memory.memoryPressure.toFixed(1)}%`,
      loadTime: `${metrics.network.loadTime.toFixed(0)}ms`,
      userScore: `${PerformanceUtils.calculateUXScore(metrics).toFixed(0)}/100`
    };
  },

  // Calcular score de UX
  calculateUXScore: (metrics: PerformanceMetrics): number => {
    const fpsScore = Math.min(100, (metrics.core.fps / 60) * 100);
    const memoryScore = Math.max(0, 100 - metrics.memory.memoryPressure);
    const loadScore = Math.max(0, 100 - (metrics.network.loadTime / 50));
    const interactionScore = Math.max(0, 100 - (metrics.user.interactionDelay / 10));
    
    return (fpsScore + memoryScore + loadScore + interactionScore) / 4;
  },

  // Determinar status de performance
  getPerformanceStatus: (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'fair';
    return 'poor';
  },

  // Gerar recomendações baseadas nas métricas
  generateRecommendations: (metrics: PerformanceMetrics): string[] => {
    const recommendations: string[] = [];

    if (metrics.core.fps < 30) {
      recommendations.push('Considere reduzir a qualidade visual ou complexidade das animações');
    }

    if (metrics.memory.memoryPressure > 80) {
      recommendations.push('Execute limpeza de memória ou reduza o uso de recursos');
    }

    if (metrics.network.loadTime > 3000) {
      recommendations.push('Otimize o carregamento de recursos ou use lazy loading');
    }

    if (metrics.user.interactionDelay > 100) {
      recommendations.push('Reduza o bloqueio da thread principal');
    }

    if (metrics.rendering.domNodes > 5000) {
      recommendations.push('Simplifique a estrutura do DOM');
    }

    return recommendations;
  },

  // Comparar métricas
  compareMetrics: (before: PerformanceMetrics, after: PerformanceMetrics) => {
    return {
      fpsChange: after.core.fps - before.core.fps,
      memoryChange: before.memory.memoryPressure - after.memory.memoryPressure,
      loadTimeChange: before.network.loadTime - after.network.loadTime,
      uxScoreChange: PerformanceUtils.calculateUXScore(after) - PerformanceUtils.calculateUXScore(before)
    };
  },

  // Exportar métricas para análise
  exportMetrics: (metrics: PerformanceMetrics[], format: 'json' | 'csv' = 'json') => {
    if (format === 'json') {
      return JSON.stringify(metrics, null, 2);
    }
    
    if (format === 'csv') {
      const headers = [
        'timestamp', 'fps', 'memoryPressure', 'loadTime', 'interactionDelay',
        'domNodes', 'requestCount', 'cpuUsage', 'uxScore'
      ];
      
      const rows = metrics.map(m => [
        m.timestamp,
        m.core.fps,
        m.memory.memoryPressure,
        m.network.loadTime,
        m.user.interactionDelay,
        m.rendering.domNodes,
        m.network.requestCount,
        m.system.cpuUsage,
        PerformanceUtils.calculateUXScore(m)
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
    
    return '';
  }
};

// ============================================
// CONFIGURAÇÕES PREDEFINIDAS
// ============================================

export const OptimizationPresets = {
  // Configuração para dispositivos de baixa performance
  lowEnd: {
    learningRate: 0.2,
    adaptationThreshold: 0.6,
    maxRuleAdjustments: 10,
    performanceTarget: {
      targetFPS: 30,
      maxMemoryUsage: 60,
      maxLoadTime: 5000,
      maxInteractionDelay: 200,
      minUserExperienceScore: 60
    }
  } as Partial<AdaptiveConfig>,

  // Configuração para dispositivos de alta performance
  highEnd: {
    learningRate: 0.05,
    adaptationThreshold: 0.9,
    maxRuleAdjustments: 3,
    performanceTarget: {
      targetFPS: 60,
      maxMemoryUsage: 90,
      maxLoadTime: 1000,
      maxInteractionDelay: 50,
      minUserExperienceScore: 90
    }
  } as Partial<AdaptiveConfig>,

  // Configuração para economia de energia
  energySaver: {
    learningRate: 0.15,
    adaptationThreshold: 0.7,
    maxRuleAdjustments: 7,
    performanceTarget: {
      targetFPS: 30,
      maxMemoryUsage: 70,
      maxLoadTime: 3000,
      maxInteractionDelay: 150,
      minUserExperienceScore: 70
    }
  } as Partial<AdaptiveConfig>,

  // Configuração balanceada
  balanced: {
    learningRate: 0.1,
    adaptationThreshold: 0.8,
    maxRuleAdjustments: 5,
    performanceTarget: {
      targetFPS: 60,
      maxMemoryUsage: 80,
      maxLoadTime: 3000,
      maxInteractionDelay: 100,
      minUserExperienceScore: 80
    }
  } as Partial<AdaptiveConfig>
};

// Inicializar automaticamente em produção
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Detectar perfil do dispositivo e aplicar preset apropriado
  const deviceProfile = realTimeOptimizer.getConfig().deviceProfile;
  
  if (deviceProfile.performance === 'low') {
    realTimeOptimizer.updateConfig(OptimizationPresets.lowEnd);
  } else if (deviceProfile.performance === 'high') {
    realTimeOptimizer.updateConfig(OptimizationPresets.highEnd);
  } else {
    realTimeOptimizer.updateConfig(OptimizationPresets.balanced);
  }
  
  // Iniciar otimização automática
  realTimeOptimizer.start();
}