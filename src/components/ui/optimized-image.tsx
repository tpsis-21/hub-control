'use client';

import React from 'react';
import { useLazyImage } from '@/lib/asset-optimization';
import type { ImageOptimizationOptions, LazyLoadOptions } from '@/lib/asset-optimization';

// ============================================
// COMPONENTE REACT PARA IMAGEM OTIMIZADA
// ============================================

export function OptimizedImage({
  src,
  alt,
  className,
  placeholder,
  fallback,
  ...optimizationOptions
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
} & ImageOptimizationOptions & LazyLoadOptions) {
  const {
    ref,
    src: optimizedSrc,
    isLoaded,
    isInView,
    error,
    onLoad,
    onError
  } = useLazyImage(src, { placeholder, fallback, ...optimizationOptions });

  return (
    <div className={`relative ${className || ''}`}>
      {/* Placeholder enquanto não está em view */}
      {!isInView && placeholder && (
        <img
          src={placeholder}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover blur-sm"
        />
      )}
      
      {/* Imagem principal */}
      <img
        ref={ref}
        src={optimizedSrc || placeholder || ''}
        alt={alt}
        className={`transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={onLoad}
        onError={onError}
        loading="lazy"
      />

      {/* Fallback para erro */}
      {error && !fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <span className="text-gray-500 text-sm">Erro ao carregar imagem</span>
        </div>
      )}
    </div>
  );
}

export default OptimizedImage;