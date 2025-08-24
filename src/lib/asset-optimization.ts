/**
 * Sistema de Otimização de Assets
 * 
 * Implementa otimização automática de imagens, lazy loading de assets,
 * compressão e cache inteligente para melhorar a performance.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================
// INTERFACES E TIPOS
// ============================================

interface ImageOptimizationOptions {
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png' | 'auto';
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  blur?: number;
  progressive?: boolean;
  lossless?: boolean;
}

interface LazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  placeholder?: string;
  fallback?: string;
}

interface AssetCacheEntry {
  url: string;
  blob: Blob;
  timestamp: number;
  size: number;
  type: string;
}

interface PerformanceMetrics {
  loadTime: number;
  size: number;
  compressionRatio: number;
  cacheHit: boolean;
}

// ============================================
// CACHE DE ASSETS
// ============================================

class AssetCache {
  private cache: Map<string, AssetCacheEntry> = new Map();
  private maxSize: number = 50 * 1024 * 1024; // 50MB
  private currentSize: number = 0;
  private maxAge: number = 24 * 60 * 60 * 1000; // 24 horas

  // Verificar se asset está no cache
  has(url: string): boolean {
    const entry = this.cache.get(url);
    if (!entry) return false;

    // Verificar se não expirou
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.remove(url);
      return false;
    }

    return true;
  }

  // Obter asset do cache
  get(url: string): Blob | null {
    if (!this.has(url)) return null;
    return this.cache.get(url)?.blob || null;
  }

  // Armazenar asset no cache
  set(url: string, blob: Blob): void {
    // Verificar se há espaço suficiente
    while (this.currentSize + blob.size > this.maxSize && this.cache.size > 0) {
      this.evictOldest();
    }

    // Remover entrada existente se houver
    if (this.cache.has(url)) {
      this.remove(url);
    }

    // Adicionar nova entrada
    const entry: AssetCacheEntry = {
      url,
      blob,
      timestamp: Date.now(),
      size: blob.size,
      type: blob.type
    };

    this.cache.set(url, entry);
    this.currentSize += blob.size;
  }

  // Remover asset do cache
  remove(url: string): void {
    const entry = this.cache.get(url);
    if (entry) {
      this.cache.delete(url);
      this.currentSize -= entry.size;
    }
  }

  // Remover o asset mais antigo
  private evictOldest(): void {
    let oldestUrl = '';
    let oldestTime = Date.now();

    for (const [url, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      this.remove(oldestUrl);
    }
  }

  // Limpar cache
  clear(): void {
    this.cache.clear();
    this.currentSize = 0;
  }

  // Estatísticas do cache
  getStats() {
    return {
      entries: this.cache.size,
      currentSize: this.currentSize,
      maxSize: this.maxSize,
      usage: (this.currentSize / this.maxSize) * 100
    };
  }
}

// ============================================
// OTIMIZADOR DE IMAGENS
// ============================================

class ImageOptimizer {
  private cache = new AssetCache();
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
    }
  }

  // Otimizar imagem
  async optimizeImage(
    src: string, 
    options: ImageOptimizationOptions = {}
  ): Promise<{ url: string; metrics: PerformanceMetrics }> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(src, options);

    // Verificar cache primeiro
    if (this.cache.has(cacheKey)) {
      const blob = this.cache.get(cacheKey);
      if (blob) {
        const url = URL.createObjectURL(blob);
        return {
          url,
          metrics: {
            loadTime: Date.now() - startTime,
            size: blob.size,
            compressionRatio: 0, // Não aplicável para cache hit
            cacheHit: true
          }
        };
      }
    }

    try {
      // Carregar imagem original
      const originalBlob = await this.loadImage(src);
      const originalSize = originalBlob.size;

      // Otimizar imagem
      const optimizedBlob = await this.processImage(originalBlob, options);
      
      // Armazenar no cache
      this.cache.set(cacheKey, optimizedBlob);

      const url = URL.createObjectURL(optimizedBlob);
      const compressionRatio = ((originalSize - optimizedBlob.size) / originalSize) * 100;

      return {
        url,
        metrics: {
          loadTime: Date.now() - startTime,
          size: optimizedBlob.size,
          compressionRatio,
          cacheHit: false
        }
      };
    } catch (error) {
      console.error('Erro ao otimizar imagem:', error);
      // Retornar imagem original em caso de erro
      return {
        url: src,
        metrics: {
          loadTime: Date.now() - startTime,
          size: 0,
          compressionRatio: 0,
          cacheHit: false
        }
      };
    }
  }

  // Carregar imagem como blob
  private async loadImage(src: string): Promise<Blob> {
    const response = await fetch(src);
    if (!response.ok) {
      throw new Error(`Falha ao carregar imagem: ${response.statusText}`);
    }
    return response.blob();
  }

  // Processar e otimizar imagem
  private async processImage(
    blob: Blob, 
    options: ImageOptimizationOptions
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const optimizedBlob = this.compressImage(img, options);
          resolve(optimizedBlob);
        } catch (error) {
          reject(error);
        }
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  }

  // Comprimir imagem usando canvas
  private compressImage(
    img: HTMLImageElement, 
    options: ImageOptimizationOptions
  ): Blob {
    if (!this.canvas || !this.ctx) {
      throw new Error('Canvas não disponível');
    }

    const {
      quality = 0.8,
      format = 'auto',
      width,
      height,
      fit = 'cover'
    } = options;

    // Calcular dimensões
    const dimensions = this.calculateDimensions(img, { width, height, fit });
    
    // Configurar canvas
    this.canvas.width = dimensions.width;
    this.canvas.height = dimensions.height;

    // Limpar canvas
    this.ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Desenhar imagem redimensionada
    this.ctx.drawImage(
      img,
      dimensions.sx,
      dimensions.sy,
      dimensions.sw,
      dimensions.sh,
      0,
      0,
      dimensions.width,
      dimensions.height
    );

    // Aplicar filtros se necessário
    if (options.blur) {
      this.ctx.filter = `blur(${options.blur}px)`;
    }

    // Determinar formato de saída
    const outputFormat = this.getOutputFormat(format, img.src);
    
    // Converter para blob
    return new Promise((resolve) => {
      this.canvas!.toBlob(
        (blob) => resolve(blob!),
        outputFormat,
        quality
      );
    }) as any; // Simplificação para o exemplo
  }

  // Calcular dimensões de redimensionamento
  private calculateDimensions(
    img: HTMLImageElement,
    options: { width?: number; height?: number; fit?: string }
  ) {
    const { width: targetWidth, height: targetHeight, fit = 'cover' } = options;
    const { naturalWidth: originalWidth, naturalHeight: originalHeight } = img;

    let width = targetWidth || originalWidth;
    let height = targetHeight || originalHeight;

    // Se apenas uma dimensão foi especificada, calcular a outra mantendo proporção
    if (targetWidth && !targetHeight) {
      height = (originalHeight * targetWidth) / originalWidth;
    } else if (targetHeight && !targetWidth) {
      width = (originalWidth * targetHeight) / originalHeight;
    }

    // Calcular coordenadas de origem para crop
    let sx = 0, sy = 0, sw = originalWidth, sh = originalHeight;

    if (fit === 'cover' && targetWidth && targetHeight) {
      const scale = Math.max(targetWidth / originalWidth, targetHeight / originalHeight);
      sw = targetWidth / scale;
      sh = targetHeight / scale;
      sx = (originalWidth - sw) / 2;
      sy = (originalHeight - sh) / 2;
    }

    return { width, height, sx, sy, sw, sh };
  }

  // Determinar formato de saída
  private getOutputFormat(format: string, originalSrc: string): string {
    if (format === 'auto') {
      // Detectar suporte a formatos modernos
      if (this.supportsWebP()) return 'image/webp';
      if (this.supportsAVIF()) return 'image/avif';
      return 'image/jpeg';
    }
    
    const formatMap: Record<string, string> = {
      webp: 'image/webp',
      avif: 'image/avif',
      jpeg: 'image/jpeg',
      png: 'image/png'
    };
    
    return formatMap[format] || 'image/jpeg';
  }

  // Verificar suporte a WebP
  private supportsWebP(): boolean {
    if (!this.canvas) return false;
    return this.canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // Verificar suporte a AVIF
  private supportsAVIF(): boolean {
    // Implementação simplificada
    return false; // AVIF ainda tem suporte limitado
  }

  // Gerar chave de cache
  private generateCacheKey(src: string, options: ImageOptimizationOptions): string {
    const optionsString = JSON.stringify(options);
    return btoa(`${src}:${optionsString}`).substring(0, 32);
  }

  // Limpar cache
  clearCache(): void {
    this.cache.clear();
  }

  // Estatísticas
  getStats() {
    return this.cache.getStats();
  }
}

// ============================================
// HOOKS REACT
// ============================================

// Hook para lazy loading de imagens
export function useLazyImage(
  src: string,
  options: LazyLoadOptions & ImageOptimizationOptions = {}
) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const optimizerRef = useRef(new ImageOptimizer());

  // Configurar Intersection Observer
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (options.triggerOnce) {
            observer.disconnect();
          }
        }
      },
      {
        threshold: options.threshold || 0.1,
        rootMargin: options.rootMargin || '50px'
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, options.triggerOnce]);

  // Carregar e otimizar imagem quando estiver em view
  useEffect(() => {
    if (!isInView || optimizedSrc) return;

    const loadImage = async () => {
      try {
        const result = await optimizerRef.current.optimizeImage(src, options);
        setOptimizedSrc(result.url);
        setMetrics(result.metrics);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar imagem');
        setOptimizedSrc(src); // Fallback para imagem original
      }
    };

    loadImage();
  }, [isInView, src, optimizedSrc]);

  // Marcar como carregada quando a imagem for carregada
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError('Falha ao carregar imagem');
    if (options.fallback) {
      setOptimizedSrc(options.fallback);
    }
  }, [options.fallback]);

  return {
    ref: imgRef,
    src: optimizedSrc,
    isLoaded,
    isInView,
    error,
    metrics,
    onLoad: handleLoad,
    onError: handleError
  };
}

// Hook para pré-carregamento de assets
export function useAssetPreloader(urls: string[], priority: 'high' | 'low' = 'low') {
  const [loadedAssets, setLoadedAssets] = useState<Set<string>>(new Set());
  const [failedAssets, setFailedAssets] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const preloadAsset = useCallback(async (url: string) => {
    try {
      // Usar diferentes estratégias baseadas no tipo de asset
      if (url.match(/\.(jpg|jpeg|png|webp|avif)$/i)) {
        // Pré-carregar imagem
        const img = new Image();
        img.src = url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
      } else {
        // Pré-carregar outros assets
        await fetch(url);
      }
      
      setLoadedAssets(prev => new Set([...prev, url]));
    } catch (error) {
      setFailedAssets(prev => new Set([...prev, url]));
    }
  }, []);

  useEffect(() => {
    if (urls.length === 0) return;

    setIsLoading(true);
    
    const preloadAll = async () => {
      if (priority === 'high') {
        // Carregar em paralelo para alta prioridade
        await Promise.allSettled(urls.map(preloadAsset));
      } else {
        // Carregar sequencialmente para baixa prioridade
        for (const url of urls) {
          await preloadAsset(url);
          // Pequeno delay para não bloquear a thread
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      setIsLoading(false);
    };

    preloadAll();
  }, [urls, priority, preloadAsset]);

  return {
    loadedAssets,
    failedAssets,
    isLoading,
    progress: urls.length > 0 ? (loadedAssets.size + failedAssets.size) / urls.length : 0
  };
}

// ============================================
// NOTA: Componente React foi movido para:
// src/components/ui/optimized-image.tsx
// ============================================

// ============================================
// FUNÇÕES UTILITÁRIAS
// ============================================

// Otimizar múltiplas imagens em lote
export async function optimizeImageBatch(
  images: { src: string; options?: ImageOptimizationOptions }[],
  concurrency: number = 3
): Promise<{ src: string; optimizedUrl: string; metrics: PerformanceMetrics }[]> {
  const optimizer = new ImageOptimizer();
  const results: any[] = [];
  
  // Processar em lotes para controlar concorrência
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    const batchPromises = batch.map(async ({ src, options }) => {
      const result = await optimizer.optimizeImage(src, options);
      return {
        src,
        optimizedUrl: result.url,
        metrics: result.metrics
      };
    });
    
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults.filter(r => r.status === 'fulfilled').map(r => (r as any).value));
  }
  
  return results;
}

// Detectar tipo de conexão para ajustar qualidade
export function getOptimalQuality(): number {
  if (typeof navigator === 'undefined') return 0.8;
  
  const connection = (navigator as any).connection;
  if (!connection) return 0.8;
  
  switch (connection.effectiveType) {
    case 'slow-2g':
    case '2g':
      return 0.5;
    case '3g':
      return 0.7;
    case '4g':
    default:
      return 0.8;
  }
}

// Calcular tamanho ideal baseado no viewport
export function getOptimalDimensions(maxWidth?: number, maxHeight?: number) {
  if (typeof window === 'undefined') {
    return { width: maxWidth || 800, height: maxHeight || 600 };
  }
  
  const dpr = window.devicePixelRatio || 1;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const width = Math.min(maxWidth || viewportWidth, viewportWidth) * dpr;
  const height = Math.min(maxHeight || viewportHeight, viewportHeight) * dpr;
  
  return { width: Math.round(width), height: Math.round(height) };
}

// ============================================
// EXPORTAÇÕES
// ============================================

export type {
  ImageOptimizationOptions,
  LazyLoadOptions,
  PerformanceMetrics
};

export {
  ImageOptimizer,
  AssetCache
};
export default ImageOptimizer;