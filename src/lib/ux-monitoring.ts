/**
 * Sistema de Monitoramento de UX
 * 
 * Monitora experiência do usuário em tempo real,
 * coleta métricas de usabilidade e identifica pontos de melhoria.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { SecuritySeverity } from './security-monitoring';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface UXMetric {
  id: string;
  type: UXMetricType;
  value: number;
  timestamp: number;
  context: UXContext;
  metadata?: Record<string, any>;
}

type UXMetricType = 
  | 'click_delay'
  | 'form_completion_time'
  | 'page_load_time'
  | 'scroll_depth'
  | 'error_rate'
  | 'bounce_rate'
  | 'task_completion_rate'
  | 'user_satisfaction'
  | 'accessibility_score'
  | 'mobile_usability';

interface UXContext {
  page: string;
  component?: string;
  userAgent: string;
  viewport: { width: number; height: number };
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType?: string;
  userId?: string;
  sessionId: string;
}

interface UserInteraction {
  id: string;
  type: InteractionType;
  element: string;
  timestamp: number;
  duration?: number;
  coordinates?: { x: number; y: number };
  context: UXContext;
}

type InteractionType = 
  | 'click'
  | 'hover'
  | 'scroll'
  | 'focus'
  | 'blur'
  | 'input'
  | 'submit'
  | 'error'
  | 'navigation';

interface UXIssue {
  id: string;
  severity: SecuritySeverity;
  type: string;
  description: string;
  element?: string;
  page: string;
  frequency: number;
  impact: number;
  suggestions: string[];
  timestamp: number;
}

interface UXReport {
  period: { start: number; end: number };
  metrics: UXMetric[];
  interactions: UserInteraction[];
  issues: UXIssue[];
  insights: UXInsight[];
  recommendations: UXRecommendation[];
}

interface UXInsight {
  type: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
  data: any;
}

interface UXRecommendation {
  priority: SecuritySeverity;
  category: string;
  title: string;
  description: string;
  implementation: string;
  expectedImpact: string;
}

// ============================================
// COLETOR DE MÉTRICAS UX
// ============================================

class UXMetricsCollector {
  private metrics: UXMetric[] = [];
  private interactions: UserInteraction[] = [];
  private issues: UXIssue[] = [];
  private sessionId: string;
  private context: UXContext;
  private observers: Map<string, any> = new Map();
  private startTime: number = Date.now();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.context = this.getContext();
    this.initializeObservers();
  }

  // Inicializar observadores
  private initializeObservers(): void {
    if (typeof window === 'undefined') return;

    // Observer de performance
    this.setupPerformanceObserver();
    
    // Observer de interações
    this.setupInteractionObserver();
    
    // Observer de erros
    this.setupErrorObserver();
    
    // Observer de acessibilidade
    this.setupAccessibilityObserver();
    
    // Observer de viewport
    this.setupViewportObserver();
  }

  // Configurar observer de performance
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.collectPerformanceMetric(entry);
        });
      });
      
      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
      this.observers.set('performance', observer);
    }
  }

  // Configurar observer de interações
  private setupInteractionObserver(): void {
    const events = ['click', 'scroll', 'focus', 'blur', 'input', 'submit'];
    
    events.forEach(eventType => {
      const handler = (event: Event) => {
        this.recordInteraction(event);
      };
      
      document.addEventListener(eventType, handler, { passive: true });
      this.observers.set(`interaction-${eventType}`, handler);
    });
  }

  // Configurar observer de erros
  private setupErrorObserver(): void {
    window.addEventListener('error', (event) => {
      this.recordError(event);
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.recordPromiseRejection(event);
    });
  }

  // Configurar observer de acessibilidade
  private setupAccessibilityObserver(): void {
    // Verificar elementos sem alt text
    this.checkAccessibility();
    
    // Observer de mudanças no DOM
    if ('MutationObserver' in window) {
      const observer = new MutationObserver(() => {
        this.checkAccessibility();
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      this.observers.set('accessibility', observer);
    }
  }

  // Configurar observer de viewport
  private setupViewportObserver(): void {
    const handleResize = () => {
      this.context.viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      
      this.recordMetric({
        type: 'mobile_usability',
        value: this.calculateMobileUsability(),
        context: this.context
      });
    };
    
    window.addEventListener('resize', handleResize);
    this.observers.set('viewport', handleResize);
  }

  // Coletar métrica de performance
  private collectPerformanceMetric(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        this.recordMetric({
          type: 'page_load_time',
          value: navEntry.loadEventEnd - (((navEntry as any).navigationStart) ?? performance.timeOrigin),
          context: this.context
        });
        break;
        
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric({
            type: 'page_load_time',
            value: entry.startTime,
            context: this.context,
            metadata: { type: 'fcp' }
          });
        }
        break;
        
      case 'largest-contentful-paint':
        this.recordMetric({
          type: 'page_load_time',
          value: entry.startTime,
          context: this.context,
          metadata: { type: 'lcp' }
        });
        break;
    }
  }

  // Registrar interação
  private recordInteraction(event: Event): void {
    const target = event.target as HTMLElement;
    const elementSelector = this.getElementSelector(target);
    
    const interaction: UserInteraction = {
      id: this.generateId(),
      type: event.type as InteractionType,
      element: elementSelector,
      timestamp: Date.now(),
      context: this.context
    };
    
    // Adicionar coordenadas para cliques
    if (event instanceof MouseEvent) {
      interaction.coordinates = {
        x: event.clientX,
        y: event.clientY
      };
    }
    
    // Medir delay de clique
    if (event.type === 'click') {
      const delay = this.measureClickDelay(target);
      if (delay > 100) { // Delay significativo
        this.recordMetric({
          type: 'click_delay',
          value: delay,
          context: this.context,
          metadata: { element: elementSelector }
        });
      }
    }
    
    this.interactions.push(interaction);
    this.analyzeInteraction(interaction);
  }

  // Registrar erro
  private recordError(event: ErrorEvent): void {
    this.recordIssue({
      severity: SecuritySeverity.HIGH,
      type: 'javascript_error',
      description: `Erro JavaScript: ${event.message}`,
      page: window.location.pathname,
      frequency: 1,
      impact: 8,
      suggestions: [
        'Verificar console do navegador',
        'Implementar tratamento de erro',
        'Adicionar logs de debug'
      ]
    });
  }

  // Registrar rejeição de promise
  private recordPromiseRejection(event: PromiseRejectionEvent): void {
    this.recordIssue({
      severity: SecuritySeverity.MEDIUM,
      type: 'promise_rejection',
      description: `Promise rejeitada: ${event.reason}`,
      page: window.location.pathname,
      frequency: 1,
      impact: 6,
      suggestions: [
        'Adicionar .catch() às promises',
        'Implementar tratamento de erro global',
        'Verificar chamadas de API'
      ]
    });
  }

  // Verificar acessibilidade
  private checkAccessibility(): void {
    const issues: string[] = [];
    
    // Verificar imagens sem alt
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} imagens sem texto alternativo`);
    }
    
    // Verificar botões sem texto
    const buttonsWithoutText = document.querySelectorAll('button:empty:not([aria-label])');
    if (buttonsWithoutText.length > 0) {
      issues.push(`${buttonsWithoutText.length} botões sem texto ou aria-label`);
    }
    
    // Verificar contraste (simplificado)
    const score = this.calculateAccessibilityScore();
    
    this.recordMetric({
      type: 'accessibility_score',
      value: score,
      context: this.context,
      metadata: { issues }
    });
    
    if (score < 80) {
      this.recordIssue({
        severity: SecuritySeverity.MEDIUM,
        type: 'accessibility',
        description: `Score de acessibilidade baixo: ${score}/100`,
        page: window.location.pathname,
        frequency: 1,
        impact: 7,
        suggestions: [
          'Adicionar texto alternativo às imagens',
          'Melhorar contraste de cores',
          'Adicionar labels aos formulários',
          'Implementar navegação por teclado'
        ]
      });
    }
  }

  // Calcular usabilidade mobile
  private calculateMobileUsability(): number {
    const viewport = this.context.viewport;
    let score = 100;
    
    // Penalizar se muito pequeno
    if (viewport.width < 320) score -= 30;
    
    // Verificar elementos muito pequenos para toque
    const smallElements = document.querySelectorAll('button, a, input').length;
    const touchFriendlyElements = document.querySelectorAll('[style*="min-height: 44px"], [style*="min-height: 48px"]').length;
    
    if (smallElements > 0) {
      const ratio = touchFriendlyElements / smallElements;
      score -= (1 - ratio) * 20;
    }
    
    return Math.max(0, score);
  }

  // Calcular score de acessibilidade
  private calculateAccessibilityScore(): number {
    let score = 100;
    
    // Verificações básicas
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])').length;
    const buttonsWithoutText = document.querySelectorAll('button:empty:not([aria-label])').length;
    const inputsWithoutLabel = document.querySelectorAll('input:not([aria-label]):not([placeholder])').length;
    
    score -= imagesWithoutAlt * 5;
    score -= buttonsWithoutText * 10;
    score -= inputsWithoutLabel * 8;
    
    return Math.max(0, score);
  }

  // Medir delay de clique
  private measureClickDelay(element: HTMLElement): number {
    const start = performance.now();
    
    // Simular processamento
    requestAnimationFrame(() => {
      const delay = performance.now() - start;
      return delay;
    });
    
    return 0; // Simplificado para o exemplo
  }

  // Analisar interação
  private analyzeInteraction(interaction: UserInteraction): void {
    // Detectar padrões problemáticos
    if (interaction.type === 'click') {
      const recentClicks = this.interactions
        .filter(i => i.type === 'click' && i.element === interaction.element)
        .filter(i => (Date.now() - i.timestamp) < 5000); // Últimos 5 segundos
      
      if (recentClicks.length > 3) {
        this.recordIssue({
          severity: SecuritySeverity.MEDIUM,
          type: 'multiple_clicks',
          description: 'Usuário clicando múltiplas vezes no mesmo elemento',
          element: interaction.element,
          page: window.location.pathname,
          frequency: recentClicks.length,
          impact: 5,
          suggestions: [
            'Adicionar feedback visual ao clique',
            'Desabilitar botão após clique',
            'Melhorar responsividade da interface'
          ]
        });
      }
    }
  }

  // Registrar métrica
  private recordMetric(data: Omit<UXMetric, 'id' | 'timestamp'>): void {
    const metric: UXMetric = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...data
    };
    
    this.metrics.push(metric);
  }

  // Registrar issue
  private recordIssue(data: Omit<UXIssue, 'id' | 'timestamp'>): void {
    const issue: UXIssue = {
      id: this.generateId(),
      timestamp: Date.now(),
      ...data
    };
    
    this.issues.push(issue);
  }

  // Obter contexto atual
  private getContext(): UXContext {
    if (typeof window === 'undefined') {
      return {
        page: '/',
        userAgent: 'server',
        viewport: { width: 1920, height: 1080 },
        deviceType: 'desktop',
        sessionId: this.sessionId
      };
    }
    
    return {
      page: window.location.pathname,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      deviceType: this.getDeviceType(),
      connectionType: this.getConnectionType(),
      sessionId: this.sessionId
    };
  }

  // Detectar tipo de dispositivo
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // Obter tipo de conexão
  private getConnectionType(): string | undefined {
    const connection = (navigator as any).connection;
    return connection?.effectiveType;
  }

  // Gerar seletor de elemento
  private getElementSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  // Gerar ID único
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  // Gerar ID de sessão
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  // Gerar relatório
  generateReport(period?: { start: number; end: number }): UXReport {
    const now = Date.now();
    const reportPeriod = period || {
      start: this.startTime,
      end: now
    };
    
    const filteredMetrics = this.metrics.filter(
      m => m.timestamp >= reportPeriod.start && m.timestamp <= reportPeriod.end
    );
    
    const filteredInteractions = this.interactions.filter(
      i => i.timestamp >= reportPeriod.start && i.timestamp <= reportPeriod.end
    );
    
    const filteredIssues = this.issues.filter(
      i => i.timestamp >= reportPeriod.start && i.timestamp <= reportPeriod.end
    );
    
    return {
      period: reportPeriod,
      metrics: filteredMetrics,
      interactions: filteredInteractions,
      issues: filteredIssues,
      insights: this.generateInsights(filteredMetrics, filteredInteractions),
      recommendations: this.generateRecommendations(filteredIssues, filteredMetrics)
    };
  }

  // Gerar insights
  private generateInsights(metrics: UXMetric[], interactions: UserInteraction[]): UXInsight[] {
    const insights: UXInsight[] = [];
    
    // Insight sobre tempo de carregamento
    const loadTimes = metrics.filter(m => m.type === 'page_load_time');
    if (loadTimes.length > 0) {
      const avgLoadTime = loadTimes.reduce((sum, m) => sum + m.value, 0) / loadTimes.length;
      
      insights.push({
        type: 'performance',
        description: `Tempo médio de carregamento: ${avgLoadTime.toFixed(0)}ms`,
        impact: avgLoadTime > 3000 ? 'negative' : avgLoadTime < 1000 ? 'positive' : 'neutral',
        confidence: 0.9,
        data: { avgLoadTime, samples: loadTimes.length }
      });
    }
    
    // Insight sobre interações
    const clickInteractions = interactions.filter(i => i.type === 'click');
    if (clickInteractions.length > 0) {
      const uniqueElements = new Set(clickInteractions.map(i => i.element)).size;
      const clicksPerElement = clickInteractions.length / uniqueElements;
      
      insights.push({
        type: 'engagement',
        description: `Média de ${clicksPerElement.toFixed(1)} cliques por elemento`,
        impact: clicksPerElement > 3 ? 'negative' : 'neutral',
        confidence: 0.7,
        data: { totalClicks: clickInteractions.length, uniqueElements }
      });
    }
    
    return insights;
  }

  // Gerar recomendações
  private generateRecommendations(issues: UXIssue[], metrics: UXMetric[]): UXRecommendation[] {
    const recommendations: UXRecommendation[] = [];
    
    // Recomendações baseadas em issues
    const highSeverityIssues = issues.filter(i => i.severity === SecuritySeverity.HIGH || i.severity === SecuritySeverity.CRITICAL);
    if (highSeverityIssues.length > 0) {
      recommendations.push({
        priority: SecuritySeverity.HIGH,
        category: 'Correção de Bugs',
        title: 'Corrigir erros críticos',
        description: `${highSeverityIssues.length} erros de alta severidade detectados`,
        implementation: 'Revisar logs de erro e implementar tratamento adequado',
        expectedImpact: 'Redução significativa na taxa de erro e melhoria na satisfação do usuário'
      });
    }
    
    // Recomendações baseadas em performance
    const slowLoadTimes = metrics.filter(m => m.type === 'page_load_time' && m.value > 3000);
    if (slowLoadTimes.length > 0) {
      recommendations.push({
        priority: SecuritySeverity.MEDIUM,
        category: 'Performance',
        title: 'Otimizar tempo de carregamento',
        description: 'Páginas carregando lentamente detectadas',
        implementation: 'Implementar lazy loading, otimizar imagens e reduzir bundle size',
        expectedImpact: 'Melhoria de 20-30% no tempo de carregamento'
      });
    }
    
    // Recomendações de acessibilidade
    const accessibilityIssues = issues.filter(i => i.type === 'accessibility');
    if (accessibilityIssues.length > 0) {
      recommendations.push({
        priority: SecuritySeverity.MEDIUM,
        category: 'Acessibilidade',
        title: 'Melhorar acessibilidade',
        description: 'Problemas de acessibilidade identificados',
        implementation: 'Adicionar alt text, melhorar contraste e implementar navegação por teclado',
        expectedImpact: 'Melhor experiência para usuários com deficiência e compliance com WCAG'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { 
        [SecuritySeverity.CRITICAL]: 4,
        [SecuritySeverity.HIGH]: 3, 
        [SecuritySeverity.MEDIUM]: 2, 
        [SecuritySeverity.LOW]: 1 
      };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Limpar dados antigos
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    this.interactions = this.interactions.filter(i => i.timestamp > oneHourAgo);
    this.issues = this.issues.filter(i => i.timestamp > oneHourAgo);
  }

  // Destruir observadores
  destroy(): void {
    this.observers.forEach((observer, key) => {
      if (key.startsWith('interaction-')) {
        document.removeEventListener(key.replace('interaction-', ''), observer);
      } else if (observer.disconnect) {
        observer.disconnect();
      }
    });
    
    this.observers.clear();
  }
}

// ============================================
// HOOKS REACT
// ============================================

// Hook para monitoramento UX
export function useUXMonitoring() {
  const [collector] = useState(() => new UXMetricsCollector());
  const [report, setReport] = useState<UXReport | null>(null);
  const [isCollecting, setIsCollecting] = useState(true);
  
  // Gerar relatório periodicamente
  useEffect(() => {
    if (!isCollecting) return;
    
    const interval = setInterval(() => {
      const newReport = collector.generateReport();
      setReport(newReport);
    }, 30000); // A cada 30 segundos
    
    return () => clearInterval(interval);
  }, [collector, isCollecting]);
  
  // Limpeza periódica
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      collector.cleanup();
    }, 300000); // A cada 5 minutos
    
    return () => clearInterval(cleanupInterval);
  }, [collector]);
  
  // Destruir ao desmontar
  useEffect(() => {
    return () => {
      collector.destroy();
    };
  }, [collector]);
  
  const generateReport = useCallback(() => {
    const newReport = collector.generateReport();
    setReport(newReport);
    return newReport;
  }, [collector]);
  
  const startCollecting = useCallback(() => {
    setIsCollecting(true);
  }, []);
  
  const stopCollecting = useCallback(() => {
    setIsCollecting(false);
  }, []);
  
  return {
    report,
    isCollecting,
    generateReport,
    startCollecting,
    stopCollecting
  };
}

// Hook para métricas específicas
export function useUXMetric(metricType: UXMetricType) {
  const [value, setValue] = useState<number | null>(null);
  const [history, setHistory] = useState<UXMetric[]>([]);
  const collectorRef = useRef<UXMetricsCollector | null>(null);
  
  useEffect(() => {
    if (!collectorRef.current) {
      collectorRef.current = new UXMetricsCollector();
    }
    
    const interval = setInterval(() => {
      const report = collectorRef.current!.generateReport();
      const metrics = report.metrics.filter(m => m.type === metricType);
      
      if (metrics.length > 0) {
        const latest = metrics[metrics.length - 1];
        setValue(latest.value);
        setHistory(metrics.slice(-10)); // Últimas 10 medições
      }
    }, 5000);
    
    return () => {
      clearInterval(interval);
      collectorRef.current?.destroy();
    };
  }, [metricType]);
  
  return { value, history };
}

// ============================================
// ============================================
// NOTA: Componentes React foram movidos para:
// src/components/ux/ux-dashboard.tsx
// ============================================

// ============================================
// EXPORTAÇÕES
// ============================================

export {
  UXMetricsCollector
};

export type {
  UXMetric,
  UXMetricType,
  UserInteraction,
  UXIssue,
  UXReport,
  UXInsight,
  UXRecommendation
};

export default UXMetricsCollector;