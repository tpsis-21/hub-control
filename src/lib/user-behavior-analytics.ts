/**
 * Sistema de Análise de Comportamento do Usuário
 * 
 * Coleta e analisa padrões de comportamento para otimização
 * da experiência do usuário e performance da aplicação.
 */

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface UserSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  pageViews: PageView[];
  interactions: UserInteraction[];
  deviceInfo: DeviceInfo;
  browserInfo: BrowserInfo;
  networkInfo: NetworkInfo;
  errors: ErrorEvent[];
  conversions: ConversionEvent[];
  exitIntent?: boolean;
  bounced?: boolean;
}

export interface PageView {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  loadTime: number;
  timeOnPage?: number;
  scrollDepth: number;
  exitPage?: boolean;
  referrer?: string;
  utmParams?: Record<string, string>;
  performanceMetrics: PagePerformanceMetrics;
}

export interface UserInteraction {
  id: string;
  type: InteractionType;
  timestamp: number;
  element: ElementInfo;
  coordinates?: { x: number; y: number };
  value?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface ElementInfo {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  xpath?: string;
  selector?: string;
}

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  touchSupport: boolean;
  platform: string;
  hardwareConcurrency: number;
  memory?: number;
}

export interface BrowserInfo {
  name: string;
  version: string;
  userAgent: string;
  language: string;
  languages: string[];
  timezone: string;
  cookieEnabled: boolean;
  doNotTrack: boolean;
  onlineStatus: boolean;
}

export interface NetworkInfo {
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface ErrorEvent {
  id: string;
  timestamp: number;
  type: 'javascript' | 'network' | 'resource' | 'csp' | 'unhandledrejection';
  message: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  stack?: string;
  url?: string;
  severity: SecuritySeverity;
}

export interface ConversionEvent {
  id: string;
  timestamp: number;
  type: string;
  value?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PagePerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

export interface BehaviorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendations: string[];
  metadata: Record<string, any>;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  userCount: number;
  characteristics: Record<string, any>;
  behaviorPatterns: BehaviorPattern[];
}

export interface SegmentCriteria {
  deviceType?: string[];
  browserType?: string[];
  sessionDuration?: { min?: number; max?: number };
  pageViews?: { min?: number; max?: number };
  bounceRate?: { min?: number; max?: number };
  conversionRate?: { min?: number; max?: number };
  geography?: string[];
  timeOfDay?: number[];
  dayOfWeek?: number[];
}

export interface AnalyticsReport {
  id: string;
  generatedAt: number;
  period: { start: number; end: number };
  totalSessions: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  topPages: PageStats[];
  userSegments: UserSegment[];
  behaviorPatterns: BehaviorPattern[];
  recommendations: OptimizationRecommendation[];
}

export interface PageStats {
  url: string;
  title: string;
  views: number;
  uniqueViews: number;
  averageTimeOnPage: number;
  bounceRate: number;
  exitRate: number;
  conversionRate: number;
}

export interface OptimizationRecommendation {
  id: string;
  type: 'ux' | 'performance' | 'conversion' | 'engagement';
  priority: SecuritySeverity;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  expectedGain: number;
  implementation: string[];
  metrics: string[];
}

export type InteractionType = 
  | 'click'
  | 'dblclick'
  | 'mousedown'
  | 'mouseup'
  | 'mouseover'
  | 'mouseout'
  | 'mousemove'
  | 'scroll'
  | 'keydown'
  | 'keyup'
  | 'input'
  | 'change'
  | 'focus'
  | 'blur'
  | 'submit'
  | 'resize'
  | 'beforeunload'
  | 'visibilitychange';

// ============================================
// COLETORES DE DADOS
// ============================================

class SessionTracker {
  private currentSession: UserSession | null = null;
  private currentPageView: PageView | null = null;
  private sessionTimeout = 30 * 60 * 1000; // 30 minutos
  private lastActivity = Date.now();
  private listeners: Map<string, EventListener> = new Map();
  private performanceObserver?: PerformanceObserver;
  private mutationObserver?: MutationObserver;
  private intersectionObserver?: IntersectionObserver;
  private scrollDepth = 0;
  private maxScrollDepth = 0;

  constructor() {
    this.initializeSession();
    this.setupEventListeners();
    this.setupObservers();
    this.startActivityMonitoring();
  }

  private initializeSession(): void {
    const sessionId = this.generateSessionId();
    
    this.currentSession = {
      id: sessionId,
      startTime: Date.now(),
      pageViews: [],
      interactions: [],
      deviceInfo: this.collectDeviceInfo(),
      browserInfo: this.collectBrowserInfo(),
      networkInfo: this.collectNetworkInfo(),
      errors: [],
      conversions: []
    };

    this.trackPageView();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private collectDeviceInfo(): DeviceInfo {
    const screen = window.screen;
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    };

    return {
      type: this.getDeviceType(),
      screenWidth: screen.width,
      screenHeight: screen.height,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
      pixelRatio: window.devicePixelRatio || 1,
      orientation: viewport.width > viewport.height ? 'landscape' : 'portrait',
      touchSupport: 'ontouchstart' in window,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      memory: (navigator as any).deviceMemory
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private collectBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;
    
    return {
      name: this.getBrowserName(ua),
      version: this.getBrowserVersion(ua),
      userAgent: ua,
      language: navigator.language,
      languages: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack === '1',
      onlineStatus: navigator.onLine
    };
  }

  private getBrowserName(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Unknown';
  }

  private getBrowserVersion(userAgent: string): string {
    const match = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/([\d.]+)/);
    return match ? match[2] : 'Unknown';
  }

  private collectNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection;
    
    if (!connection) return {};
    
    return {
      connectionType: connection.type,
      effectiveType: connection.effectiveType,
      downlink: connection.downlink,
      rtt: connection.rtt,
      saveData: connection.saveData
    };
  }

  private setupEventListeners(): void {
    const events: InteractionType[] = [
      'click', 'dblclick', 'mousedown', 'mouseup',
      'keydown', 'keyup', 'input', 'change',
      'focus', 'blur', 'submit', 'scroll',
      'resize', 'beforeunload', 'visibilitychange'
    ];

    events.forEach(eventType => {
      const listener = (event: Event) => this.handleInteraction(eventType, event);
      this.listeners.set(eventType, listener);
      
      if (eventType === 'beforeunload') {
        window.addEventListener(eventType, listener);
      } else if (eventType === 'resize') {
        window.addEventListener(eventType, listener);
      } else if (eventType === 'visibilitychange') {
        document.addEventListener(eventType, listener);
      } else {
        document.addEventListener(eventType, listener, { passive: true, capture: true });
      }
    });

    // Error tracking
    window.addEventListener('error', (event) => this.handleError(event));
    window.addEventListener('unhandledrejection', (event) => this.handleUnhandledRejection(event));
  }

  private setupObservers(): void {
    // Performance Observer
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.processPerformanceEntry(entry);
        }
      });

      try {
        this.performanceObserver.observe({ 
          entryTypes: ['navigation', 'paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] 
        });
      } catch (error) {
        console.warn('Erro ao configurar PerformanceObserver:', error);
      }
    }

    // Mutation Observer para mudanças no DOM
    if ('MutationObserver' in window) {
      this.mutationObserver = new MutationObserver((mutations) => {
        this.processDOMMutations(mutations);
      });

      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'style']
      });
    }

    // Intersection Observer para elementos visíveis
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        this.processIntersectionEntries(entries);
      }, {
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
      });

      // Observar elementos importantes
      document.querySelectorAll('[data-track-visibility]').forEach(el => {
        this.intersectionObserver?.observe(el);
      });
    }
  }

  private handleInteraction(type: InteractionType, event: Event): void {
    this.updateLastActivity();

    const interaction: UserInteraction = {
      id: this.generateInteractionId(),
      type,
      timestamp: Date.now(),
      element: this.getElementInfo(event.target as Element)
    };

    // Adicionar dados específicos do evento
    if (event instanceof MouseEvent) {
      interaction.coordinates = { x: event.clientX, y: event.clientY };
    }

    if (event instanceof KeyboardEvent) {
      interaction.metadata = {
        key: event.key,
        code: event.code,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey
      };
    }

    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      interaction.value = event.target.value;
    }

    // Tratar eventos especiais
    if (type === 'scroll') {
      this.updateScrollDepth();
      interaction.metadata = {
        scrollY: window.scrollY,
        scrollDepth: this.scrollDepth,
        maxScrollDepth: this.maxScrollDepth
      };
    }

    if (type === 'beforeunload') {
      this.endSession();
    }

    if (type === 'visibilitychange') {
      interaction.metadata = {
        hidden: document.hidden,
        visibilityState: document.visibilityState
      };
      
      if (document.hidden) {
        this.pauseSession();
      } else {
        this.resumeSession();
      }
    }

    this.currentSession?.interactions.push(interaction);
  }

  private generateInteractionId(): string {
    return `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getElementInfo(element: Element | null): ElementInfo {
    if (!element) {
      return { tagName: 'unknown' };
    }

    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id || undefined,
      className: element.className || undefined,
      textContent: element.textContent?.slice(0, 100) || undefined,
      attributes: this.getElementAttributes(element),
      xpath: this.getElementXPath(element),
      selector: this.getElementSelector(element)
    };
  }

  private getElementAttributes(element: Element): Record<string, string> {
    const attributes: Record<string, string> = {};
    const importantAttrs = ['href', 'src', 'alt', 'title', 'data-track', 'role', 'aria-label'];
    
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attributes[attr] = value;
      }
    });
    
    return attributes;
  }

  private getElementXPath(element: Element): string {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    const parts: string[] = [];
    let current: Element | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
      
      parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }

  private getElementSelector(element: Element): string {
    if (element.id) {
      return `#${element.id}`;
    }
    
    const parts: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      if (current.className) {
        selector += '.' + current.className.split(' ').join('.');
      }
      
      parts.unshift(selector);
      current = current.parentElement;
    }
    
    return parts.join(' > ');
  }

  private updateScrollDepth(): void {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    this.scrollDepth = Math.round(((scrollTop + windowHeight) / documentHeight) * 100);
    this.maxScrollDepth = Math.max(this.maxScrollDepth, this.scrollDepth);
    
    if (this.currentPageView) {
      this.currentPageView.scrollDepth = this.maxScrollDepth;
    }
  }

  private handleError(event: globalThis.ErrorEvent): void {
    const error: ErrorEvent = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: 'javascript',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      severity: this.classifyErrorSeverity(event.message)
    };
    
    this.currentSession?.errors.push(error);
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error: ErrorEvent = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      type: 'unhandledrejection',
      message: event.reason?.toString() || 'Unhandled promise rejection',
      severity: SecuritySeverity.HIGH
    };
    
    this.currentSession?.errors.push(error);
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private classifyErrorSeverity(message: string): SecuritySeverity {
    const criticalKeywords = ['security', 'auth', 'payment', 'critical'];
    const highKeywords = ['network', 'api', 'server', 'database'];
    const mediumKeywords = ['validation', 'format', 'parse'];
    
    const lowerMessage = message.toLowerCase();
    
    if (criticalKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return SecuritySeverity.CRITICAL;
    }
    if (highKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return SecuritySeverity.HIGH;
    }
    if (mediumKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return SecuritySeverity.MEDIUM;
    }
    
    return SecuritySeverity.LOW;
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    if (!this.currentPageView) return;
    
    const metrics = this.currentPageView.performanceMetrics;
    
    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming;
        // Alguns navegadores não expõem navigationStart diretamente; usar timeOrigin como fallback
        const navStart = (navEntry as any).navigationStart ?? performance.timeOrigin;
        metrics.navigationStart = navStart;
        metrics.domContentLoaded = navEntry.domContentLoadedEventEnd;
        metrics.loadComplete = navEntry.loadEventEnd;
        break;
        
      case 'paint':
        const paintEntry = entry as PerformancePaintTiming;
        if (paintEntry.name === 'first-paint') {
          metrics.firstPaint = paintEntry.startTime;
        } else if (paintEntry.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = paintEntry.startTime;
        }
        break;
        
      case 'largest-contentful-paint':
        metrics.largestContentfulPaint = entry.startTime;
        break;
        
      case 'first-input':
        metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
        break;
        
      case 'layout-shift':
        if (!(entry as any).hadRecentInput) {
          metrics.cumulativeLayoutShift = (metrics.cumulativeLayoutShift || 0) + (entry as any).value;
        }
        break;
    }
  }

  private processDOMMutations(mutations: MutationRecord[]): void {
    // Analisar mudanças significativas no DOM
    let significantChanges = 0;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        significantChanges += mutation.addedNodes.length + mutation.removedNodes.length;
      }
    });
    
    if (significantChanges > 10) {
      // Registrar como interação de mudança significativa no DOM
      this.currentSession?.interactions.push({
        id: this.generateInteractionId(),
        type: 'scroll', // Usar scroll como proxy para mudanças de layout
        timestamp: Date.now(),
        element: { tagName: 'document' },
        metadata: {
          domMutations: significantChanges,
          type: 'significant_dom_change'
        }
      });
    }
  }

  private processIntersectionEntries(entries: IntersectionObserverEntry[]): void {
    entries.forEach(entry => {
      const element = entry.target;
      const isVisible = entry.isIntersecting;
      
      this.currentSession?.interactions.push({
        id: this.generateInteractionId(),
        type: 'scroll', // Usar scroll como proxy para visibilidade
        timestamp: Date.now(),
        element: this.getElementInfo(element),
        metadata: {
          visible: isVisible,
          intersectionRatio: entry.intersectionRatio,
          type: 'element_visibility'
        }
      });
    });
  }

  private trackPageView(): void {
    if (this.currentPageView) {
      this.endPageView();
    }
    
    const pageViewId = this.generatePageViewId();
    const url = window.location.href;
    const title = document.title;
    
    this.currentPageView = {
      id: pageViewId,
      url,
      title,
      timestamp: Date.now(),
      loadTime: 0, // Será atualizado quando a página carregar
      scrollDepth: 0,
      referrer: document.referrer,
      utmParams: this.extractUTMParams(),
      performanceMetrics: {
        navigationStart: 0,
        domContentLoaded: 0,
        loadComplete: 0
      }
    };
    
    this.currentSession?.pageViews.push(this.currentPageView);
    this.resetScrollTracking();
  }

  private generatePageViewId(): string {
    return `pageview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractUTMParams(): Record<string, string> {
    const params: Record<string, string> = {};
    const urlParams = new URLSearchParams(window.location.search);
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        params[param] = value;
      }
    });
    
    return params;
  }

  private endPageView(): void {
    if (this.currentPageView) {
      this.currentPageView.timeOnPage = Date.now() - this.currentPageView.timestamp;
      this.currentPageView.scrollDepth = this.maxScrollDepth;
    }
  }

  private resetScrollTracking(): void {
    this.scrollDepth = 0;
    this.maxScrollDepth = 0;
  }

  private startActivityMonitoring(): void {
    setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - this.lastActivity;
      
      if (timeSinceLastActivity > this.sessionTimeout) {
        this.endSession();
        this.initializeSession();
      }
    }, 60000); // Verificar a cada minuto
  }

  private updateLastActivity(): void {
    this.lastActivity = Date.now();
  }

  private pauseSession(): void {
    this.endPageView();
  }

  private resumeSession(): void {
    this.trackPageView();
  }

  private endSession(): void {
    if (!this.currentSession) return;
    
    this.endPageView();
    
    this.currentSession.endTime = Date.now();
    this.currentSession.duration = this.currentSession.endTime - this.currentSession.startTime;
    
    // Calcular métricas da sessão
    this.calculateSessionMetrics();
    
    // Salvar sessão
    this.saveSession(this.currentSession);
  }

  private calculateSessionMetrics(): void {
    if (!this.currentSession) return;
    
    const session = this.currentSession;
    
    // Calcular bounce (sessão com apenas uma página e pouco tempo)
    session.bounced = session.pageViews.length === 1 && 
                     (session.duration || 0) < 30000; // Menos de 30 segundos
    
    // Detectar exit intent (baseado em movimentos do mouse)
    const mouseMovements = session.interactions.filter(i => i.type === 'mousemove');
    const lastMovements = mouseMovements.slice(-10);
    
    if (lastMovements.length > 5) {
      const avgY = lastMovements.reduce((sum, m) => sum + (m.coordinates?.y || 0), 0) / lastMovements.length;
      session.exitIntent = avgY < 100; // Mouse próximo ao topo da página
    }
  }

  private saveSession(session: UserSession): void {
    try {
      const sessions = this.getSavedSessions();
      sessions.push(session);
      
      // Manter apenas as últimas 100 sessões
      if (sessions.length > 100) {
        sessions.splice(0, sessions.length - 100);
      }
      
      localStorage.setItem('user_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.warn('Erro ao salvar sessão:', error);
    }
  }

  private getSavedSessions(): UserSession[] {
    try {
      const saved = localStorage.getItem('user_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  // API pública
  getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  getAllSessions(): UserSession[] {
    return this.getSavedSessions();
  }

  trackConversion(type: string, value?: number, metadata?: Record<string, any>): void {
    const conversion: ConversionEvent = {
      id: `conversion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      value,
      metadata
    };
    
    this.currentSession?.conversions.push(conversion);
  }

  destroy(): void {
    this.endSession();
    
    // Remover event listeners
    this.listeners.forEach((listener, eventType) => {
      if (eventType === 'beforeunload' || eventType === 'resize') {
        window.removeEventListener(eventType, listener);
      } else if (eventType === 'visibilitychange') {
        document.removeEventListener(eventType, listener);
      } else {
        document.removeEventListener(eventType, listener);
      }
    });
    
    // Desconectar observers
    this.performanceObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.intersectionObserver?.disconnect();
  }
}

// ============================================
// ANALISADOR DE COMPORTAMENTO
// ============================================

export class BehaviorAnalyzer {
  private sessions: UserSession[] = [];
  
  constructor(sessions: UserSession[] = []) {
    this.sessions = sessions;
  }

  addSessions(newSessions: UserSession[]): void {
    this.sessions.push(...newSessions);
  }

  generateReport(period?: { start: number; end: number }): AnalyticsReport {
    const filteredSessions = period 
      ? this.sessions.filter(s => s.startTime >= period.start && s.startTime <= period.end)
      : this.sessions;

    const report: AnalyticsReport = {
      id: `report_${Date.now()}`,
      generatedAt: Date.now(),
      period: period || { start: 0, end: Date.now() },
      totalSessions: filteredSessions.length,
      uniqueUsers: this.countUniqueUsers(filteredSessions),
      averageSessionDuration: this.calculateAverageSessionDuration(filteredSessions),
      bounceRate: this.calculateBounceRate(filteredSessions),
      conversionRate: this.calculateConversionRate(filteredSessions),
      topPages: this.getTopPages(filteredSessions),
      userSegments: this.identifyUserSegments(filteredSessions),
      behaviorPatterns: this.identifyBehaviorPatterns(filteredSessions),
      recommendations: this.generateRecommendations(filteredSessions)
    };

    return report;
  }

  private countUniqueUsers(sessions: UserSession[]): number {
    const uniqueUsers = new Set(sessions.map(s => s.userId).filter(Boolean));
    return uniqueUsers.size;
  }

  private calculateAverageSessionDuration(sessions: UserSession[]): number {
    const validSessions = sessions.filter(s => s.duration);
    if (validSessions.length === 0) return 0;
    
    const totalDuration = validSessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    return totalDuration / validSessions.length;
  }

  private calculateBounceRate(sessions: UserSession[]): number {
    if (sessions.length === 0) return 0;
    
    const bouncedSessions = sessions.filter(s => s.bounced).length;
    return (bouncedSessions / sessions.length) * 100;
  }

  private calculateConversionRate(sessions: UserSession[]): number {
    if (sessions.length === 0) return 0;
    
    const convertedSessions = sessions.filter(s => s.conversions.length > 0).length;
    return (convertedSessions / sessions.length) * 100;
  }

  private getTopPages(sessions: UserSession[]): PageStats[] {
    const pageStats: Map<string, PageStats> = new Map();
    
    sessions.forEach(session => {
      session.pageViews.forEach(pageView => {
        const key = pageView.url;
        const existing = pageStats.get(key) || {
          url: pageView.url,
          title: pageView.title,
          views: 0,
          uniqueViews: 0,
          averageTimeOnPage: 0,
          bounceRate: 0,
          exitRate: 0,
          conversionRate: 0
        };
        
        existing.views++;
        if (pageView.timeOnPage) {
          existing.averageTimeOnPage = 
            (existing.averageTimeOnPage * (existing.views - 1) + pageView.timeOnPage) / existing.views;
        }
        
        pageStats.set(key, existing);
      });
    });
    
    return Array.from(pageStats.values())
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
  }

  private identifyUserSegments(sessions: UserSession[]): UserSegment[] {
    const segments: UserSegment[] = [];
    
    // Segmento por tipo de dispositivo
    const deviceTypes = ['mobile', 'tablet', 'desktop'];
    deviceTypes.forEach(deviceType => {
      const deviceSessions = sessions.filter(s => s.deviceInfo.type === deviceType);
      if (deviceSessions.length > 0) {
        segments.push({
          id: `device_${deviceType}`,
          name: `Usuários ${deviceType}`,
          description: `Usuários que acessam via ${deviceType}`,
          criteria: { deviceType: [deviceType] },
          userCount: deviceSessions.length,
          characteristics: this.calculateSegmentCharacteristics(deviceSessions),
          behaviorPatterns: this.identifyBehaviorPatterns(deviceSessions)
        });
      }
    });
    
    // Segmento por duração da sessão
    const longSessions = sessions.filter(s => (s.duration || 0) > 300000); // > 5 minutos
    if (longSessions.length > 0) {
      segments.push({
        id: 'long_sessions',
        name: 'Usuários Engajados',
        description: 'Usuários com sessões longas (> 5 minutos)',
        criteria: { sessionDuration: { min: 300000 } },
        userCount: longSessions.length,
        characteristics: this.calculateSegmentCharacteristics(longSessions),
        behaviorPatterns: this.identifyBehaviorPatterns(longSessions)
      });
    }
    
    return segments;
  }

  private calculateSegmentCharacteristics(sessions: UserSession[]): Record<string, any> {
    return {
      averageSessionDuration: this.calculateAverageSessionDuration(sessions),
      averagePageViews: sessions.reduce((sum, s) => sum + s.pageViews.length, 0) / sessions.length,
      bounceRate: this.calculateBounceRate(sessions),
      conversionRate: this.calculateConversionRate(sessions),
      averageInteractions: sessions.reduce((sum, s) => sum + s.interactions.length, 0) / sessions.length
    };
  }

  private identifyBehaviorPatterns(sessions: UserSession[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];
    
    // Padrão: Usuários que saem rapidamente
    const quickExits = sessions.filter(s => s.bounced).length;
    if (quickExits > sessions.length * 0.3) { // > 30% bounce rate
      patterns.push({
        id: 'quick_exit',
        name: 'Saída Rápida',
        description: 'Usuários que saem rapidamente da aplicação',
        frequency: (quickExits / sessions.length) * 100,
        confidence: 85,
        impact: 'negative',
        recommendations: [
          'Melhorar o tempo de carregamento da página',
          'Otimizar o conteúdo above-the-fold',
          'Revisar a experiência de primeira impressão'
        ],
        metadata: { bounceRate: (quickExits / sessions.length) * 100 }
      });
    }
    
    // Padrão: Usuários com muitos erros
    const errorSessions = sessions.filter(s => s.errors.length > 0).length;
    if (errorSessions > sessions.length * 0.1) { // > 10% com erros
      patterns.push({
        id: 'error_prone',
        name: 'Propenso a Erros',
        description: 'Usuários que encontram muitos erros',
        frequency: (errorSessions / sessions.length) * 100,
        confidence: 90,
        impact: 'negative',
        recommendations: [
          'Implementar melhor tratamento de erros',
          'Adicionar validações mais robustas',
          'Melhorar mensagens de erro para o usuário'
        ],
        metadata: { errorRate: (errorSessions / sessions.length) * 100 }
      });
    }
    
    // Padrão: Usuários altamente engajados
    const engagedSessions = sessions.filter(s => 
      (s.duration || 0) > 300000 && s.pageViews.length > 3
    ).length;
    if (engagedSessions > 0) {
      patterns.push({
        id: 'highly_engaged',
        name: 'Altamente Engajado',
        description: 'Usuários com alto engajamento',
        frequency: (engagedSessions / sessions.length) * 100,
        confidence: 95,
        impact: 'positive',
        recommendations: [
          'Identificar o que mantém esses usuários engajados',
          'Replicar essas características em outras páginas',
          'Criar jornadas personalizadas para usuários similares'
        ],
        metadata: { engagementRate: (engagedSessions / sessions.length) * 100 }
      });
    }
    
    return patterns;
  }

  private generateRecommendations(sessions: UserSession[]): OptimizationRecommendation[] {
    const recommendations: OptimizationRecommendation[] = [];
    
    const avgLoadTime = this.calculateAverageLoadTime(sessions);
    if (avgLoadTime > 3000) { // > 3 segundos
      recommendations.push({
        id: 'improve_load_time',
        type: 'performance',
        priority: SecuritySeverity.HIGH,
        title: 'Melhorar Tempo de Carregamento',
        description: 'O tempo médio de carregamento está acima do recomendado',
        impact: 'Reduzir bounce rate e melhorar experiência do usuário',
        effort: 'medium',
        expectedGain: 25,
        implementation: [
          'Otimizar imagens e recursos',
          'Implementar lazy loading',
          'Usar CDN para recursos estáticos',
          'Minificar CSS e JavaScript'
        ],
        metrics: ['page_load_time', 'bounce_rate', 'user_satisfacao']
      });
    }
    
    const bounceRate = this.calculateBounceRate(sessions);
    if (bounceRate > 60) { // > 60%
      recommendations.push({
        id: 'reduce_bounce_rate',
        type: 'ux',
        priority: SecuritySeverity.HIGH,
        title: 'Reduzir Taxa de Rejeição',
        description: 'A taxa de rejeição está muito alta',
        impact: 'Aumentar engajamento e conversões',
        effort: 'high',
        expectedGain: 35,
        implementation: [
          'Melhorar conteúdo da página inicial',
          'Otimizar call-to-actions',
          'Implementar navegação mais intuitiva',
          'Adicionar elementos de confiança'
        ],
        metrics: ['bounce_rate', 'session_duration', 'page_views_per_session']
      });
    }
    
    const errorRate = this.calculateErrorRate(sessions);
    if (errorRate > 5) { // > 5%
      recommendations.push({
        id: 'reduce_errors',
        type: 'performance',
        priority: SecuritySeverity.CRITICAL,
        title: 'Reduzir Taxa de Erros',
        description: 'Muitos usuários estão encontrando erros',
        impact: 'Melhorar estabilidade e confiança do usuário',
        effort: 'medium',
        expectedGain: 40,
        implementation: [
          'Implementar monitoramento de erros robusto',
          'Adicionar tratamento de erros gracioso',
          'Melhorar validações de entrada',
          'Implementar fallbacks para funcionalidades críticas'
        ],
        metrics: ['error_rate', 'user_satisfaction', 'conversion_rate']
      });
    }
    
    return recommendations;
  }

  private calculateAverageLoadTime(sessions: UserSession[]): number {
    const loadTimes: number[] = [];
    
    sessions.forEach(session => {
      session.pageViews.forEach(pageView => {
        if (pageView.loadTime > 0) {
          loadTimes.push(pageView.loadTime);
        }
      });
    });
    
    return loadTimes.length > 0 
      ? loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length 
      : 0;
  }

  private calculateErrorRate(sessions: UserSession[]): number {
    if (sessions.length === 0) return 0;
    
    const sessionsWithErrors = sessions.filter(s => s.errors.length > 0).length;
    return (sessionsWithErrors / sessions.length) * 100;
  }
}

// ============================================
// INSTÂNCIA GLOBAL COM LAZY INITIALIZATION
// ============================================

let _sessionTracker: SessionTracker | null = null;
let _behaviorAnalyzer: BehaviorAnalyzer | null = null;

export function getSessionTracker(): SessionTracker {
  if (typeof window === 'undefined') {
    // No servidor, retornar uma instância mock
    return {
      startSession: () => {},
      endSession: () => {},
      trackPageView: () => {},
      trackEvent: () => {},
      trackError: () => {},
      trackConversion: () => {},
      getCurrentSession: () => null,
      getAllSessions: () => [],
      getSessionById: () => null,
      clearOldSessions: () => {}
    } as any;
  }
  
  if (!_sessionTracker) {
    _sessionTracker = new SessionTracker();
  }
  
  return _sessionTracker;
}

export function getBehaviorAnalyzer(): BehaviorAnalyzer {
  if (typeof window === 'undefined') {
    // No servidor, retornar uma instância mock
    return {
      addSession: () => {},
      addSessions: () => {},
      generateReport: () => ({
        summary: {
          totalSessions: 0,
          totalUsers: 0,
          averageSessionDuration: 0,
          bounceRate: 0,
          conversionRate: 0,
          topPages: [],
          deviceBreakdown: {},
          timeRange: { start: 0, end: 0 }
        },
        patterns: [],
        recommendations: []
      }),
      getInsights: () => [],
      clearData: () => {}
    } as any;
  }
  
  if (!_behaviorAnalyzer) {
    _behaviorAnalyzer = new BehaviorAnalyzer();
  }
  
  return _behaviorAnalyzer;
}

// Manter compatibilidade com código existente
export const sessionTracker = getSessionTracker();
export const behaviorAnalyzer = getBehaviorAnalyzer();

import { useState, useEffect } from 'react';
import { SecuritySeverity } from './security-monitoring';

export function useUserBehaviorAnalytics() {
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [allSessions, setAllSessions] = useState<UserSession[]>([]);
  const [report, setReport] = useState<AnalyticsReport | null>(null);

  useEffect(() => {
    // Atualizar sessão atual periodicamente
    const updateCurrentSession = () => {
      setCurrentSession(sessionTracker.getCurrentSession());
    };

    updateCurrentSession();
    const interval = setInterval(updateCurrentSession, 5000);

    // Carregar todas as sessões
    setAllSessions(sessionTracker.getAllSessions());

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Gerar relatório quando as sessões mudarem
    if (allSessions.length > 0) {
      behaviorAnalyzer.addSessions(allSessions);
      const newReport = behaviorAnalyzer.generateReport();
      setReport(newReport);
    }
  }, [allSessions]);

  const trackConversion = (type: string, value?: number, metadata?: Record<string, any>) => {
    sessionTracker.trackConversion(type, value, metadata);
  };

  const generateCustomReport = (period?: { start: number; end: number }) => {
    return behaviorAnalyzer.generateReport(period);
  };

  return {
    currentSession,
    allSessions,
    report,
    trackConversion,
    generateCustomReport
  };
}