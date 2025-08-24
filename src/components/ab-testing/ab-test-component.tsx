'use client';

import React, { useEffect } from 'react';
import { useABTest } from '@/lib/ab-testing';

// ============================================
// COMPONENTE REACT PARA A/B TESTING
// ============================================

interface ABTestComponentProps {
  testId: string;
  userId: string;
  variants: Record<string, React.ReactNode>;
  fallback?: React.ReactNode;
  onConversion?: (metricId: string, value?: number) => void;
}

export function ABTestComponent({ 
  testId, 
  userId, 
  variants, 
  fallback, 
  onConversion 
}: ABTestComponentProps) {
  const { variant, isLoading, recordConversion } = useABTest(testId, userId);
  
  // Registra conversão quando especificado
  useEffect(() => {
    if (variant && onConversion) {
      onConversion('default', 1);
    }
  }, [variant, recordConversion, onConversion]);
  
  if (isLoading) {
    return fallback || <div>Carregando...</div>;
  }
  
  if (!variant || !variants[variant]) {
    return fallback || variants[Object.keys(variants)[0]] || null;
  }
  
  return <>{variants[variant]}</>;
}

export default ABTestComponent;