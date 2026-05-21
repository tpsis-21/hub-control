'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Logo oficial (anexos/logo-hub-control.jpeg) */
const LOGO_SRC = '/assets/images/logo/hub-control-logo.jpg'

interface LogoProps {
  variant?: 'full' | 'icon'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const fullSizes = {
  sm: { width: 140, height: 44 },
  md: { width: 180, height: 56 },
  lg: { width: 240, height: 72 },
} as const

const iconSizes = {
  sm: { width: 40, height: 40 },
  md: { width: 48, height: 48 },
  lg: { width: 56, height: 56 },
} as const

export function Logo({ variant = 'full', size = 'md', className }: LogoProps) {
  const currentSize = variant === 'icon' ? iconSizes[size] : fullSizes[size]

  return (
    <Image
      src={LOGO_SRC}
      alt="Hub Control"
      width={currentSize.width}
      height={currentSize.height}
      className={cn(
        'transition-opacity duration-200',
        variant === 'icon'
          ? 'object-cover object-left rounded-md'
          : 'object-contain',
        className
      )}
      priority
      quality={90}
      sizes={
        variant === 'icon'
          ? '(max-width: 48px) 48px, 56px'
          : '(max-width: 180px) 180px, 240px'
      }
    />
  )
}

export default Logo
