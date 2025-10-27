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
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(() => {
        this.updateContext();
      });
      
      observer.observe(document.body);
      this.observers.set('viewport', observer);
    }
  }

  // Gerar ID de sessão
  private generateSessionId(): string {
    return 'ux_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Obter contexto atual
  private getContext(): UXContext {
    if (typeof window === 'undefined') {
      return {
        page: '',
        userAgent: '',
        viewport: { width: 0, height: 0 },
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

  // Atualizar contexto
  private updateContext(): void {
    this.context = this.getContext();
  }

  // Determinar tipo de dispositivo
  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';
    
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  // Obter tipo de conexão
  private getConnectionType(): string | undefined {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      return connection?.effectiveType || connection?.type;
    }
    return undefined;
  }

  // Coletar métrica de performance
  private collectPerformanceMetric(entry: PerformanceEntry): void {
    let metricType: UXMetricType;
    let value: number;

    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        metricType = 'page_load_time';
        value = navEntry.loadEventEnd - (navEntry.fetchStart || 0);
        break;
      case 'paint':
        if (entry.name === 'first-contentful-paint') {
          metricType = 'page_load_time';
          value = entry.startTime;
        } else {
          return;
        }
        break;
      case 'largest-contentful-paint':
        metricType = 'page_load_time';
        value = entry.startTime;
        break;
      default:
        return;
    }

    this.addMetric(metricType, value, {
      entryType: entry.entryType,
      name: entry.name
    });
  }

  // Registrar interação
  private recordInteraction(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    const interaction: UserInteraction = {
      id: this.generateId(),
      type: event.type as InteractionType,
      element: this.getElementSelector(target),
      timestamp: Date.now(),
      context: { ...this.context }
    };

    // Adicionar coordenadas para eventos de mouse
    if (event instanceof MouseEvent) {
      interaction.coordinates = {
        x: event.clientX,
        y: event.clientY
      };
    }

    this.interactions.push(interaction);
    this.analyzeInteraction(interaction);
  }

  // Registrar erro
  private recordError(event: ErrorEvent): void {
    this.addIssue({
      id: this.generateId(),
      severity: SecuritySeverity.HIGH,
      type: 'javascript_error',
      description: event.message,
      page: this.context.page,
      frequency: 1,
      impact: 8,
      suggestions: [
        'Verificar logs do console',
        'Implementar tratamento de erro',
        'Adicionar fallback para funcionalidade'
      ],
      timestamp: Date.now()
    });
  }

  // Registrar rejeição de promise
  private recordPromiseRejection(event: PromiseRejectionEvent): void {
    this.addIssue({
      id: this.generateId(),
      severity: SecuritySeverity.MEDIUM,
      type: 'promise_rejection',
      description: String(event.reason),
      page: this.context.page,
      frequency: 1,
      impact: 6,
      suggestions: [
        'Adicionar .catch() às promises',
        'Implementar tratamento de erro assíncrono',
        'Verificar chamadas de API'
      ],
      timestamp: Date.now()
    });
  }

  // Verificar acessibilidade
  private checkAccessibility(): void {
    if (typeof document === 'undefined') return;

    // Verificar imagens sem alt text
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      this.addIssue({
        id: this.generateId(),
        severity: SecuritySeverity.MEDIUM,
        type: 'accessibility',
        description: `${imagesWithoutAlt.length} imagens sem texto alternativo`,
        page: this.context.page,
        frequency: imagesWithoutAlt.length,
        impact: 5,
        suggestions: [
          'Adicionar atributo alt às imagens',
          'Usar texto descritivo para imagens informativas',
          'Usar alt="" para imagens decorativas'
        ],
        timestamp: Date.now()
      });
    }

    // Verificar contraste de cores (simplificado)
    this.checkColorContrast();
  }

  // Verificar contraste de cores
  private checkColorContrast(): void {
    // Implementação simplificada - em produção usaria uma biblioteca especializada
    const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button');
    let lowContrastCount = 0;

    textElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Verificação simplificada - em produção seria mais robusta
      if (this.hasLowContrast(color, backgroundColor)) {
        lowContrastCount++;
      }
    });

    if (lowContrastCount > 0) {
      this.addIssue({
        id: this.generateId(),
        severity: SecuritySeverity.LOW,
        type: 'accessibility',
        description: `${lowContrastCount} elementos com possível baixo contraste`,
        page: this.context.page,
        frequency: lowContrastCount,
        impact: 3,
        suggestions: [
          'Verificar contraste de cores com ferramentas especializadas',
          'Usar cores que atendam às diretrizes WCAG',
          'Testar com usuários com deficiência visual'
        ],
        timestamp: Date.now()
      });
    }
  }

  // Verificar se há baixo contraste (implementação simplificada)
  private hasLowContrast(color: string, backgroundColor: string): boolean {
    // Implementação muito simplificada - apenas para demonstração
    return color === backgroundColor || 
           (color.includes('rgb(128') && backgroundColor.includes('rgb(128'));
  }

  // Obter seletor do elemento
  private getElementSelector(element: HTMLElement): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      return `.${element.className.split(' ')[0]}`;
    }
    
    return element.tagName.toLowerCase();
  }

  // Gerar ID único
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Adicionar métrica
  public addMetric(type: UXMetricType, value: number, metadata?: Record<string, any>): void {
    const metric: UXMetric = {
      id: this.generateId(),
      type,
      value,
      timestamp: Date.now(),
      context: { ...this.context },
      metadata
    };

    this.metrics.push(metric);
    this.analyzeMetric(metric);
  }

  // Adicionar issue
  public addIssue(issue: UXIssue): void {
    // Verificar se já existe issue similar
    const existingIssue = this.issues.find(i => 
      i.type === issue.type && 
      i.description === issue.description && 
      i.page === issue.page
    );

    if (existingIssue) {
      existingIssue.frequency++;
      existingIssue.timestamp = Date.now();
    } else {
      this.issues.push(issue);
    }
  }

  // Analisar métrica
  private analyzeMetric(metric: UXMetric): void {
    // Detectar problemas baseados em métricas
    switch (metric.type) {
      case 'page_load_time':
        if (metric.value > 3000) { // > 3 segundos
          this.addIssue({
            id: this.generateId(),
            severity: SecuritySeverity.MEDIUM,
            type: 'performance',
            description: 'Tempo de carregamento lento',
            page: metric.context.page,
            frequency: 1,
            impact: 7,
            suggestions: [
              'Otimizar imagens e recursos',
              'Implementar lazy loading',
              'Reduzir tamanho do bundle JavaScript'
            ],
            timestamp: Date.now()
          });
        }
        break;
      
      case 'click_delay':
        if (metric.value > 300) { // > 300ms
          this.addIssue({
            id: this.generateId(),
            severity: SecuritySeverity.LOW,
            type: 'responsiveness',
            description: 'Resposta lenta ao clique',
            page: metric.context.page,
            frequency: 1,
            impact: 4,
            suggestions: [
              'Otimizar event handlers',
              'Reduzir processamento no thread principal',
              'Implementar debouncing quando apropriado'
            ],
            timestamp: Date.now()
          });
        }
        break;
    }
  }

  // Analisar interação
  private analyzeInteraction(interaction: UserInteraction): void {
    // Detectar padrões problemáticos
    const recentInteractions = this.interactions
      .filter(i => Date.now() - i.timestamp < 10000) // Últimos 10 segundos
      .filter(i => i.type === interaction.type && i.element === interaction.element);

    // Detectar cliques repetitivos (possível frustração)
    if (interaction.type === 'click' && recentInteractions.length > 3) {
      this.addIssue({
        id: this.generateId(),
        severity: SecuritySeverity.MEDIUM,
        type: 'usability',
        description: 'Cliques repetitivos detectados',
        element: interaction.element,
        page: interaction.context.page,
        frequency: recentInteractions.length,
        impact: 6,
        suggestions: [
          'Verificar se o elemento está funcionando corretamente',
          'Adicionar feedback visual ao clique',
          'Implementar loading states'
        ],
        timestamp: Date.now()
      });
    }
  }

  // Gerar relatório
  public generateReport(): UXReport {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    const recentMetrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    const recentInteractions = this.interactions.filter(i => i.timestamp > oneHourAgo);
    const recentIssues = this.issues.filter(i => i.timestamp > oneHourAgo);

    return {
      period: { start: oneHourAgo, end: now },
      metrics: recentMetrics,
      interactions: recentInteractions,
      issues: recentIssues,
      insights: this.generateInsights(recentMetrics, recentInteractions, recentIssues),
      recommendations: this.generateRecommendations(recentIssues, recentMetrics)
    };
  }

  // Gerar insights
  private generateInsights(metrics: UXMetric[], interactions: UserInteraction[], issues: UXIssue[]): UXInsight[] {
    const insights: UXInsight[] = [];

    // Insight sobre performance
    const loadTimes = metrics.filter(m => m.type === 'page_load_time');
    if (loadTimes.length > 0) {
      const avgLoadTime = loadTimes.reduce((sum, m) => sum + m.value, 0) / loadTimes.length;
      insights.push({
        type: 'performance',
        description: `Tempo médio de carregamento: ${Math.round(avgLoadTime)}ms`,
        impact: avgLoadTime > 3000 ? 'negative' : avgLoadTime < 1000 ? 'positive' : 'neutral',
        confidence: 0.8,
        data: { avgLoadTime, sampleSize: loadTimes.length }
      });
    }

    // Insight sobre interações
    const clickInteractions = interactions.filter(i => i.type === 'click');
    if (clickInteractions.length > 0) {
      insights.push({
        type: 'engagement',
        description: `${clickInteractions.length} cliques registrados`,
        impact: clickInteractions.length > 50 ? 'positive' : 'neutral',
        confidence: 0.7,
        data: { clickCount: clickInteractions.length }
      });
    }

    // Insight sobre issues
    const criticalIssues = issues.filter(i => i.severity === SecuritySeverity.CRITICAL || i.severity === SecuritySeverity.HIGH);
    if (criticalIssues.length > 0) {
      insights.push({
        type: 'issues',
        description: `${criticalIssues.length} problemas críticos detectados`,
        impact: 'negative',
        confidence: 0.9,
        data: { criticalIssueCount: criticalIssues.length }
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
        description: highSeverityIssues.length + ' erros de alta severidade detectados',
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


