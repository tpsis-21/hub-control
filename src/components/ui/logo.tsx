'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

interface LogoProps {
  variant?: 'full' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fallbackToSvg?: boolean
}

export function Logo({ variant = 'full', size = 'md', className, fallbackToSvg = false }: LogoProps) {
  const { theme } = useTheme()
  
  const sizes = {
    sm: { width: 120, height: 30 },
    md: { width: 160, height: 40 },
    lg: { width: 200, height: 50 }
  }
  
  const iconSizes = {
    sm: { width: 24, height: 24 },
    md: { width: 32, height: 32 },
    lg: { width: 40, height: 40 }
  }
  
  const currentSize = variant === 'icon' ? iconSizes[size] : sizes[size]
  const isDark = theme === 'dark'
  
  // Se fallbackToSvg for true, usa o SVG como fallback
  if (fallbackToSvg) {
    return (
      <svg
        width={currentSize.width}
        height={currentSize.height}
        viewBox={variant === 'icon' ? '0 0 40 40' : '0 0 160 40'}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('transition-opacity duration-200', className)}
      >
        {variant === 'icon' ? (
          // Apenas o ícone
          <>
            <circle cx="20" cy="20" r="18" fill="#2196F3" />
            <circle cx="14" cy="14" r="2" fill="white" />
            <circle cx="26" cy="14" r="2" fill="white" />
            <circle cx="14" cy="26" r="2" fill="white" />
            <circle cx="26" cy="26" r="2" fill="white" />
            <circle cx="20" cy="20" r="2.5" fill="white" />
            <line x1="16" y1="16" x2="18" y2="18" stroke="white" strokeWidth="1.5" />
            <line x1="24" y1="16" x2="22" y2="18" stroke="white" strokeWidth="1.5" />
            <line x1="16" y1="24" x2="18" y2="22" stroke="white" strokeWidth="1.5" />
            <line x1="24" y1="24" x2="22" y2="22" stroke="white" strokeWidth="1.5" />
          </>
        ) : (
          // Logo completa
          <>
            <circle cx="20" cy="20" r="18" fill="#2196F3" />
            <circle cx="14" cy="14" r="2" fill="white" />
            <circle cx="26" cy="14" r="2" fill="white" />
            <circle cx="14" cy="26" r="2" fill="white" />
            <circle cx="26" cy="26" r="2" fill="white" />
            <circle cx="20" cy="20" r="2.5" fill="white" />
            <line x1="16" y1="16" x2="18" y2="18" stroke="white" strokeWidth="1.5" />
            <line x1="24" y1="16" x2="22" y2="18" stroke="white" strokeWidth="1.5" />
            <line x1="16" y1="24" x2="18" y2="22" stroke="white" strokeWidth="1.5" />
            <line x1="24" y1="24" x2="22" y2="22" stroke="white" strokeWidth="1.5" />
            <text x="48" y="16" fill={isDark ? 'white' : '#3A4A5C'} fontSize="14" fontWeight="bold" fontFamily="system-ui, sans-serif">
              Hub
            </text>
            <text x="48" y="30" fill={isDark ? 'white' : '#3A4A5C'} fontSize="12" fontFamily="system-ui, sans-serif">
              Control
            </text>

          </>
        )}
      </svg>
    )
  }
  
  // Versão PNG (quando disponível)
  const logoSrc = variant === 'icon' 
    ? (isDark ? '/assets/images/logo/hub-control-icon-dark.png' : '/assets/images/logo/hub-control-icon.png')
    : (isDark ? '/assets/images/logo/hub-control-logo-dark.png' : '/assets/images/logo/hub-control-logo.png')
  
  return (
    <Image
      src={logoSrc}
      alt="Hub Control"
      width={currentSize.width}
      height={currentSize.height}
      className={cn(
        'object-contain transition-opacity duration-200',
        className
      )}
      priority
      quality={95}
      onError={() => {
        // Fallback para SVG se PNG não carregar
        console.warn('Logo PNG não encontrada, usando SVG como fallback')
      }}
    />
  )
}

export default Logo;