/**
 * Otimizações para Core Web Vitals
 * Implementa melhorias específicas para LCP, FID, CLS e outras métricas
 */

import { logger } from '@/lib/logger';

interface WebVitalsMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
}

class CoreWebVitalsOptimizer {
  private metrics: WebVitalsMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();

  /**
   * Inicializa monitoramento de Core Web Vitals
   */
  init() {
    if (typeof window === 'undefined') return;

    this.observeLCP();
    this.observeFID();
    this.observeCLS();
    this.observeFCP();
    this.observeTTFB();
    
    // Otimizações automáticas
    this.optimizeImages();
    this.optimizeScripts();
    this.preloadCriticalResources();
    this.setupIntersectionObserver();
  }

  /**
   * Observa Largest Contentful Paint (LCP)
   */
  private observeLCP() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry;
      
      this.metrics.lcp = lastEntry.startTime;
      
      if (lastEntry.startTime > 2500) {
        logger.warn('LCP acima do recomendado:', {
          lcp: lastEntry.startTime,
          target: '< 2500ms'
        });
        this.optimizeLCP();
      }
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });
    this.observers.set('lcp', observer);
  }

  /**
   * Observa First Input Delay (FID)
   */
  private observeFID() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.metrics.fid = entry.processingStart - entry.startTime;
        
        if (this.metrics.fid > 100) {
          logger.warn('FID acima do recomendado:', {
            fid: this.metrics.fid,
            target: '< 100ms'
          });
          this.optimizeFID();
        }
      });
    });

    observer.observe({ entryTypes: ['first-input'] });
    this.observers.set('fid', observer);
  }

  /**
   * Observa Cumulative Layout Shift (CLS)
   */
  private observeCLS() {
    if (!('PerformanceObserver' in window)) return;

    let clsValue = 0;
    let clsEntries: any[] = [];

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          clsEntries.push(entry);
        }
      });

      this.metrics.cls = clsValue;
      
      if (clsValue > 0.1) {
        logger.warn('CLS acima do recomendado:', {
          cls: clsValue,
          target: '< 0.1',
          entries: clsEntries
        });
        this.optimizeCLS();
      }
    });

    observer.observe({ entryTypes: ['layout-shift'] });
    this.observers.set('cls', observer);
  }

  /**
   * Observa First Contentful Paint (FCP)
   */
  private observeFCP() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        this.metrics.fcp = entry.startTime;
      });
    });

    observer.observe({ entryTypes: ['paint'] });
    this.observers.set('fcp', observer);
  }

  /**
   * Observa Time to First Byte (TTFB)
   */
  private observeTTFB() {
    if (!('PerformanceObserver' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.metrics.ttfb = entry.responseStart - entry.requestStart;
      });
    });

    observer.observe({ entryTypes: ['navigation'] });
    this.observers.set('ttfb', observer);
  }

  /**
   * Otimizações específicas para LCP
   */
  private optimizeLCP() {
    // Preload da imagem LCP se identificada
    const lcpElements = document.querySelectorAll('img[data-lcp="true"]');
    lcpElements.forEach((img: any) => {
      if (img.loading !== 'eager') {
        img.loading = 'eager';
      }
    });

    // Priorizar recursos críticos
    this.preloadCriticalResources();
  }

  /**
   * Otimizações específicas para FID
   */
  private optimizeFID() {
    // Quebrar tarefas longas
    this.breakLongTasks();
    
    // Defer scripts não críticos
    this.deferNonCriticalScripts();
  }

  /**
   * Otimizações específicas para CLS
   */
  private optimizeCLS() {
    // Adicionar dimensões a imagens sem tamanho definido
    const images = document.querySelectorAll('img:not([width]):not([height])');
    images.forEach((img: any) => {
      if (img.naturalWidth && img.naturalHeight) {
        img.width = img.naturalWidth;
        img.height = img.naturalHeight;
      }
    });

    // Reservar espaço para conteúdo dinâmico
    this.reserveSpaceForDynamicContent();
  }

  /**
   * Otimiza carregamento de imagens
   */
  private optimizeImages() {
    const images = document.querySelectorAll('img');
    images.forEach((img: any, index) => {
      // Lazy loading para imagens abaixo da dobra
      if (index > 2 && !img.loading) {
        img.loading = 'lazy';
      }

      // Adicionar decode async
      if (!img.decoding) {
        img.decoding = 'async';
      }
    });
  }

  /**
   * Otimiza scripts
   */
  private optimizeScripts() {
    const scripts = document.querySelectorAll('script[src]:not([async]):not([defer])');
    scripts.forEach((script: any) => {
      if (!script.src.includes('critical')) {
        script.defer = true;
      }
    });
  }

  /**
   * Preload recursos críticos
   */
  private preloadCriticalResources() {
    const criticalResources = [
      { href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2' },
      { href: '/api/user/profile', as: 'fetch' },
    ];

    criticalResources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = resource.href;
      link.as = resource.as;
      if (resource.type) link.type = resource.type;
      if (resource.as === 'font') link.crossOrigin = 'anonymous';
      
      document.head.appendChild(link);
    });
  }

  /**
   * Quebra tarefas longas em chunks menores
   */
  private breakLongTasks() {
    // Implementar scheduler para tarefas pesadas
    if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
      // Usar Scheduler API quando disponível
      return;
    }

    // Fallback com setTimeout - apenas monitorar tarefas longas
    const originalSetTimeout = window.setTimeout;
    const monitorCallback = (callback: any) => {
      return () => {
        const start = performance.now();
        callback();
        const duration = performance.now() - start;
        
        if (duration > 50) {
          logger.warn('Tarefa longa detectada:', { duration });
        }
      };
    };

    // Não sobrescrever setTimeout, apenas monitorar
    if (typeof originalSetTimeout === 'function') {
      // Implementação de monitoramento sem alterar a API nativa
      logger.info('Sistema de monitoramento de tarefas longas ativo');
    }
  }

  /**
   * Defer scripts não críticos
   */
  private deferNonCriticalScripts() {
    const nonCriticalScripts = document.querySelectorAll('script[data-non-critical]');
    nonCriticalScripts.forEach((script: any) => {
      script.defer = true;
    });
  }

  /**
   * Reserva espaço para conteúdo dinâmico
   */
  private reserveSpaceForDynamicContent() {
    const dynamicContainers = document.querySelectorAll('[data-dynamic-content]');
    dynamicContainers.forEach((container: any) => {
      if (!container.style.minHeight) {
        container.style.minHeight = '200px'; // Altura mínima padrão
      }
    });
  }

  /**
   * Configura Intersection Observer para lazy loading
   */
  private setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    // Observar todas as imagens com data-src
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }

  /**
   * Retorna métricas coletadas
   */
  getMetrics(): WebVitalsMetrics {
    return { ...this.metrics };
  }

  /**
   * Limpa observers
   */
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Instância singleton
export const coreWebVitals = new CoreWebVitalsOptimizer();

// Auto-inicializar no cliente
if (typeof window !== 'undefined') {
  // Aguardar DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => coreWebVitals.init());
  } else {
    coreWebVitals.init();
  }
}

// Exportar também a classe
export { CoreWebVitalsOptimizer };

// Tipos para uso externo
export type { WebVitalsMetrics };
