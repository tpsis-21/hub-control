/**
 * Componente de Imagem Otimizada
 * Implementa lazy loading, otimização automática de formato e Core Web Vitals
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLazyImage } from '@/lib/asset-optimization';
import { Skeleton } from './skeleton';

// ============================================
// INTERFACES
// ============================================

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  quality?: number;
  format?: 'webp' | 'avif' | 'auto';
  placeholder?: 'blur' | 'empty' | string;
  fallback?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: (error: Error) => void;
  // Props específicas para lazy loading
  rootMargin?: string;
  threshold?: number;
  // Props de estilo
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  aspectRatio?: string;
  rounded?: boolean;
  shadow?: boolean;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  quality = 85,
  format = 'auto',
  placeholder = 'blur',
  fallback,
  sizes,
  loading = 'lazy',
  onLoad,
  onError,
  rootMargin = '50px',
  threshold = 0.1,
  objectFit = 'cover',
  aspectRatio,
  rounded = false,
  shadow = false,
  ...props
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  
  // Usar lazy loading apenas se não for prioridade e loading for lazy
  const shouldUseLazy = !priority && loading === 'lazy';
  
  const {
    ref: lazyRef,
    src: optimizedSrc,
    isLoaded,
    isInView,
    error: lazyError,
    onLoad: handleLazyLoad,
    onError: handleLazyError
  } = useLazyImage(
    src,
    shouldUseLazy ? {
      quality,
      format,
      width,
      height,
      priority,
      rootMargin,
      threshold,
      once: true,
      fallback
    } : {}
  );

  // Para imagens com prioridade, usar src diretamente
  const finalSrc = shouldUseLazy ? optimizedSrc : src;
  const shouldShow = shouldUseLazy ? isInView && finalSrc : true;

  // Handlers de eventos
  const handleLoad = () => {
    if (shouldUseLazy) {
      handleLazyLoad();
    }
    onLoad?.();
  };

  const handleError = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const error = new Error('Falha ao carregar imagem');
    
    if (shouldUseLazy) {
      handleLazyError(error);
    }
    
    setImageError(true);
    
    // Tentar fallback se disponível
    if (fallback && !showFallback) {
      setShowFallback(true);
      setImageError(false);
    }
    
    onError?.(error);
  };

  // Calcular classes CSS
  const imageClasses = cn(
    'transition-opacity duration-300',
    {
      'opacity-0': shouldUseLazy && !isLoaded,
      'opacity-100': !shouldUseLazy || isLoaded,
      'rounded-md': rounded,
      'shadow-lg': shadow,
    },
    className
  );

  // Estilos inline
  const imageStyles: React.CSSProperties = {
    objectFit,
    aspectRatio,
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
  };

  // Renderizar placeholder enquanto carrega
  if (shouldUseLazy && !isInView) {
    return (
      <div
        ref={lazyRef}
        className={cn('relative overflow-hidden', className)}
        style={{
          width: width ? `${width}px` : '100%',
          height: height ? `${height}px` : 'auto',
          aspectRatio,
        }}
      >
        {placeholder === 'blur' && (
          <Skeleton className="w-full h-full" />
        )}
        {placeholder !== 'blur' && placeholder !== 'empty' && (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400 text-sm">{placeholder}</span>
          </div>
        )}
      </div>
    );
  }

  // Renderizar imagem de fallback se houver erro
  if (imageError && showFallback && fallback) {
    return (
      <img
        src={fallback}
        alt={alt}
        className={imageClasses}
        style={imageStyles}
        onLoad={handleLoad}
        loading={loading}
        sizes={sizes}
        {...props}
      />
    );
  }

  // Renderizar placeholder de erro se não houver fallback
  if (imageError && !fallback) {
    return (
      <div
        className={cn(
          'bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center',
          className
        )}
        style={imageStyles}
      >
        <div className="text-center text-gray-500">
          <svg
            className="mx-auto h-8 w-8 mb-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs">Erro ao carregar</p>
        </div>
      </div>
    );
  }

  // Renderizar imagem principal
  return (
    <img
      ref={shouldUseLazy ? lazyRef : undefined}
      src={finalSrc || src}
      alt={alt}
      className={imageClasses}
      style={imageStyles}
      onLoad={handleLoad}
      onError={handleError}
      loading={loading}
      sizes={sizes}
      {...props}
    />
  );
}

// ============================================
// COMPONENTE DE IMAGEM RESPONSIVA
// ============================================

export interface ResponsiveImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  breakpoints?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  defaultWidth?: number;
}

export function ResponsiveImage({
  breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  defaultWidth = 800,
  sizes,
  ...props
}: ResponsiveImageProps) {
  // Gerar sizes automaticamente se não fornecido
  const autoSizes = sizes || Object.entries(breakpoints)
    .sort(([, a], [, b]) => a - b)
    .map(([key, width]) => `(max-width: ${width}px) ${width}px`)
    .join(', ') + `, ${defaultWidth}px`;

  return (
    <OptimizedImage
      {...props}
      sizes={autoSizes}
      width={defaultWidth}
    />
  );
}

// ============================================
// COMPONENTE DE AVATAR OTIMIZADO
// ============================================

export interface OptimizedAvatarProps extends Omit<OptimizedImageProps, 'aspectRatio' | 'objectFit'> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  initials?: string;
  showInitials?: boolean;
}

export function OptimizedAvatar({
  size = 'md',
  initials,
  showInitials = true,
  className,
  ...props
}: OptimizedAvatarProps) {
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  };

  const avatarSize = typeof size === 'number' ? size : sizeMap[size];
  
  const avatarClasses = cn(
    'rounded-full border-2 border-gray-200',
    className
  );

  // Fallback com iniciais
  const initialsElement = initials && showInitials ? (
    <div
      className={cn(
        'rounded-full bg-gray-500 text-white flex items-center justify-center font-medium',
        className
      )}
      style={{
        width: avatarSize,
        height: avatarSize,
        fontSize: avatarSize * 0.4,
      }}
    >
      {initials.slice(0, 2).toUpperCase()}
    </div>
  ) : null;

  return (
    <OptimizedImage
      {...props}
      width={avatarSize}
      height={avatarSize}
      className={avatarClasses}
      aspectRatio="1"
      objectFit="cover"
      rounded
      fallback={initialsElement ? undefined : '/default-avatar.png'}
    />
  );
}

// ============================================
// EXPORTAÇÕES
// ============================================

export default OptimizedImage;
