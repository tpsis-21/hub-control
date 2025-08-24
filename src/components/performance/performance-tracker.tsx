'use client';

import React from 'react';
import { usePerformanceTracking } from '@/lib/performance-monitoring';

// ============================================
// COMPONENTE REACT PARA TRACKING DE PERFORMANCE
// ============================================

// HOC para rastrear performance de componentes
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    usePerformanceTracking(componentName);
    return <Component {...props} />;
  };
}

export default withPerformanceTracking;