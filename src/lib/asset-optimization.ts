/**
 * Sistema de Otimização de Assets
 * Implementa otimização automática de imagens, lazy loading de assets,
 * compressão e cache inteligente para melhorar Core Web Vitals
 */

import { logger } from './logger';

// ============================================
// INTERFACES E TIPOS
// ============================================

export interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  width?: number;
  height?: number;
  blur?: boolean;
  priority?: boolean;
}

export interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
  placeholder?: string;
  fallback?: string;
}

export interface AssetMetrics {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  loadTime: number;
  format: string;
}

// ============================================
// OTIMIZADOR DE IMAGENS
// ============================================

class ImageOptimizer {
  private cache = new Map<string, string>();
  private metrics = new Map<string, AssetMetrics>();
  private supportedFormats: Set<string> = new Set();

  constructor() {
    this.detectFormatSupport();
  }

  private detectFormatSupport(): void {
    if (typeof window === 'undefined') return;

    // Detectar suporte a WebP
    const webpCanvas = document.createElement('canvas');
    webpCanvas.width = 1;
    webpCanvas.height = 1;
    const webpSupported = webpCanvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (webpSupported) {
      this.supportedFormats.add('webp');
    }

    // Detectar suporte a AVIF
    const avifImg = new Image();
    avifImg.onload = () => {
      this.supportedFormats.add('avif');
    };
    avifImg.onerror = () => {
      // AVIF não suportado
    };
    avifImg.src = 'data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgABogQEAwgMg8f8D///8WfhwB8+ErK42A=';

    logger.debug('Formatos de imagem suportados:', Array.from(this.supportedFormats));
  }

  async optimizeImage(
    src: string, 
    options: ImageOptimizationOptions = {}
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(src, options);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const optimizedSrc = await this.processImage(src, options);
      this.cache.set(cacheKey, optimizedSrc);
      return optimizedSrc;
    } catch (error) {
      logger.error('Erro ao otimizar imagem:', error instanceof Error ? error : new Error(String(error)));
      return src; // Fallback para imagem original
    }
  }

  private async processImage(
    src: string, 
    options: ImageOptimizationOptions
  ): Promise<string> {
    const {
      quality = 85,
      format = 'auto',
      width,
      height,
      blur = false,
      priority = false
    } = options;

    // Determinar melhor formato
    const targetFormat = this.getBestFormat(format);
    
    // Para imagens externas ou Next.js Image Optimization
    if (src.startsWith('http') || src.startsWith('/')) {
      const params = new URLSearchParams();
      
      if (width) params.set('w', width.toString());
      if (height) params.set('h', height.toString());
      if (quality !== 85) params.set('q', quality.toString());
      if (targetFormat !== 'auto') params.set('f', targetFormat);
      if (blur) params.set('blur', '20');
      
      const separator = src.includes('?') ? '&' : '?';
      return `${src}${separator}${params.toString()}`;
    }

    return src;
  }

  private getBestFormat(requestedFormat: string): string {
    if (requestedFormat !== 'auto') {
      return requestedFormat;
    }

    // Priorizar AVIF > WebP > JPEG
    if (this.supportedFormats.has('avif')) {
      return 'avif';
    }
    
    if (this.supportedFormats.has('webp')) {
      return 'webp';
    }

    return 'jpeg';
  }

  private generateCacheKey(src: string, options: ImageOptimizationOptions): string {
    return `${src}_${JSON.stringify(options)}`;
  }

  getMetrics(src: string): AssetMetrics | undefined {
    return this.metrics.get(src);
  }

  clearCache(): void {
    this.cache.clear();
    this.metrics.clear();
  }
}

// ============================================
// LAZY LOADING AVANÇADO
// ============================================

class LazyLoader {
  private observers = new Map<string, IntersectionObserver>();
  private loadedElements = new WeakSet<Element>();
  private loadingElements = new WeakSet<Element>();

  createObserver(options: LazyLoadOptions = {}): IntersectionObserver {
    const {
      rootMargin = '50px',
      threshold = 0.1,
      once = true
    } = options;

    const observerKey = `${rootMargin}_${threshold}_${once}`;
    
    if (this.observers.has(observerKey)) {
      return this.observers.get(observerKey)!;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !this.loadingElements.has(entry.target)) {
            this.handleIntersection(entry.target, observer, once);
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    this.observers.set(observerKey, observer);
    return observer;
  }

  private async handleIntersection(
    element: Element, 
    observer: IntersectionObserver, 
    once: boolean
  ): Promise<void> {
    this.loadingElements.add(element);

    try {
      if (element instanceof HTMLImageElement) {
        await this.loadImage(element);
      } else if (element instanceof HTMLIFrameElement) {
        this.loadIframe(element);
      } else {
        // Elemento genérico - disparar evento customizado
        element.dispatchEvent(new CustomEvent('lazyload'));
      }

      this.loadedElements.add(element);
      
      if (once) {
        observer.unobserve(element);
      }
    } catch (error) {
      logger.error('Erro no lazy loading:', error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.loadingElements.delete(element);
    }
  }

  private async loadImage(img: HTMLImageElement): Promise<void> {
    return new Promise((resolve, reject) => {
      const dataSrc = img.dataset.src;
      const dataSrcset = img.dataset.srcset;

      if (!dataSrc && !dataSrcset) {
        resolve();
        return;
      }

      const tempImg = new Image();
      
      tempImg.onload = () => {
        // Aplicar transição suave
        img.style.opacity = '0';
        img.style.transition = 'opacity 0.3s ease-in-out';
        
        if (dataSrc) img.src = dataSrc;
        if (dataSrcset) img.srcset = dataSrcset;
        
        // Remover data attributes
        delete img.dataset.src;
        delete img.dataset.srcset;
        
        // Fade in
        requestAnimationFrame(() => {
          img.style.opacity = '1';
        });
        
        resolve();
      };
      
      tempImg.onerror = reject;
      tempImg.src = dataSrc || '';
    });
  }

  private loadIframe(iframe: HTMLIFrameElement): void {
    const dataSrc = iframe.dataset.src;
    if (dataSrc) {
      iframe.src = dataSrc;
      delete iframe.dataset.src;
    }
  }

  isLoaded(element: Element): boolean {
    return this.loadedElements.has(element);
  }

  isLoading(element: Element): boolean {
    return this.loadingElements.has(element);
  }

  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// ============================================
// INSTÂNCIAS GLOBAIS
// ============================================

const imageOptimizer = new ImageOptimizer();
const lazyLoader = new LazyLoader();

// ============================================
// HOOKS REACT
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';

// Hook para lazy loading de imagens
export function useLazyImage(
  src: string,
  options: LazyLoadOptions & ImageOptimizationOptions = {}
) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Configurar Intersection Observer
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = lazyLoader.createObserver({
      rootMargin: options.rootMargin,
      threshold: options.threshold,
      once: options.once
    });

    const element = imgRef.current;
    observer.observe(element);

    const handleLazyLoad = () => {
      setIsInView(true);
    };

    element.addEventListener('lazyload', handleLazyLoad);

    return () => {
      observer.unobserve(element);
      element.removeEventListener('lazyload', handleLazyLoad);
    };
  }, [options.rootMargin, options.threshold, options.once]);

  // Otimizar imagem quando entrar em view
  useEffect(() => {
    if (!isInView) return;

    const optimizeAndLoad = async () => {
      try {
        const optimized = await imageOptimizer.optimizeImage(src, {
          quality: options.quality,
          format: options.format,
          width: options.width,
          height: options.height,
          blur: options.blur,
          priority: options.priority
        });
        
        setOptimizedSrc(optimized);
      } catch (err) {
        setError(err as Error);
      }
    };

    optimizeAndLoad();
  }, [isInView, src, options]);

  const onLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const onError = useCallback((err: any) => {
    setError(new Error('Falha ao carregar imagem'));
  }, []);

  return {
    ref: imgRef,
    src: optimizedSrc,
    isLoaded,
    isInView,
    error,
    onLoad,
    onError
  };
}

// Hook para lazy loading genérico
export function useLazyLoad(options: LazyLoadOptions = {}) {
  const [isInView, setIsInView] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    const observer = lazyLoader.createObserver(options);
    const element = elementRef.current;
    
    observer.observe(element);

    const handleLazyLoad = () => {
      setIsInView(true);
      if (!hasIntersected) {
        setHasIntersected(true);
      }
    };

    element.addEventListener('lazyload', handleLazyLoad);

    return () => {
      observer.unobserve(element);
      element.removeEventListener('lazyload', handleLazyLoad);
    };
  }, [options, hasIntersected]);

  return {
    ref: elementRef,
    isInView,
    hasIntersected
  };
}

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

export function preloadImage(src: string, options: ImageOptimizationOptions = {}): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const optimizedSrc = await imageOptimizer.optimizeImage(src, options);
      
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = optimizedSrc;
    } catch (error) {
      reject(error);
    }
  });
}

export function preloadImages(sources: string[], options: ImageOptimizationOptions = {}): Promise<void[]> {
  return Promise.all(sources.map(src => preloadImage(src, options)));
}

export function getImageMetrics(src: string): AssetMetrics | undefined {
  return imageOptimizer.getMetrics(src);
}

export function clearImageCache(): void {
  imageOptimizer.clearCache();
}

export function cleanupLazyLoader(): void {
  lazyLoader.cleanup();
}

// ============================================
// CONFIGURAÇÃO GLOBAL
// ============================================

export const AssetOptimization = {
  imageOptimizer,
  lazyLoader,
  preloadImage,
  preloadImages,
  getImageMetrics,
  clearImageCache,
  cleanupLazyLoader
};

export default AssetOptimization;
