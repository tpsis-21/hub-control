// 📊 Sistema de Monitoramento de Performance
// ARQUIVO REFATORADO - Agora usa módulos separados para melhor organização
// Este arquivo mantém compatibilidade com código existente

// Importar sistema refatorado
import {
  PerformanceMonitoringSystem as NewPerformanceMonitoringSystem,
  performanceMonitoringSystem,
  PerformanceUtils
} from './performance';

// Re-exportar tipos para compatibilidade
export * from './performance/types';
export * from './performance/config';

// Manter classe original para compatibilidade
export class PerformanceMonitoringSystem extends NewPerformanceMonitoringSystem {
  constructor(config?: any) {
    super(config);
  }
}

// Instância global para compatibilidade
export const performanceMonitor = performanceMonitoringSystem;

// Exportar utilitários para compatibilidade
export const PerformanceMonitor = {
  ...PerformanceUtils,
  
  // Métodos legados para compatibilidade
  getInstance: () => performanceMonitoringSystem,
  
  // Wrapper para métodos antigos
  recordMetric: PerformanceUtils.recordResponseTime,
  startMonitoring: PerformanceUtils.startMonitoring,
  stopMonitoring: PerformanceUtils.stopMonitoring,
  getStatus: PerformanceUtils.getSystemStatus
};

// Exportações padrão para compatibilidade
export default performanceMonitoringSystem;

/**
 * NOTA DE REFATORAÇÃO:
 * 
 * Este arquivo foi refatorado para melhorar a organização e manutenibilidade.
 * O código original de 1869 linhas foi dividido em módulos menores:
 * 
 * - src/lib/performance/types.ts - Definições de tipos e interfaces
 * - src/lib/performance/config.ts - Configurações padrão do sistema
 * - src/lib/performance/metrics-collector.ts - Coleta de métricas
 * - src/lib/performance/alert-system.ts - Sistema de alertas
 * - src/lib/performance/index.ts - Módulo principal integrado
 * 
 * Benefícios da refatoração:
 * ✅ Melhor organização do código
 * ✅ Facilita manutenção e testes
 * ✅ Reduz complexidade de cada arquivo
 * ✅ Melhora reutilização de componentes
 * ✅ Mantém compatibilidade com código existente
 * 
 * Para usar o novo sistema:
 * import { performanceMonitoringSystem, PerformanceUtils } from './performance';
 * 
 * Para manter compatibilidade:
 * import { performanceMonitor, PerformanceMonitor } from './performance-monitoring-system';
 */
