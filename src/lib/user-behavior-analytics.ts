/**
 * Sistema de Análise de Comportamento do Usuário
 * Rastreia sessões, interações e gera insights sobre o comportamento dos usuários
 */

import { useState, useEffect } from 'react';
import { SecuritySeverity } from './security-monitoring';
import { logger } from './logger';

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
  conversions: Conversion[];
  errors: SessionError[];
  device: DeviceInfo;
  location: LocationInfo;
  referrer?: string;
  exitPage?: string;
  bounced: boolean;
}

export interface PageView {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  loadTime: number;
  timeOnPage?: number;
  scrollDepth: number;
  exitRate?: number;
}

export interface UserInteraction {
  id: string;
  type: 'click' | 'scroll' | 'form_submit' | 'search' | 'download' | 'video_play' | 'custom';
  element: string;
  timestamp: number;
  metadata?: Record<string, any>;
  value?: string | number;
}

export interface Conversion {
  id: string;
  type: string;
  value?: number;
  timestamp: number;
  funnel_step?: string;
  metadata?: Record<string, any>;
}

export interface SessionError {
  id: string;
  type: 'javascript' | 'network' | 'user_action' | 'performance';
  message: string;
  timestamp: number;
  url: string;
  stack?: string;
  severity: SecuritySeverity;
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  screenResolution: string;
  viewport: { width: number; height: number };
}

export interface LocationInfo {
  country?: string;
  region?: string;
  city?: string;
  timezone: string;
  language: string;
}

export interface BehaviorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  users: string[];
  characteristics: Record<string, any>;
  impact: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface UserSegment {
  id: string;
  name: string;
  criteria: Record<string, any>;
  users: string[];
  characteristics: {
    avgSessionDuration: number;
    avgPageViews: number;
    conversionRate: number;
    bounceRate: number;
    topPages: string[];
    preferredDevice: string;
  };
}

export interface AnalyticsReport {
  summary: {
    totalSessions: number;
    totalUsers: number;
    averageSessionDuration: number;
    bounceRate: number;
    conversionRate: number;
    topPages: Array<{ url: string; views: number; avgTime: number }>;
    deviceBreakdown: Record<string, number>;
    timeRange: { start: number; end: number };
  };
  patterns: BehaviorPattern[];
  recommendations: UXRecommendation[];
}

export interface UXRecommendation {
  id: string;
  type: 'performance' | 'ux' | 'conversion' | 'engagement';
  priority: SecuritySeverity;
  title: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  expectedGain: number;
  implementation: string[];
  metrics: string[];
}

// ============================================
// CLASSE PRINCIPAL - SESSION TRACKER
// ============================================

export class SessionTracker {
  private currentSession: UserSession | null = null;
  private sessions: UserSession[] = [];
  private maxSessions = 1000;
  private storageKey = 'user_behavior_sessions';

  constructor() {
    this.loadSessions();
    this.setupEventListeners();
  }

  private loadSessions(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.sessions = JSON.parse(stored);
      }
    } catch (error) {
      logger.error('Erro ao carregar sessões:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private saveSessions(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.sessions));
    } catch (error) {
      logger.error('Erro ao salvar sessões:', error instanceof Error ? error : new Error(String(error)));
    }
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Rastrear mudanças de página
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Rastrear cliques
    document.addEventListener('click', (event) => {
      this.trackInteraction({
        type: 'click',
        element: this.getElementSelector(event.target as Element),
        timestamp: Date.now()
      });
    });

    // Rastrear scroll
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollDepth = this.calculateScrollDepth();
        this.trackInteraction({
          type: 'scroll',
          element: 'window',
          timestamp: Date.now(),
          metadata: { scrollDepth }
        });
      }, 250);
    });
  }

  public startSession(userId?: string): UserSession {
    // Finalizar sessão anterior se existir
    if (this.currentSession) {
      this.endSession();
    }

    const session: UserSession = {
      id: this.generateSessionId(),
      userId,
      startTime: Date.now(),
      pageViews: [],
      interactions: [],
      conversions: [],
      errors: [],
      device: this.getDeviceInfo(),
      location: this.getLocationInfo(),
      referrer: document.referrer,
      bounced: false
    };

    this.currentSession = session;
    this.trackPageView();

    return session;
  }

  public endSession(): void {
    if (!this.currentSession) return;

    const session = this.currentSession;
    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;
    session.exitPage = window.location.href;
    session.bounced = this.calculateBounced(session);

    // Calcular tempo nas páginas
    this.calculateTimeOnPages(session);

    this.sessions.push(session);
    this.currentSession = null;

    // Limitar número de sessões armazenadas
    if (this.sessions.length > this.maxSessions) {
      this.sessions = this.sessions.slice(-this.maxSessions);
    }

    this.saveSessions();
  }

  public trackPageView(url?: string, title?: string): void {
    if (!this.currentSession) {
      this.startSession();
    }

    const pageView: PageView = {
      id: this.generateId(),
      url: url || window.location.href,
      title: title || document.title,
      timestamp: Date.now(),
      loadTime: this.getPageLoadTime(),
      scrollDepth: 0
    };

    this.currentSession!.pageViews.push(pageView);
  }

  public trackEvent(interaction: Omit<UserInteraction, 'id' | 'timestamp'>): void {
    if (!this.currentSession) {
      this.startSession();
    }

    this.trackInteraction({
      ...interaction,
      timestamp: Date.now()
    });
  }

  public trackError(error: Omit<SessionError, 'id' | 'timestamp'>): void {
    if (!this.currentSession) {
      this.startSession();
    }

    const sessionError: SessionError = {
      ...error,
      id: this.generateId(),
      timestamp: Date.now()
    };

    this.currentSession!.errors.push(sessionError);
  }

  public trackConversion(type: string, value?: number, metadata?: Record<string, any>): void {
    if (!this.currentSession) {
      this.startSession();
    }

    const conversion: Conversion = {
      id: this.generateId(),
      type,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.currentSession!.conversions.push(conversion);
  }

  public getCurrentSession(): UserSession | null {
    return this.currentSession;
  }

  public getAllSessions(): UserSession[] {
    return [...this.sessions];
  }

  public getSessionById(id: string): UserSession | null {
    return this.sessions.find(s => s.id === id) || null;
  }

  public clearOldSessions(daysOld: number = 30): void {
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    this.sessions = this.sessions.filter(s => s.startTime > cutoff);
    this.saveSessions();
  }

  // Métodos auxiliares privados
  private trackInteraction(interaction: Omit<UserInteraction, 'id'>): void {
    if (!this.currentSession) return;

    const fullInteraction: UserInteraction = {
      ...interaction,
      id: this.generateId()
    };

    this.currentSession.interactions.push(fullInteraction);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getElementSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }

  private calculateScrollDepth(): number {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const documentHeight = document.documentElement.scrollHeight - window.innerHeight;
    return documentHeight > 0 ? Math.round((scrollTop / documentHeight) * 100) : 0;
  }

  private getDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    return {
      type: this.getDeviceType(userAgent),
      os: this.getOS(userAgent),
      browser: this.getBrowser(userAgent),
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  private getLocationInfo(): LocationInfo {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language
    };
  }

  private getPageLoadTime(): number {
    if (typeof window !== 'undefined' && window.performance) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return navigation ? navigation.loadEventEnd - navigation.fetchStart : 0;
    }
    return 0;
  }

  private calculateBounced(session: UserSession): boolean {
    return session.pageViews.length <= 1 && (session.duration || 0) < 30000; // < 30 segundos
  }

  private calculateTimeOnPages(session: UserSession): void {
    for (let i = 0; i < session.pageViews.length; i++) {
      const current = session.pageViews[i];
      const next = session.pageViews[i + 1];
      
      if (next) {
        current.timeOnPage = next.timestamp - current.timestamp;
      } else if (session.endTime) {
        current.timeOnPage = session.endTime - current.timestamp;
      }
    }
  }

  private getDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private getOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private getBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }
}

// ============================================
// CLASSE DE ANÁLISE DE COMPORTAMENTO
// ============================================

export class BehaviorAnalyzer {
  private sessions: UserSession[] = [];

  public addSession(session: UserSession): void {
    this.sessions.push(session);
  }

  public addSessions(sessions: UserSession[]): void {
    this.sessions.push(...sessions);
  }

  public generateReport(period?: { start: number; end: number }): AnalyticsReport {
    let filteredSessions = this.sessions;
    
    if (period) {
      filteredSessions = this.sessions.filter(s => 
        s.startTime >= period.start && s.startTime <= period.end
      );
    }

    return {
      summary: this.generateSummary(filteredSessions),
      patterns: this.identifyPatterns(filteredSessions),
      recommendations: this.generateRecommendations(filteredSessions)
    };
  }

  public getInsights(userId?: string): BehaviorPattern[] {
    const userSessions = userId 
      ? this.sessions.filter(s => s.userId === userId)
      : this.sessions;
    
    return this.identifyPatterns(userSessions);
  }

  public clearData(): void {
    this.sessions = [];
  }

  private generateSummary(sessions: UserSession[]) {
    const uniqueUsers = new Set(sessions.map(s => s.userId).filter(Boolean)).size;
    const totalDuration = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const bouncedSessions = sessions.filter(s => s.bounced).length;
    const conversions = sessions.reduce((sum, s) => sum + s.conversions.length, 0);
    
    // Top páginas
    const pageViews = sessions.flatMap(s => s.pageViews);
    const pageStats = pageViews.reduce((acc, pv) => {
      if (!acc[pv.url]) {
        acc[pv.url] = { views: 0, totalTime: 0 };
      }
      acc[pv.url].views++;
      acc[pv.url].totalTime += pv.timeOnPage || 0;
      return acc;
    }, {} as Record<string, { views: number; totalTime: number }>);
    
    const topPages = Object.entries(pageStats)
      .map(([url, stats]) => ({
        url,
        views: stats.views,
        avgTime: stats.totalTime / stats.views
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    // Breakdown por dispositivo
    const deviceBreakdown = sessions.reduce((acc, s) => {
      acc[s.device.type] = (acc[s.device.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSessions: sessions.length,
      totalUsers: uniqueUsers,
      averageSessionDuration: sessions.length > 0 ? totalDuration / sessions.length : 0,
      bounceRate: sessions.length > 0 ? (bouncedSessions / sessions.length) * 100 : 0,
      conversionRate: sessions.length > 0 ? (conversions / sessions.length) * 100 : 0,
      topPages,
      deviceBreakdown,
      timeRange: {
        start: Math.min(...sessions.map(s => s.startTime)),
        end: Math.max(...sessions.map(s => s.endTime || s.startTime))
      }
    };
  }

  private identifyPatterns(sessions: UserSession[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];

    // Padrão: Usuários que abandonam rapidamente
    const quickExitUsers = sessions.filter(s => s.bounced && (s.duration || 0) < 10000);
    if (quickExitUsers.length > sessions.length * 0.2) {
      patterns.push({
        id: 'quick_exit',
        name: 'Abandono Rápido',
        description: 'Usuários que saem rapidamente do site',
        frequency: quickExitUsers.length,
        users: quickExitUsers.map(s => s.userId || s.id),
        characteristics: {
          avgDuration: quickExitUsers.reduce((sum, s) => sum + (s.duration || 0), 0) / quickExitUsers.length,
          commonPages: this.getMostCommonPages(quickExitUsers)
        },
        impact: 'negative',
        confidence: 0.8
      });
    }

    // Padrão: Usuários engajados
    const engagedUsers = sessions.filter(s => 
      !s.bounced && (s.duration || 0) > 120000 && s.pageViews.length > 3
    );
    if (engagedUsers.length > 0) {
      patterns.push({
        id: 'engaged_users',
        name: 'Usuários Engajados',
        description: 'Usuários com alto engajamento',
        frequency: engagedUsers.length,
        users: engagedUsers.map(s => s.userId || s.id),
        characteristics: {
          avgDuration: engagedUsers.reduce((sum, s) => sum + (s.duration || 0), 0) / engagedUsers.length,
          avgPageViews: engagedUsers.reduce((sum, s) => sum + s.pageViews.length, 0) / engagedUsers.length,
          commonDevices: this.getMostCommonDevices(engagedUsers)
        },
        impact: 'positive',
        confidence: 0.9
      });
    }

    // Padrão: Problemas de performance
    const slowLoadSessions = sessions.filter(s => 
      s.pageViews.some(pv => pv.loadTime > 3000)
    );
    if (slowLoadSessions.length > sessions.length * 0.15) {
      patterns.push({
        id: 'performance_issues',
        name: 'Problemas de Performance',
        description: 'Sessões com carregamento lento',
        frequency: slowLoadSessions.length,
        users: slowLoadSessions.map(s => s.userId || s.id),
        characteristics: {
          avgLoadTime: this.calculateAverageLoadTime(slowLoadSessions),
          affectedPages: this.getSlowPages(slowLoadSessions)
        },
        impact: 'negative',
        confidence: 0.85
      });
    }

    return patterns;
  }

  private generateRecommendations(sessions: UserSession[]): UXRecommendation[] {
    const recommendations: UXRecommendation[] = [];

    // Recomendação baseada em tempo de carregamento
    const avgLoadTime = this.calculateAverageLoadTime(sessions);
    if (avgLoadTime > 2000) {
      recommendations.push({
        id: 'improve_load_time',
        type: 'performance',
        priority: avgLoadTime > 5000 ? SecuritySeverity.CRITICAL : SecuritySeverity.HIGH,
        title: 'Melhorar Tempo de Carregamento',
        description: `Tempo médio de carregamento: ${(avgLoadTime / 1000).toFixed(1)}s`,
        impact: 'Reduzir taxa de abandono e melhorar experiência do usuário',
        effort: 'medium',
        expectedGain: 25,
        implementation: [
          'Otimizar imagens e recursos',
          'Implementar cache eficiente',
          'Minificar CSS e JavaScript',
          'Usar CDN para recursos estáticos'
        ],
        metrics: ['page_load_time', 'bounce_rate', 'user_satisfacao']
      });
    }
    
    const bounceRate = this.calculateBounceRate(sessions);
    if (bounceRate > 60) {
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
    if (errorRate > 5) {
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

  private calculateBounceRate(sessions: UserSession[]): number {
    if (sessions.length === 0) return 0;
    
    const bouncedSessions = sessions.filter(s => s.bounced).length;
    return (bouncedSessions / sessions.length) * 100;
  }

  private getMostCommonPages(sessions: UserSession[]): string[] {
    const pageCount = sessions.flatMap(s => s.pageViews)
      .reduce((acc, pv) => {
        acc[pv.url] = (acc[pv.url] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(pageCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([url]) => url);
  }

  private getMostCommonDevices(sessions: UserSession[]): string[] {
    const deviceCount = sessions.reduce((acc, s) => {
      acc[s.device.type] = (acc[s.device.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(deviceCount)
      .sort(([,a], [,b]) => b - a)
      .map(([device]) => device);
  }

  private getSlowPages(sessions: UserSession[]): string[] {
    const slowPages = sessions.flatMap(s => s.pageViews)
      .filter(pv => pv.loadTime > 3000)
      .reduce((acc, pv) => {
        acc[pv.url] = (acc[pv.url] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    return Object.entries(slowPages)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([url]) => url);
  }
}

// ============================================
// INSTÂNCIA GLOBAL COM LAZY INITIALIZATION
// ============================================

let _sessionTracker: SessionTracker | null = null;
let _behaviorAnalyzer: BehaviorAnalyzer | null = null;

export function getSessionTracker(): SessionTracker {
  if (typeof window === 'undefined') {
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

export const sessionTracker = getSessionTracker();
export const behaviorAnalyzer = getBehaviorAnalyzer();

export function useUserBehaviorAnalytics() {
  const [currentSession, setCurrentSession] = useState<UserSession | null>(null);
  const [allSessions, setAllSessions] = useState<UserSession[]>([]);
  const [report, setReport] = useState<AnalyticsReport | null>(null);

  useEffect(() => {
    const updateCurrentSession = () => {
      setCurrentSession(sessionTracker.getCurrentSession());
    };

    updateCurrentSession();
    const interval = setInterval(updateCurrentSession, 5000);
    setAllSessions(sessionTracker.getAllSessions());

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
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

export default {
  SessionTracker,
  BehaviorAnalyzer,
  getSessionTracker,
  getBehaviorAnalyzer,
  sessionTracker,
  behaviorAnalyzer,
  useUserBehaviorAnalytics
};


